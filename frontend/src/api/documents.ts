import client from './client';

export interface DocListItem {
  id: number;
  kb_id: number;
  filename: string;
  original_format: string;
  file_size: number | null;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  chunks_reviewed: boolean;
  chunk_count: number;
  error_message: string | null;
  override_strategy: boolean;
  created_at: string;
  updated_at: string;
}

export async function listDocuments(kbId: number) {
  const res = await client.get('/api/documents', { params: { kb_id: kbId } });
  return res.data as DocListItem[];
}

export async function deleteDocument(docId: number) {
  await client.delete(`/api/documents/${docId}`);
}

export async function getDocPreview(docId: number, page?: number) {
  const res = await client.get(`/api/documents/${docId}/preview`, { params: page ? { page } : {} });
  return res.data;
}

export async function getDocChunks(docId: number) {
  const res = await client.get(`/api/documents/${docId}/chunks`);
  return res.data;
}

export async function updateDocChunks(docId: number, chunks: Array<{ id: number; char_start: number; char_end: number }>) {
  const res = await client.put(`/api/documents/${docId}/chunks`, { chunks });
  return res.data;
}

export async function confirmChunks(docId: number) {
  const res = await client.post(`/api/documents/${docId}/chunks/confirm`);
  return res.data;
}

export async function finalizeDoc(docId: number) {
  const res = await client.post(`/api/documents/${docId}/finalize`);
  return res.data;
}
