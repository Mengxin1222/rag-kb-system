"""Ticket 3 测试：文档上传 & 自动切片管道"""
import httpx, time, os

BASE = "http://127.0.0.1:8000"

# Create test markdown file
os.makedirs("data/test", exist_ok=True)
with open("data/test/sample.md", "w", encoding="utf-8") as f:
    f.write("# 第一章\n\n这是第一章的内容，用于测试切片功能。\n\n## 1.1 第一节\n\n这是第一节的详细内容。包含足够多的字符来验证切片逻辑是否正常工作。\n\n## 1.2 第二节\n\n第二节的内容也在这里。我们继续添加文字以确保字符数足够进行分段测试。\n\n# 第二章\n\n第二章介绍了新的主题。这里有更多的内容需要被分割成不同的chunk。\n\n## 2.1 背景\n\n背景部分包含了一些重要的上下文信息。这部分内容需要和前面的内容区分开来，确保切片的准确性。\n")

# Login
r = httpx.post(f"{BASE}/api/auth/login", json={"username": "admin", "password": "admin123"})
assert r.status_code == 200
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create KB
r = httpx.post(f"{BASE}/api/kb", json={"name": "文档测试", "chunk_max_chars": 80}, headers=headers)
assert r.status_code == 201, f"KB create failed: {r.text}"
kb_id = r.json()["id"]
print(f"KB created: id={kb_id}")

# Upload markdown file
with open("data/test/sample.md", "rb") as f:
    files = {"file": ("sample.md", f, "text/markdown")}
    data = {"kb_id": str(kb_id)}
    r = httpx.post(f"{BASE}/api/documents/upload", files=files, data=data, headers=headers)
    assert r.status_code == 201, f"Upload failed: {r.text}"
    doc = r.json()
    doc_id = doc["id"]
    print(f"Document uploaded: id={doc_id}, status={doc['status']}")

# Poll for processing completion
for i in range(30):
    time.sleep(1)
    r = httpx.get(f"{BASE}/api/documents/{doc_id}/status", headers=headers)
    status = r.json()["status"]
    print(f"  Status: {status} (attempt {i+1})")
    if status in ("ready", "failed"):
        break

doc = r.json()
assert doc["status"] == "ready", f"Document processing failed: {doc.get('error_message')}"
assert doc["chunk_count"] > 0, "No chunks created"
print(f"Chunk count: {doc['chunk_count']}")

# List documents
r = httpx.get(f"{BASE}/api/documents?kb_id={kb_id}", headers=headers)
assert r.status_code == 200
assert len(r.json()) >= 1
print(f"Documents in KB: {len(r.json())}")

print("\nTicket 3 全部通过!")
