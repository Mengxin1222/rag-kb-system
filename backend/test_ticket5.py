"""Ticket 5: Embedding & BM25"""
import httpx, os, time

BASE = "http://127.0.0.1:8000"

r = httpx.post(f"{BASE}/api/auth/login", json={"username":"admin","password":"admin123"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# Create KB
r = httpx.post(f"{BASE}/api/kb", json={"name":"emb_test","chunk_max_chars":80}, headers=h)
kb_id = r.json()["id"]
print(f"KB: {kb_id}")

# Upload doc
os.makedirs("data/test", exist_ok=True)
with open("data/test/t5.md","w",encoding="utf-8") as f:
    f.write("# Title\n\nTest content for embedding with enough characters to create multiple chunks for the BM25 index test.\n\n## Section 2\n\nMore text goes here.\n")

with open("data/test/t5.md","rb") as f:
    r = httpx.post(f"{BASE}/api/documents/upload", files={"file":("t5.md",f,"text/markdown")}, data={"kb_id":str(kb_id)}, headers=h)
doc_id = r.json()["id"]
print(f"Doc: {doc_id}")

# Wait for processing
for _ in range(10):
    time.sleep(0.5)
    r = httpx.get(f"{BASE}/api/documents/{doc_id}/status", headers=h)
    if r.json()["status"] == "ready": break
print(f"Doc status: {r.json()['status']}")

# Confirm chunks first
r = httpx.post(f"{BASE}/api/documents/{doc_id}/chunks/confirm", headers=h)
print(f"Confirm: {r.json()}")

# Finalize (embedding + BM25)
r = httpx.post(f"{BASE}/api/documents/{doc_id}/finalize", headers=h)
assert r.status_code == 200, f"Finalize failed: {r.text}"
print(f"Finalize: {r.json()}")

# Wait for embedding
for _ in range(15):
    time.sleep(0.5)
    r = httpx.get(f"{BASE}/api/documents/{doc_id}/status", headers=h)
    d = r.json()
    if d["status"] == "ready" and d["chunks_reviewed"]:
        break
print(f"After finalize: status={d['status']}, reviewed={d['chunks_reviewed']}")

assert d["chunks_reviewed"] == True, "chunks_reviewed should be True"
print("\nTicket 5 passed!")
