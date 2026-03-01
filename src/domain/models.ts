export type ViewMode = 'edit' | 'preview' | 'split' | 'live';

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  contentMd: string;
  position: number;
  imageIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ImageAsset {
  id: string;
  mimeType: string;
  blob: Blob;
  byteSize: number;
  createdAt: string;
}

export interface WorkspaceMeta {
  rootOrder: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface WorkspaceMetaRecord extends WorkspaceMeta {
  id: string;
}

export interface WorkspaceExportImageV1 {
  id: string;
  mimeType: string;
  base64: string;
  createdAt: string;
}

export interface WorkspaceExportV1 {
  schemaVersion: 1;
  exportedAt: string;
  pages: Page[];
  images: WorkspaceExportImageV1[];
  meta: WorkspaceMeta;
}

export interface PageTreeNode {
  page: Page;
  children: PageTreeNode[];
  depth: number;
}

export interface MoveOperation {
  targetParentId: string | null;
  targetPosition: number;
}
