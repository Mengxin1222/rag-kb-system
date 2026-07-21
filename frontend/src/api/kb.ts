import client from './client';

export interface KBListItem {
  id: number;
  name: string;
  description: string | null;
  admin_id: number;
  created_at: string;
  updated_at: string;
}

export interface KBDetail extends KBListItem {
  chunk_method: string;
  chunk_heading_levels: string;
  chunk_max_chars: number;
  chunk_overlap: number;
  chunk_separators: string;
  retrieval_top_k: number;
  bm25_top_k: number;
  rerank_top_n: number;
  rrf_k: number;
  conversation_max_rounds: number;
  context_compression: boolean;
  system_prompt: string | null;
  llm_model: string | null;
  llm_temperature: number | null;
  embedding_model: string | null;
  rerank_model: string | null;
}

export interface SearchResult {
  kb_id: number;
  kb_name: string;
  score: number;
  content: string;
  page_start: number | null;
  page_end: number | null;
  content_tags: string | null;
  document: string | null;
  document_id: number | null;
}

export interface SearchResponse {
  kb_ids: number[];
  query: string;
  method: string;
  total: number;
  results: SearchResult[];
}

export async function listKBs() {
  const res = await client.get('/api/kb');
  return res.data as KBListItem[];
}

export async function getKB(kbId: number) {
  const res = await client.get(`/api/kb/${kbId}`);
  return res.data as KBDetail;
}

export async function createKB(data: Partial<KBDetail> & { name: string }) {
  const res = await client.post('/api/kb', data);
  return res.data as KBDetail;
}

export async function updateKB(kbId: number, data: Partial<KBDetail>) {
  const res = await client.put(`/api/kb/${kbId}`, data);
  return res.data as KBDetail;
}

export async function deleteKB(kbId: number) {
  await client.delete(`/api/kb/${kbId}`);
}

export async function searchChunks(params: {
  kb_ids: string;
  q: string;
  method?: string;
  top_n?: number;
}) {
  const res = await client.get('/api/kb/search', { params });
  return res.data as SearchResponse;
}
