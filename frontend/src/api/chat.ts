import client from './client';

export interface ConvListItem {
  id: number;
  kb_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageItem {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: Array<{ document: string; page: number | null; chunk_text: string }> | null;
  created_at: string;
}

export async function listConversations(kbId?: number) {
  const res = await client.get('/api/conversations', { params: kbId ? { kb_id: kbId } : {} });
  return res.data as ConvListItem[];
}

export async function createConversation(kbId: number) {
  const res = await client.post('/api/conversations', null, { params: { kb_id: kbId } });
  return res.data as ConvListItem;
}

export async function getMessages(convId: number) {
  const res = await client.get(`/api/conversations/${convId}/messages`);
  return res.data as MessageItem[];
}

export async function deleteConversation(convId: number) {
  await client.delete(`/api/conversations/${convId}`);
}

export function createChatSSE(convId: number, query: string): EventSource {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  // Use fetch + ReadableStream since EventSource doesn't support POST
  const controller = new AbortController();

  const streamPromise = (async () => {
    const resp = await fetch(`${baseURL}/api/chat/send?conversation_id=${convId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return { reader, decoder, buffer, controller };
  })();

  return {
    streamPromise,
    close: () => controller.abort(),
  } as unknown as EventSource;
}
