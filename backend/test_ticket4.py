"""Ticket 4 test: Chunk Editor API"""
import httpx

BASE = "http://127.0.0.1:8000"

# Login
r = httpx.post(f"{BASE}/api/auth/login", json={"username":"admin","password":"admin123"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# Create KB & upload doc
r = httpx.post(f"{BASE}/api/kb", json={"name":"chunk_test","chunk_max_chars":80}, headers=h)
kb_id = r.json()["id"]
print(f"KB: {kb_id}")

import os, time
os.makedirs("data/test", exist_ok=True)
with open("data/test/t4.md","w",encoding="utf-8") as f:
    f.write("# Ch01\n\nContent of chapter one.\n\n## 1.1\n\nMore detailed content about section 1.1 with extra text to fill space.\n\n## 1.2\n\nSection 1.2 text here too.\n\n# Ch02\n\nSecond chapter starts now.\n")

with open("data/test/t4.md","rb") as f:
    r = httpx.post(f"{BASE}/api/documents/upload", files={"file":("t4.md",f,"text/markdown")}, data={"kb_id":str(kb_id)}, headers=h)
doc_id = r.json()["id"]
print(f"Doc: {doc_id}")

# Wait for processing
for _ in range(10):
    time.sleep(0.5)
    r = httpx.get(f"{BASE}/api/documents/{doc_id}/status", headers=h)
    if r.json()["status"] == "ready": break

# Get chunks
r = httpx.get(f"{BASE}/api/documents/{doc_id}/chunks", headers=h)
assert r.status_code == 200, f"GET chunks failed: {r.text}"
data = r.json()
assert len(data["chunks"]) > 0, "No chunks"
print(f"Chunks: {len(data['chunks'])}")

# Adjust first chunk boundary
old_start = data["chunks"][0]["char_start"]
new_start = old_start + 5
r = httpx.put(f"{BASE}/api/documents/{doc_id}/chunks", json={"chunks":[{"id":data["chunks"][0]["id"],"char_start":new_start,"char_end":data["chunks"][0]["char_end"]}]}, headers=h)
assert r.status_code == 200, f"PUT chunks failed: {r.text}"
print(f"Adjusted chunk {data['chunks'][0]['id']}: start {old_start} -> {new_start}")

# Verify adjustment
r = httpx.get(f"{BASE}/api/documents/{doc_id}/chunks", headers=h)
assert r.json()["chunks"][0]["char_start"] == new_start
print("Boundary updated OK")

# Confirm
r = httpx.post(f"{BASE}/api/documents/{doc_id}/chunks/confirm", headers=h)
assert r.status_code == 200
print("Confirmed OK")

print("\nTicket 4 passed!")
