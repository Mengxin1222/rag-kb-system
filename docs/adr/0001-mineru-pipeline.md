# 使用 MinerU 统一文档解析管道

通用知识库需要支持 PDF、Word、PPT、Excel 等多种文件格式。我们选择将所有非 Markdown 格式先通过 MinerU API 转换为 Markdown，再统一进行切片处理，而非为每种格式单独编写解析器。

## Considered Options

- **Unstructured.io** — RAG 领域标准库，一站式解析多种格式。但中文文档解析质量参差不齐，且解析结果不是结构化 Markdown，后续切片策略难以利用文档结构信息。
- **每种格式单独调用专业库**（PyMuPDF for PDF、python-docx for Word 等）— 更精细控制，但开发和维护成本高，且各格式输出不统一，切片策略需要适配多种输入。
- **MinerU API** — 将任意文档格式转换为结构化 Markdown，输出统一，切片策略只需处理一种格式，利用 Markdown 标题层级作为天然的切片边界。

## Consequences

- 文档处理管道简化为单一格式输入（Markdown），所有下游环节（切片、Embedding）无需感知原始格式。
- 切片策略可以充分利用 Markdown 标题层级 `#` `##` `###` 进行语义切分。
- MinerU 作为外部 API 调用，处理大文件时需要合理的超时和重试策略。
