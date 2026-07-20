"""Ticket 2 自测：知识库 CRUD"""
import httpx
import sys

BASE = "http://127.0.0.1:8000"


def test():
    # Login
    r = httpx.post(f"{BASE}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create
    r = httpx.post(f"{BASE}/api/kb", json={"name": "测试知识库", "description": "第一个"}, headers=headers)
    assert r.status_code == 201, f"Create failed: {r.text}"
    data = r.json()
    kb_id = data["id"]
    assert data["name"] == "测试知识库"
    assert data["chunk_method"] == "heading"
    assert data["retrieval_top_k"] == 20
    print(f"创建成功: id={kb_id}, name={data['name']}")

    # List
    r = httpx.get(f"{BASE}/api/kb", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1
    print(f"列表成功: {len(r.json())} 个知识库")

    # Get detail
    r = httpx.get(f"{BASE}/api/kb/{kb_id}", headers=headers)
    assert r.status_code == 200
    print(f"详情成功: {r.json()['system_prompt'][:30]}...")

    # Update
    r = httpx.put(f"{BASE}/api/kb/{kb_id}", json={"retrieval_top_k": 15, "rerank_top_n": 3}, headers=headers)
    assert r.status_code == 200
    assert r.json()["retrieval_top_k"] == 15
    assert r.json()["rerank_top_n"] == 3
    print(f"更新成功: top_k={r.json()['retrieval_top_k']}, top_n={r.json()['rerank_top_n']}")

    # Delete
    r = httpx.delete(f"{BASE}/api/kb/{kb_id}", headers=headers)
    assert r.status_code == 204
    print("删除成功")

    # Verify deleted
    r = httpx.get(f"{BASE}/api/kb", headers=headers)
    assert len(r.json()) == 0
    print("验证删除: 列表为空")

    print("\nTicket 2 全部通过!")


if __name__ == "__main__":
    test()
