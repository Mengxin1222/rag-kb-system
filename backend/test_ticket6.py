"""Ticket 6 test: Chat & Conversatins"""
import httpx, json

BASE = "http://127.0.0.1:8000"

r = httpx.post(f"{BASE}/api/auth/login", json={"username":"admin","password":"admin123"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# Create conversation
r = httpx.post(f"{BASE}/api/conversations?kb_id=1", headers=h)
assert r.status_code == 201, f"Create conv failed: {r.text}"
conv_id = r.json()["id"]
print(f"Conversation: {conv_id}")

# List conversations
r = httpx.get(f"{BASE}/api/conversations", headers=h)
assert r.status_code == 200
print(f"Conversations: {len(r.json())}")

# Get messages (empty)
r = httpx.get(f"{BASE}/api/conversations/{conv_id}/messages", headers=h)
assert r.status_code == 200
print(f"Messages: {len(r.json())}")

# Send message (SSE)
print("Sending chat...")
r = httpx.post(f"{BASE}/api/chat/send?conversation_id={conv_id}", json={"query": "Test question"}, headers=h, timeout=30)
print(f"Chat response: {r.status_code}")
# SSE response, check response type
print(f"Content-Type: {r.headers.get('content-type')}")

# Get messages after chat
r = httpx.get(f"{BASE}/api/conversations/{conv_id}/messages", headers=h)
print(f"Messages after chat: {len(r.json())}")

# Delete conversation
r = httpx.delete(f"{BASE}/api/conversations/{conv_id}", headers=h)
assert r.status_code == 204
print("Deleted OK")

print("\nTicket 6 passed!")
