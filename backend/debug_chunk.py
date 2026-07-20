"""Debug chunking step by step"""
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
import json

md_text = "# 第一章\n\n这是第一章的内容。\n\n## 1.1 第一节\n\n这是第一节的详细内容。包含足够多的字符来验证切片逻辑是否正常工作。\n\n## 1.2 第二节\n\n第二节的内容也在这里。\n\n# 第二章\n\n第二章介绍了新的主题。\n\n## 2.1 背景\n\n背景部分包含了一些重要的上下文信息。"

strategy = {
    'method': 'heading',
    'heading_levels': '2',
    'max_chars': 80,
    'overlap': 0,
    'separators': ['\n\n', '\n', '。', '!', '?', ';', '']
}

md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[("##", "h2")],
    strip_headers=False,
)

char_splitter = RecursiveCharacterTextSplitter(
    chunk_size=strategy["max_chars"],
    chunk_overlap=strategy["overlap"],
    separators=strategy["separators"],
    keep_separator=True,
)

header_splits = md_splitter.split_text(md_text)
print(f"Header splits: {len(header_splits)}")
for hs in header_splits:
    print(f"  content=[{hs.page_content[:80]}...]")
    print(f"  metadata={hs.metadata}")
    sub_texts = char_splitter.split_text(hs.page_content)
    print(f"  sub_texts: {len(sub_texts)}")
    for st in sub_texts:
        print(f"    [{len(st)} chars] {st[:60]}")
