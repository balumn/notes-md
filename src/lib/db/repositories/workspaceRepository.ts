import { WORKSPACE_META_ID } from '../../../domain/constants';
import type { Page, WorkspaceMeta, WorkspaceMetaRecord } from '../../../domain/models';
import { db } from '../schema';

const nowIso = () => new Date().toISOString();

function getRootOrderFromPages(pages: Page[]): string[] {
  return pages
    .filter((page) => page.parentId === null)
    .sort((a, b) => a.position - b.position)
    .map((page) => page.id);
}

function createDefaultMeta(): WorkspaceMetaRecord {
  const timestamp = nowIso();

  return {
    id: WORKSPACE_META_ID,
    rootOrder: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: 1,
  };
}

export interface EnsureMetaResult {
  meta: WorkspaceMetaRecord;
  createdNow: boolean;
}

export const workspaceRepository = {
  async getMeta(): Promise<WorkspaceMetaRecord | undefined> {
    return db.meta.get(WORKSPACE_META_ID);
  },

  async ensureMetaWithStatus(): Promise<EnsureMetaResult> {
    const existing = await db.meta.get(WORKSPACE_META_ID);

    if (existing) {
      return { meta: existing, createdNow: false };
    }

    const meta = createDefaultMeta();
    await db.meta.put(meta);
    return { meta, createdNow: true };
  },

  async ensureMeta(): Promise<WorkspaceMetaRecord> {
    const result = await workspaceRepository.ensureMetaWithStatus();
    return result.meta;
  },

  async syncRootOrderFromPages(pages: Page[]): Promise<void> {
    const current = (await db.meta.get(WORKSPACE_META_ID)) ?? createDefaultMeta();

    const next: WorkspaceMetaRecord = {
      ...current,
      rootOrder: getRootOrderFromPages(pages),
      updatedAt: nowIso(),
    };

    await db.meta.put(next);
  },

  async touch(): Promise<void> {
    const current = (await db.meta.get(WORKSPACE_META_ID)) ?? createDefaultMeta();
    await db.meta.put({ ...current, updatedAt: nowIso() });
  },

  async replaceMeta(meta: WorkspaceMeta): Promise<void> {
    await db.meta.put({
      ...meta,
      id: WORKSPACE_META_ID,
    });
  },
};
