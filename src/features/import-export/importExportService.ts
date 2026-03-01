import { WORKSPACE_META_ID } from '../../domain/constants';
import { extractLocalImageIds } from '../../domain/markdown';
import type { Page, WorkspaceExportV1 } from '../../domain/models';
import { imageRepository } from '../../lib/db/repositories/imageRepository';
import { workspaceRepository } from '../../lib/db/repositories/workspaceRepository';
import { db } from '../../lib/db/schema';

const EXPORT_SCHEMA_VERSION = 1;

function timestampForFileName(): string {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '');
}

function downloadFile(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
    reader.readAsDataURL(blob);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await readBlobAsDataUrl(blob);
  const [, base64 = ''] = dataUrl.split(',', 2);
  return base64;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function assertWorkspaceExport(payload: unknown): asserts payload is WorkspaceExportV1 {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid workspace file.');
  }

  const candidate = payload as Partial<WorkspaceExportV1>;
  if (candidate.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${String(candidate.schemaVersion)}`);
  }

  if (!Array.isArray(candidate.pages) || !Array.isArray(candidate.images) || !candidate.meta) {
    throw new Error('Workspace file is missing required fields.');
  }
}

function sanitizeImportedPages(pages: Page[]): Page[] {
  return pages.map((page, index) => ({
    ...page,
    title: page.title.trim() || `Imported page ${index + 1}`,
    imageIds: page.imageIds?.length ? page.imageIds : extractLocalImageIds(page.contentMd),
  }));
}

export async function exportWorkspaceAsJsonFile(): Promise<void> {
  const pages = await db.pages.toArray();
  await workspaceRepository.syncRootOrderFromPages(pages);

  const images = await db.images.toArray();
  const meta = (await workspaceRepository.getMeta()) ?? (await workspaceRepository.ensureMeta());

  const exportPayload: WorkspaceExportV1 = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    pages,
    images: await Promise.all(
      images.map(async (image) => ({
        id: image.id,
        mimeType: image.mimeType,
        base64: await blobToBase64(image.blob),
        createdAt: image.createdAt,
      })),
    ),
    meta: {
      rootOrder: meta.rootOrder,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      schemaVersion: EXPORT_SCHEMA_VERSION,
    },
  };

  const outputBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json',
  });

  downloadFile(outputBlob, `notes-workspace-${timestampForFileName()}.json`);
}

export async function importWorkspaceFromJsonFile(file: File): Promise<void> {
  const fileText = await file.text();
  const parsedPayload = JSON.parse(fileText) as unknown;
  assertWorkspaceExport(parsedPayload);

  const importedPages = sanitizeImportedPages(parsedPayload.pages);
  const importedImages = await Promise.all(
    parsedPayload.images.map(async (image) => {
      const blob = base64ToBlob(image.base64, image.mimeType);
      return {
        id: image.id,
        mimeType: image.mimeType,
        blob,
        byteSize: blob.size,
        createdAt: image.createdAt,
      };
    }),
  );

  await db.transaction('rw', db.pages, db.images, db.meta, async () => {
    await db.pages.clear();
    await db.images.clear();
    await db.meta.clear();

    if (importedPages.length) {
      await db.pages.bulkAdd(importedPages);
    }

    if (importedImages.length) {
      await db.images.bulkAdd(importedImages);
    }

    await db.meta.put({
      id: WORKSPACE_META_ID,
      rootOrder: parsedPayload.meta.rootOrder,
      createdAt: parsedPayload.meta.createdAt,
      updatedAt: new Date().toISOString(),
      schemaVersion: EXPORT_SCHEMA_VERSION,
    });
  });

  imageRepository.clearCaches();
}
