import { nanoid } from 'nanoid';

import type { ImageAsset } from '../../../domain/models';
import { db } from '../schema';

const objectUrlCache = new Map<string, string>();
const dataUrlCache = new Map<string, string>();

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
    reader.readAsDataURL(blob);
  });
}

const nowIso = () => new Date().toISOString();

function revokeCachedObjectUrl(imageId: string): void {
  const objectUrl = objectUrlCache.get(imageId);
  if (!objectUrl) {
    return;
  }

  URL.revokeObjectURL(objectUrl);
  objectUrlCache.delete(imageId);
}

export const imageRepository = {
  async listAllImages(): Promise<ImageAsset[]> {
    return db.images.toArray();
  },

  async getImageById(id: string): Promise<ImageAsset | undefined> {
    return db.images.get(id);
  },

  async saveImageBlob(blob: Blob): Promise<ImageAsset> {
    const image: ImageAsset = {
      id: nanoid(),
      mimeType: blob.type || 'application/octet-stream',
      blob,
      byteSize: blob.size,
      createdAt: nowIso(),
    };

    await db.images.put(image);
    return image;
  },

  async getObjectUrl(imageId: string): Promise<string | null> {
    const cached = objectUrlCache.get(imageId);
    if (cached) {
      return cached;
    }

    const image = await db.images.get(imageId);
    if (!image) {
      return null;
    }

    const objectUrl = URL.createObjectURL(image.blob);
    objectUrlCache.set(imageId, objectUrl);
    return objectUrl;
  },

  async getDataUrl(imageId: string): Promise<string | null> {
    const cached = dataUrlCache.get(imageId);
    if (cached) {
      return cached;
    }

    const image = await db.images.get(imageId);
    if (!image) {
      return null;
    }

    const dataUrl = await readBlobAsDataUrl(image.blob);
    dataUrlCache.set(imageId, dataUrl);
    return dataUrl;
  },

  async deleteMany(imageIds: string[]): Promise<void> {
    if (!imageIds.length) {
      return;
    }

    imageIds.forEach((imageId) => {
      revokeCachedObjectUrl(imageId);
      dataUrlCache.delete(imageId);
    });

    await db.images.bulkDelete(imageIds);
  },

  syncObjectUrlCache(validImageIds: Set<string>): void {
    for (const imageId of objectUrlCache.keys()) {
      if (!validImageIds.has(imageId)) {
        revokeCachedObjectUrl(imageId);
      }
    }
  },

  clearCaches(): void {
    for (const imageId of objectUrlCache.keys()) {
      revokeCachedObjectUrl(imageId);
    }

    dataUrlCache.clear();
  },
};
