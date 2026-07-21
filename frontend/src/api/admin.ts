import client from './client';

export interface DashboardResponse {
  kb_count: number;
  doc_count: number;
  doc_failed: number;
  chunk_count: number;
  query_count: number;
  trend_7d: Array<{ date: string; count: number }>;
  kb_ranking: Array<{ kb_id: number; count: number }>;
  storage_bytes: number;
}

export interface UserItem {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export async function getDashboard() {
  const res = await client.get('/api/admin/dashboard');
  return res.data as DashboardResponse;
}

export async function listUsers() {
  const res = await client.get('/api/admin/users');
  return res.data as UserItem[];
}

export async function createUser(username: string, password: string, role: string) {
  const res = await client.post('/api/admin/users', { username, password, role });
  return res.data as UserItem;
}

export async function deleteUser(userId: number) {
  await client.delete(`/api/admin/users/${userId}`);
}
