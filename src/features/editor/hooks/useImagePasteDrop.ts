import { type ClipboardEvent, type DragEvent, useCallback, useMemo } from 'react';

function getImageFilesFromList(fileList: FileList): File[] {
  return [...fileList].filter((file) => file.type.startsWith('image/'));
}

function getImageFilesFromClipboard(clipboardData: DataTransfer): File[] {
  const clipboardFiles: File[] = [];

  for (const item of clipboardData.items) {
    if (item.kind !== 'file') {
      continue;
    }

    const file = item.getAsFile();
    if (file && file.type.startsWith('image/')) {
      clipboardFiles.push(file);
    }
  }

  return clipboardFiles;
}

interface UseImagePasteDropOptions {
  onImageFiles: (files: File[]) => Promise<string[]>;
  onInsertMarkdown: (markdown: string) => void;
}

export function useImagePasteDrop(options: UseImagePasteDropOptions) {
  const { onImageFiles, onInsertMarkdown } = options;

  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        return;
      }

      const markdownEntries = await onImageFiles(files);
      if (!markdownEntries.length) {
        return;
      }

      onInsertMarkdown(`\n${markdownEntries.join('\n')}\n`);
    },
    [onImageFiles, onInsertMarkdown],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const imageFiles = getImageFilesFromClipboard(event.clipboardData);
      if (!imageFiles.length) {
        return;
      }

      event.preventDefault();
      void handleImageFiles(imageFiles);
    },
    [handleImageFiles],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const imageFiles = getImageFilesFromList(event.dataTransfer.files);
      if (!imageFiles.length) {
        return;
      }

      event.preventDefault();
      void handleImageFiles(imageFiles);
    },
    [handleImageFiles],
  );

  const handlers = useMemo(
    () => ({
      onPaste,
      onDrop,
      onDragOver: (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
      },
    }),
    [onDrop, onPaste],
  );

  return handlers;
}
