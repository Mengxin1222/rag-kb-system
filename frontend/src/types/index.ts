export interface UserInfo {
  username: string;
  role: 'admin' | 'user';
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description: string;
  docCount: number;
  chunkCount: number;
  created_at: string;
  chunk_method: string;
  chunk_heading_levels: string;
  chunk_max_chars: number;
  chunk_overlap: number;
  retrieval_top_k: number;
  bm25_top_k: number;
  rrf_k: number;
  rerank_top_n: number;
  conversation_max_rounds: number;
  context_compression: boolean;
  system_prompt: string;
  llm_model: string;
  llm_temperature: number;
  embedding_model: string;
  rerank_model: string;
}

export interface Document {
  id: number;
  filename: string;
  format: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  size: string;
  chunks: number;
  error: string | null;
}

export interface Conversation {
  id: number;
  title: string;
  msgs: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
  sources?: Source[];
}

export interface Source {
  doc: string;
  page: number;
  snippet: string;
}

export interface Chunk {
  id: number;
  number: number;
  summary: string;
  pageStart: number;
  pageEnd: number;
  tags: string[];
}

export interface SearchResult {
  id: number;
  doc: string;
  kb_name: string;
  kb_id: number;
  page: number;
  score: number;
  content_tags: string[];
  snippet: string;
}

export interface DashboardData {
  kb_count: number;
  doc_count: number;
  query_count: number;
  trend_7d: TrendItem[];
  kb_ranking: RankingItem[];
}

export interface TrendItem {
  date: string;
  count: number;
}

export interface RankingItem {
  name: string;
  queries: number;
}

export interface UserRecord {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
}
