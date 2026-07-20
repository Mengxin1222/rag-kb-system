"""Tickets 7-8-9: Admin API, User Mgmt, Preview, Dashboard"""
import httpx

BASE = "http://127.0.0.1:8000"

r = httpx.post(f"{BASE}/api/auth/login", json={"username":"admin","password":"admin123"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# Ticket 8: User Management
print("=== Ticket 8: User Management ===")

# Create user
r = httpx.post(f"{BASE}/api/admin/users", json={"username":"testuser","password":"pass123"}, headers=h)
assert r.status_code == 201, f"Create user failed: {r.text}"
uid = r.json()["id"]
print(f"Created user: id={uid}, username={r.json()['username']}")

# List users
r = httpx.get(f"{BASE}/api/admin/users", headers=h)
assert r.status_code == 200
print(f"Users: {len(r.json())}")

# Delete user
r = httpx.delete(f"{BASE}/api/admin/users/{uid}", headers=h)
assert r.status_code == 204
print("Deleted user OK")

# Ticket 8: Document Preview
print("\n=== Ticket 8: Document Preview ===")
r = httpx.get(f"{BASE}/api/documents/{1}/preview", headers=h)
assert r.status_code == 200
print(f"Preview: {len(r.json().get('content',''))} chars")

# Ticket 9: Dashboard
print("\n=== Ticket 9: Dashboard ===")
r = httpx.get(f"{BASE}/api/admin/dashboard", headers=h)
assert r.status_code == 200
d = r.json()
print(f"KBs: {d['kb_count']}, Docs: {d['doc_count']}, Chunks: {d['chunk_count']}, Queries: {d['query_count']}")
print(f"Trend 7d: {len(d['trend_7d'])} days")
print(f"Storage: {d['storage_bytes']} bytes")

print("\nTickets 7-8-9 passed!")
