import Dexie, { type Table } from 'dexie';

import type { ImageAsset, Page, WorkspaceMetaRecord } from '../../domain/models';

class NotesDatabase extends Dexie {
  pages!: Table<Page, string>;
  images!: Table<ImageAsset, string>;
  meta!: Table<WorkspaceMetaRecord, string>;

  constructor() {
    super('notes-md-db');

    this.version(1).stores({
      pages: '&id,parentId,position,[parentId+position],updatedAt',
      images: '&id,createdAt',
      meta: '&id',
    });
  }
}

export const db = new NotesDatabase();
