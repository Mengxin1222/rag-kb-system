import client from './client';

export async function loginAPI(username: string, password: string) {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  const res = await client.post('/api/auth/login', { username, password });
  return res.data as { access_token: string; token_type: string; role: string };
}

export async function refreshToken() {
  const res = await client.post('/refresh');
  return res.data as { access_token: string; token_type: string; role: string };
}
