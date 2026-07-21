# 前端规格文档

基于 grilling + 开发访谈，含 6 个页面的完整前端设计。

---

## 1. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | React + TypeScript |
| 组件库 | Ant Design 5.x |
| 图表库 | Ant Design Charts |
| 路由 | React Router v6 |
| 状态管理 | React Context + useReducer（轻量场景不引入 Redux） |
| HTTP 客户端 | axios |
| SSE | EventSourcePolyfill（支持 POST + headers） |
| 样式 | Ant Design 内置 less/CSS-in-JS |
| 构建 | Vite |

---

## 2. 整体布局

```
┌──────────────────────────────────────────────┐
│  HEADER（面包屑 + 用户信息 + 退出）            │
├──────────┬───────────────────────────────────┤
│          │                                   │
│  SIDER   │     CONTENT（页面内容区）           │
│  浅色     │                                   │
│  菜单     │                                   │
│          │                                   │
│          │                                   │
├──────────┴───────────────────────────────────┤
│  FOOTER（copyright，可选）                      │
└──────────────────────────────────────────────┘
```

| 区域 | 说明 |
|---|---|
| Header | 左侧系统 Logo + 名称「RAG 知识库问答系统」，右侧当前用户名 + 角色标签 + 退出按钮 |
| Sider | 浅色主题，可折叠，宽度 220px。菜单项按角色动态展示 |
| Content | 白色背景，内边距 24px，页面在此区域渲染 |
| Footer | 居中 copyright 文字，可选显示 |

---

## 3. 路由设计

| 路径 | 页面 | 角色 | 菜单显示名 |
|---|---|---|---|---|
| `/login` | 登录页 | 所有人 | —（无菜单） |
| `/qa` | 问答页 | User + Admin | 问答 |
| `/search` | Chunk 搜索页 | User + Admin | 知识库搜索 |
| `/kb/manage` | 知识库管理 | Admin | 知识库管理 |
| `/dashboard` | 仪表盘 | Admin | 仪表盘 |
| `/admin/users` | 用户管理 | Admin | 用户管理 |
| `/admin/settings` | 模型配置 | Admin | 模型配置 |
| `/` | — | — | 重定向到 `/qa` |

### 3.1 菜单结构

**普通用户（user）：**

| 菜单项 | 图标 | 路径 |
|---|---|---|
| 问答 | `MessageOutlined` | `/qa` |
| 知识库搜索 | `SearchOutlined` | `/search` |

**管理员（admin）：**

| 菜单项 | 图标 | 路径 |
|---|---|---|
| 问答 | `MessageOutlined` | `/qa` |
| 知识库搜索 | `SearchOutlined` | `/search` |
| 知识库管理 | `DatabaseOutlined` | `/kb/manage` |
| 仪表盘 | `DashboardOutlined` | `/dashboard` |
| 用户管理 | `TeamOutlined` | `/admin/users` |
| 模型配置 | `SettingOutlined` | `/admin/settings` |

### 3.2 路由守卫

| 规则 | 行为 |
|---|---|
| 未登录访问任何页面 | 重定向到 `/login` |
| 普通用户访问管理页 | 重定向到 `/qa`，顶部提示「无权限」 |
| 已登录访问 `/login` | 重定向到 `/qa` |

---

## 4. 页面详细设计

### 4.1 登录页（/login）

```
┌────────────────────────────────────────────┐
│                                            │
│                                            │
│        ┌─────────────────────────┐         │
│        │    RAG 知识库问答系统     │         │
│        │                         │         │
│        │  用户名:  [___________]  │         │
│        │  密  码:  [___________]  │         │
│        │  □ 记住密码              │         │
│        │                         │         │
│        │  [      登  录      ]   │         │
│        └─────────────────────────┘         │
│                                            │
│                                            │
└────────────────────────────────────────────┘
```

| 元素 | 说明 |
|---|---|
| 背景 | 渐变色背景（如 `#667eea` → `#764ba2` 或简洁浅灰） |
| 卡片 | 白色圆角卡片，宽度 400px，居中 |
| 标题 | 系统名称，字号 24px，加粗，下方可配一句 slogan |
| 用户名输入框 | placeholder「请输入用户名」，prefix 用户图标 |
| 密码输入框 | type="password"，prefix 锁图标 |
| 记住密码 | Checkbox，勾选后 token 存入 localStorage，支持 7 天自动刷新 |
| 登录按钮 | type="primary"，loading 状态，整行宽度 |
| 交互 | 登录成功 → 存 token 到 localStorage → 跳转 `/qa`；失败 → message.error 提示 |

---

### 4.2 问答页（/qa）

```
┌──────────────────────────────────────────────────────────────┐
│ SIDER（280px）                    │  CONTENT                   │
│                                  │                            │
│  [🔍 搜索知识库...              ]│  ┌────────────────────────┐ │
│  ────────────────────────────── │  │ 知识库名称               │ │
│  📚 产品手册知识库               │  │ 文档数: 15  切片数: 230  │ │
│  📚 技术文档知识库      ← 选中   │  └────────────────────────┘ │
│  📚 规章制度知识库               │                            │
│  ────────────────────────────── │  ┌── 聊天消息区 ──────────┐ │
│  对话历史                        │  │                        │ │
│  [＋ 新建对话]                   │  │  [用户消息气泡]         │ │
│  💬 关于API接口的问题            │  │  [助手回答气泡]         │ │
│  💬 如何配置参数           ← 选中│  │  [引用卡片: 文档A p3...]│ │
│  💬 版本更新说明          │      │  │                        │ │
│                                  │  └────────────────────────┘ │
│                                  │                            │
│                                  │  ┌── 输入区 ──────────────┐ │
│                                  │  │ [输入问题...      ] [发送]│ │
│                                  │  └────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

#### 4.2.1 Sider 区域

| 元素 | 说明 |
|---|---|
| 搜索知识库 | Input.Search，输入关键字实时过滤知识库列表（前端过滤或后端搜索） |
| 知识库列表 | 选中高亮（蓝色背景），每条显示名称 + 小图标。点击切换知识库，同时加载该知识库下的对话列表 |
| 对话历史 | 显示当前选中知识库下的所有对话，按更新时间倒序。每条显示对话标题（默认「新对话」或第一条消息摘要） |
| 新建对话按钮 | button type="dashed" full width，点击创建新空白对话（不立即调 API，发送首条消息时调用 POST /api/conversations） |
| 对话右键菜单 | 重命名 / 删除（DELETE /api/conversations/{id}），删除有 Popconfirm 二次确认 |

#### 4.2.2 聊天消息区

| 元素 | 说明 |
|---|---|
| 知识库信息栏 | 顶部显示当前知识库名称、文档数、切片数。右侧可折叠 |
| 空状态 | 选中知识库且无对话时显示 Empty 组件：「选择一个知识库，开始提问」 |
| 用户消息气泡 | 靠右，蓝色或浅蓝背景，显示消息文本 + 发送时间 |
| 助手消息气泡 | 靠左，白色背景 + 边框，显示流式文本 + 生成完成后显示引用卡片 |
| 流式渲染 | 收到 SSE chunk 逐 token 追加，使用打字机效果（每次 append 一个字符，使用 requestAnimationFrame 平滑渲染） |
| 引用卡片 | 消息底部以 Card 列表展示引用来源，每条显示：文档名（粗体）+ 页码（如 `p.3-5`）+ 片段摘要（截取前 100 字符，可展开查看完整内容） |
| 滚动 | 新消息自动滚动到底部。用户手动上滚时不强制滚动，显示「↓」浮动按钮点击回到最新 |

#### 4.2.3 输入区

| 元素 | 说明 |
|---|---|
| 输入框 | TextArea，autoSize={{ minRows:1, maxRows:4 }}，placeholder「输入你的问题...」 |
| 发送按钮 | 输入框右侧，Enter 发送，Shift+Enter 换行。发送中 loading 状态 + 禁用 |
| 停止按钮 | 流式输出中显示停止按钮（替换发送按钮），点击中断 SSE 连接 |
| 发送流程 | 若无当前对话 → POST /api/conversations 创建 → POST /api/chat/send（SSE）→ 流式渲染回答 |

#### 4.2.4 SSE 连接管理

| 场景 | 行为 |
|---|---|
| 正常结束 | SSE stream 收到 `[DONE]`，关闭连接，更新消息状态为完成 |
| 用户点击停止 | 主动 close EventSource，保留已收到的部分内容 |
| 连接异常 | 显示 message.error「连接中断，请重试」，保留已收到内容 |
| 切换知识库/对话 | 如有活跃 SSE 连接则先关闭 |

---

### 4.3 知识库搜索页（/search）

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─ 搜索栏 ─────────────────────────────────────────────┐   │
│  │  知识库: [▼ 多选知识库...]  方法: [○BM25 ○语义 ○混合]  │   │
│  │  [🔍 搜索...                                    ] [搜索]│   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ 搜索结果 ───────────────────────────────────────────┐   │
│  │  共 15 条结果                                          │   │
│  │  ─────────────────────────────────────────────────── │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ 📄 产品手册.pdf  [技术文档库]  关键词匹配度: 0.85  │ │   │
│  │  │ p.12  │ 🏷️ [code] [link]                         │ │   │
│  │  │ ...匹配的切片文本内容，关键字高亮显示...            │ │   │
│  │  │ [查看文档 ▸]                                      │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ 📄 API参考.md  [技术文档库]  语义相似度: 0.72      │ │   │
│  │  │ p.8   │ 🏷️ [code]                                │ │   │
│  │  │ ...另一个匹配的切片内容...                         │ │   │
│  │  │ [查看文档 ▸]                                      │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ...更多结果...                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│                      [< 1 2 3 >]                              │
└──────────────────────────────────────────────────────────────┘
```

#### 4.3.1 搜索栏

| 元素 | 说明 |
|---|---|
| 知识库选择器 | Ant Design `Select mode="multiple"`，多选知识库。placeholder「选择知识库（可多选）」。获取 GET /api/kb 列表填充 options。至少选一个 |
| 搜索方法 | Radio.Group 三个选项：BM25（关键词匹配）、语义（向量相似度）、混合（BM25 + 向量 + RRF 融合）。默认混合 |
| 搜索框 | Input.Search，输入关键词后 Enter 或点击搜索按钮触发 |
| 查询参数 | GET /api/kb/search?kb_ids=1,2&q=xxx&method=hybrid&top_n=20 |

#### 4.3.2 搜索结果卡片

| 元素 | 说明 |
|---|---|
| 文档名 | 粗体显示 `document_name`，可点击 |
| 所属知识库 | Tag 标签显示 `kb_name`，区分多 KB 搜索结果 |
| 页码 | `p.{page}`，灰色文字 |
| 内容标签 | `content_tags` 解析后显示图标：code=`</>` 标签、link=`🔗` 标签、image=`🖼` 标签 |
| 匹配文本 | 切片内容截取前 200 字符，关键字用 `<mark>` 高亮。超出部分显示「...」 |
| 查看文档 | 链接按钮，点击弹出 Modal 调用 `GET /api/documents/{document_id}/preview` 渲染 MD 全文，自动滚动到 `page` 附近 |
| 分数 | 右上角显示匹配分数（保留 2 位小数），不同方法标注不同（关键词匹配度 / 语义相似度 / 综合得分） |
| 空状态 | 无结果时显示 `<Empty description="未找到匹配的切片">` |

#### 4.3.3 交互细节

| 场景 | 行为 |
|---|---|
| 多 KB 搜索结果 | 合并后统一按分数降序排列，用 `kb_name` Tag 区分来源 |
| 搜索 loading | 搜索按钮 loading 状态，搜索结果区显示 Skeleton |
| 分页 | 前端分页，默认每页 10 条。后端返回 top_n 结果，前端切片分页 |
| 文档预览 Modal | 宽度 800px，react-markdown 渲染，支持代码高亮和图片。顶部显示文档名 + 页码 |
| 点击文档名 | 同样打开预览 Modal |
| 搜索历史 | 可选：localStorage 保存最近 10 条搜索记录，搜索框 focus 时下拉显示 |

---

### 4.4 知识库管理页（/kb/manage）

```
┌──────────────────────────────────────────────────────────────┐
│ SIDER（260px）                    │  CONTENT                   │
│                                  │                            │
│  [＋ 新建知识库]                  │  [基础信息] [策略配置] [文档管理] [切片编辑器] │
│  ────────────────────────────── │  ────────────────────────── │
│  📚 产品手册      ← 选中         │                            │
│  📚 技术文档           │         │  名称: [产品手册知识库     ]│
│  📚 规章制度           │         │  描述: [产品相关文档集合... ]│
│                                  │                            │
│                                  │  [保存]  [删除知识库]       │
└──────────────────────────────────────────────────────────────┘
```

#### 4.4.1 Sider 区域

| 元素 | 说明 |
|---|---|
| 新建按钮 | 顶部「+ 新建知识库」，弹出 Modal，填写名称 + 描述后创建，刷新列表 |
| 知识库列表 | 管理员拥有的所有知识库，选中高亮。每条显示名称 + 文档数角标 |
| 空状态 | 无知识库时显示 Empty：「暂无知识库，点击上方按钮创建」 |

#### 4.4.2 Tab：基础信息

| 字段 | 类型 | 规则 |
|---|---|---|
| 名称 | Input | 必填，2-50 字符 |
| 描述 | TextArea | 选填，最多 200 字符 |
| 创建时间 | 只读文本 | 自动显示 |
| 文档数 | 只读数字 | 自动显示 |

保存按钮 + 删除按钮（红色，Popconfirm 二次确认）

#### 4.4.3 Tab：策略配置

分为三个配置组：

**切片策略**

| 字段 | 控件 | 默认值 | 说明 |
|---|---|---|---|
| 切片方法 | Radio.Group: 标题分割 / 字符分割 / 语义分割 | 标题分割 | heading / character / semantic |
| 标题层级 | Select: 1-6 | 2 | 仅标题分割时显示 |
| 最大字符数 | InputNumber | 1000 | min=100, max=10000 |
| 切片重叠数 | InputNumber | 0 | min=0, max=500 |
| 分隔符顺序 | 拖拽排序列表 | \n\n → \n → 。 → . → ！ → ? → ； → ; → 字符 | 仅字符分割时显示 |

**检索参数**

| 字段 | 控件 | 默认值 | 说明 |
|---|---|---|---|
| 向量检索 Top-K | InputNumber | 20 | min=1, max=100 |
| BM25 检索 Top-K | InputNumber | 20 | min=1, max=100 |
| RRF 融合常数 K | InputNumber | 60 | min=10, max=200 |
| Rerank Top-N | InputNumber | 5 | min=1, max=N |

**对话参数**

| 字段 | 控件 | 默认值 | 说明 |
|---|---|---|---|
| 最大对话轮数 | InputNumber | 10 | min=1, max=50 |
| 上下文压缩 | Switch | 开启 | — |
| System Prompt | TextArea | 默认模板 | rows=6 |
| LLM 模型 | Select | deepseek-chat | — |
| LLM Temperature | Slider | 0.7 | min=0, max=2, step=0.1 |
| 词嵌入模型 | Input | 默认值 | 只读或可编辑 |
| Rerank 模型 | Input | 默认值 | 可编辑 |

**模型配置**

| 字段 | 控件 | 默认值 | 说明 |
|---|---|---|---|
| LLM 模型 | Select: deepseek-v4-pro / deepseek-v4-flash | deepseek-v4-pro | 大语言模型 |
| LLM Temperature | Slider (0-2, 0.1步长) | 0.7 | 生成温度，越低越确定 |
| 词嵌入模型 | Input | text-embedding-v3 | 向量化模型 |
| Rerank 模型 | Input | gte-rerank | 重排序模型 |

每个配置组为一个 Card，内部用 Form 布局。修改任意字段后底部「保存配置」按钮激活。

#### 4.4.4 Tab：文档管理

```
┌──────────────────────────────────────────────┐
│  [📤 上传文档]                                │
│  ─────────────────────────────────────────── │
│  文档名称        │ 格式  │ 状态     │ 操作     │
│  ─────────────────────────────────────────── │
│  产品API文档.md  │ MD   │ 🟢 已就绪 │ 预览 删除│
│  用户手册.docx   │ DOCX │ 🔵 处理中 │ —    删除│
│  架构设计.pptx   │ PPT  │ 🟠 待处理 │ —    删除│
│  旧版FAQ.pdf     │ PDF  │ 🔴 失败   │ 重传 删除│
└──────────────────────────────────────────────┘
```

| 元素 | 说明 |
|---|---|
| 上传按钮 | Button，点击打开文件选择器（accept 见下表）。上传后触发 pipeline，文档出现于列表 |
| 文件格式 | 原文件扩展名，旁标注原格式标签 |
| 状态标签 | Tag 组件：待处理=orange、处理中=blue/processing、已就绪=green、失败=red |
| 失败详情 | 失败状态的 Tag 可 hover/tooltip 显示错误原因 |
| 重传按钮 | 仅失败状态显示，点击重新打开文件选择器，覆盖旧文档 |
| 预览按钮 | 仅已就绪显示，点击跳转到文档 Markdown 预览（GET /api/documents/{id}/preview） |
| 切片编辑按钮 | 仅已就绪显示，点击跳转到切片编辑器 Tab 并定位到该文档 |
| 删除按钮 | Popconfirm 二次确认，删除文档 + 级联删除切片和向量 |

**文件格式支持：**

| 格式 | accept | max size |
|---|---|---|
| PDF | .pdf | 50MB |
| Word | .doc,.docx | 50MB |
| PPT | .ppt,.pptx | 50MB |
| Excel | .xls,.xlsx | 50MB |
| TXT | .txt | 10MB |
| Markdown | .md | 10MB |

**状态轮询：** 每 3 秒 GET /api/documents?kb_id=XX 刷新文档列表，仅刷新状态字段（已就绪和失败的不再轮询）。选中其他 Tab 时停止轮询。

#### 4.4.5 Tab：切片编辑器

```
┌──────────────────────────────────────────────────────────────┐
│ 文档: 产品API文档.md  │ 切片数: 12  │ [确认全部切片]           │
├────────────────────────────┬─────────────────────────────────┤
│  Markdown 预览区            │  切片列表                        │
│                            │                                 │
│  ────── 切分线 ──────      │  #1 概述部分       (p1) [预览]   │
│  # 概述                    │  #2 API 认证说明    (p2-3) [预览] │
│  这是产品API文档的概述...   │  #3 接口列表        (p4-6) [预览] │
│  ────── 切分线 ──────      │  #4 ...                         │
│  # API 认证                │                                 │
│  使用 Bearer Token...      │  点击预览 → 弹窗显示完整切片内容  │
│  ────── 切分线 ──────      │                                 │
│                            │                                 │
└────────────────────────────┴─────────────────────────────────┘
```

| 元素 | 说明 |
|---|---|
| 文档选择器 | 顶部 Select 下拉选择当前知识库中已就绪的文档 |
| 切分线 | 每个切片之间渲染可拖拽的水平分割线。拖拽上线调整上一个切片的结束位置，拖拽下线调整下一个切片的起始位置 |
| Markdown 预览 | 使用 react-markdown 渲染，切片边界以虚线分隔，当前悬停的切片高亮 |
| 切片列表 | 右侧 Panel，列表显示每个切片的序号 + 摘要（前 80 字符）+ 页码范围 + 内容类型标签（code/link/image 图标） |
| 预览按钮 | 点击弹出 Modal，显示该切片的完整 Markdown 渲染内容 |
| 确认按钮 | 顶部「确认全部切片」按钮，点击 POST /api/documents/{id}/chunks/confirm 触发 embedding + 索引 |
| 保存按钮 | 先 PUT /api/documents/{id}/chunks 保存边界调整，再确认 |
| 最终确认（finalize） | 切片编辑完成且 chunk 状态已 reviewed 后，点击「确认并入库」按钮，触发 POST /api/documents/{id}/finalize → 后端开始 Embedding + ChromaDB + BM25 索引 → 完成后文档状态变为已就绪 + chunks_finalized=1 |
| 最终确认 | 点击后 POST /api/documents/{id}/finalize，后端执行 embedding + ChromaDB + BM25 索引，期间按钮显示 loading |
| 拖拽逻辑 | react-dnd 或自定义拖拽，用 mousedown/mousemove/mouseup 实现，每次拖拽结束后自动计算新的字符位置，调用 PUT /api/documents/{id}/chunks 保存 |
| 合并切片 | 右键切分线可选择「合并上下两个切片」，自动更新边界 |
| 拆分切片 | 右键切片可输入拆分位置，将当前切片一分为二 |

---

### 4.5 仪表盘（/dashboard）

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ 知识库    │  │ 文档     │  │ 查询     │                   │
│  │   8      │  │   52     │  │  1,203  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │  7 天查询趋势            │  │  活跃知识库排行           │   │
│  │  ┌─────折线图──────┐    │  │  知识库    │ 查询数      │   │
│  │  │                │     │  │  ──────────────────    │   │
│  │  │   /\/\/\/\     │     │  │  产品手册  │  456      │   │
│  │  │   /      \     │     │  │  技术文档  │  321      │   │
│  │  └────────────────┘    │  │  规章制度  │  198      │   │
│  └─────────────────────────┘  │  ...       │  ...      │   │
│                                └─────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

| 元素 | 说明 |
|---|---|
| 统计卡片 | Row + Col：`<StatisticCard>` 显示 3 个统计数值（知识库总数、文档总数、查询总数），加载时显示 Skeleton |
| 7 天趋势图 | Ant Design Charts `<Line>`：x=日期, y=查询数。加载时显示 Skeleton |
| 活跃排行 | Table（columns: 排名、知识库名称、查询数），默认按查询数降序，最多显示 Top 10 |
| 刷新按钮 | 页面顶部「刷新」按钮，手动刷新所有数据 |
| 空状态 | 无数据时各组件显示对应 Empty 状态 |

---

### 4.6 用户管理（/admin/users）

```
┌──────────────────────────────────────────────────────────────┐
│  [＋ 新建用户]                                                │
│  ─────────────────────────────────────────────────────────── │
│  用户名      │ 角色       │ 创建时间       │ 操作             │
│  ─────────────────────────────────────────────────────────── │
│  admin      │ 管理员     │ 2025-01-01    │ —（不可删除自己）   │
│  zhangsan   │ 普通用户   │ 2025-06-15    │ 删除             │
│  lisi       │ 普通用户   │ 2025-07-01    │ 删除             │
│  ─────────────────────────────────────────────────────────── │
│                      [< 1 2 3 >]                              │
└──────────────────────────────────────────────────────────────┘
```

| 元素 | 说明 |
|---|---|
| 用户表格 | Ant Design Table，columns: 用户名、角色（Tag 组件）、创建时间（格式化显示）、操作 |
| 角色标签 | 管理员=red Tag，普通用户=blue Tag |
| 新建用户 | 顶部「+ 新建用户」按钮，弹出 Modal 对话框 |
| 新建表单 | 用户名（Input，必填）、密码（Input.Password，必填）、角色（Select: 管理员/普通用户） |
| 删除操作 | 仅非自身用户显示删除按钮，Popconfirm 二次确认：「确定删除用户 XXX 吗？」 |
| 分页 | 默认每页 10 条，超过则分页 |

---

## 5. 组件树

```
App
├── AuthProvider（JWT 状态 + 角色）
├── Router
│   ├── LoginPage
│   │   └── LoginCard
│   │        ├── Input（username）
│   │        ├── Input.Password
│   │        ├── Checkbox（记住密码）
│   │        └── Button（登录）
│   │
│   └── AuthLayout（Header + Sider + Content）
│       ├── HeaderBar
│       │   ├── Logo + 系统名
│       │   ├── Breadcrumb
│       │   └── UserDropdown（用户名 + 退出）
│       │
│       ├── SiderMenu
│       └── Content
│           ├── QAPage
│           │   ├── QASider
│           │   │   ├── KBSearch（搜索知识库）
│           │   │   ├── KBList（知识库列表）
│           │   │   └── ConversationList（对话历史 + 新建按钮）
│           │   └── ChatArea
│           │       ├── KBInfoBar（知识库信息栏）
│           │       ├── MessageList
│           │       │   ├── UserMessage（用户气泡）
│           │       │   └── AssistantMessage（助手气泡 + 引用卡片）
│           │       ├── ScrollToBottom（浮动按钮）
│           │       └── ChatInput（输入框 + 发送/停止按钮）
│           │
│           ├── SearchPage
│           │   ├── SearchBar
│           │   │   ├── KBMultiSelect（知识库多选下拉）
│           │   │   ├── MethodRadio（BM25 / 语义 / 混合）
│           │   │   └── SearchInput（搜索框 + 按钮）
│           │   ├── SearchResultList
│           │   │   └── SearchResultCard（文档名 + KB名 + 页码 + 标签 + 文本 + 查看按钮）
│           │   └── DocPreviewModal（MD 预览弹窗）
│           │
│           ├── KBManagePage
│           │   ├── KBManageSider（知识库列表 + 新建）
│           │   └── KBDetail
│           │       ├── TabBar（基础信息 / 策略配置 / 文档管理 / 切片编辑器）
│           │       ├── BasicInfoTab
│           │       ├── StrategyConfigTab
│           │       │   ├── ChunkStrategyCard
│           │       │   ├── RetrievalParamsCard
│           │       │   └── ConversationParamsCard
│           │       ├── DocManageTab
│           │       │   ├── UploadButton
│           │       │   └── DocTable（文档列表 + 状态轮询）
│           │       └── ChunkEditorTab
│           │           ├── DocumentSelector
│           │           ├── MarkdownPreview（切片边界可视化）
│           │           ├── ChunkBoundary（可拖拽切分线）
│           │           └── ChunkListPanel（切片列表 + 预览弹窗）
│           │
│           ├── DashboardPage
│           │   ├── StatCards（3 个统计卡片）
│           │   ├── TrendChart（7 天折线图）
│           │   └── RankingTable（活跃知识库排行）
│           │
│           └── UserManagePage
│               ├── NewUserButton（新建用户按钮）
│               ├── NewUserModal（新建用户对话框）
│               └── UserTable（用户列表 + 删除确认）
```

---

## 6. 数据流

### 6.1 API 调用约定

| 约定 | 说明 |
|---|---|
| base URL | 环境变量 `VITE_API_BASE` 配置，默认 `http://localhost:8000` |
| 请求头 | axios interceptor 自动附加 `Authorization: Bearer {token}` |
| 401 处理 | 响应 401 时清除 token，跳转登录页 |
| 错误提示 | 非 401 错误统一 message.error 显示后端返回的 detail |

### 6.2 状态管理

| 状态 | 作用域 | 说明 |
|---|---|---|
| auth（token, user, role） | AuthContext（全局） | 登录时写入 localStorage + context，App 启动时从 localStorage 恢复 |
| currentKB | QAPage 状态 | 当前选中的知识库 id |
| conversations | QAPage 状态 | 当前 KB 下的对话列表 |
| activeConversation | QAPage 状态 | 当前活跃对话 id + messages 列表 |
| sseStatus | ChatArea 状态 | idle / streaming / stopped |
| selectedKB | KBManagePage 状态 | 当前管理的知识库 |
| docList | DocManageTab 状态 | 文档列表 + 轮询interval |

### 6.3 JWT 存储与恢复

```
localStorage 存储:
  - auth_token        : JWT access token
  - auth_refresh_token: JWT refresh token
  - auth_user         : JSON { username, role }
  - auth_remember     : "true" | undefined
```

| 场景 | 行为 |
|---|---|
| 普通登录（不勾选记住密码） | sessionStorage 存储，关闭浏览器自动清除 |
| 记住密码登录 | localStorage 存储，启动时自动恢复 |
| token 即将过期 | axios interceptor 在 401 前调用 POST /api/auth/refresh 刷新 token |
| 退出登录 | 清除所有存储，跳转登录页 |

---

## 7. 交互规范

| 规范 | 说明 |
|---|---|
| Loading | 所有异步操作显示 Ant Design Spin 或 Skeleton |
| 空状态 | 无数据列表显示 `<Empty description="暂无数据">` |
| 错误状态 | API 失败时显示 `<Result status="error">` 组件 |
| 二次确认 | 所有删除操作使用 Popconfirm |
| 成功提示 | 创建/更新/删除成功后显示 message.success |
| 表单校验 | 必填项使用 Ant Design Form rules 校验 |
| 响应式 | 侧边栏可折叠，树形菜单在小屏自动收缩 |
| 滚动条 | 内容区 overflow-y: auto，侧边栏和聊天消息区各自独立滚动 |

---

## 8. 文件结构

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # Router + AuthProvider
│   ├── api/
│   │   ├── client.ts             # axios 实例 + interceptors
│   │   ├── auth.ts               # 登录/刷新 API
│   │   ├── kb.ts                 # 知识库 CRUD API
│   │   ├── documents.ts          # 文档上传/状态/预览/切片 API
│   │   ├── chat.ts               # 对话 + SSE 发送 API
│   │   └── admin.ts              # 仪表盘 + 用户管理 API
│   ├── contexts/
│   │   └── AuthContext.tsx        # 认证状态
│   ├── layouts/
│   │   └── AuthLayout.tsx         # Header + Sider + Content 布局
│   ├── components/
│   │   ├── RouteGuard.tsx         # 路由守卫
│   │   ├── StatCard.tsx           # 统计卡片
│   │   └── ...
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── QAPage/
│   │   │   ├── index.tsx
│   │   │   ├── QASider.tsx
│   │   │   ├── ChatArea.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── CitationCard.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── SearchPage/
│   │   │   ├── index.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchResultCard.tsx
│   │   │   └── DocPreviewModal.tsx
│   │   ├── KBManagePage/
│   │   │   ├── index.tsx
│   │   │   ├── KBManageSider.tsx
│   │   │   ├── BasicInfoTab.tsx
│   │   │   ├── StrategyConfigTab.tsx
│   │   │   ├── DocManageTab.tsx
│   │   │   └── ChunkEditorTab.tsx
│   │   ├── DashboardPage.tsx
│   │   └── UserManagePage.tsx
│   ├── hooks/
│   │   ├── useSSE.ts              # SSE 连接 hook
│   │   ├── usePolling.ts          # 轮询 hook
│   │   └── useAuth.ts             # 认证 hook
│   └── types/
│       └── index.ts               # TypeScript 类型定义
├── .env
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 9. 开发优先级

| 优先级 | 任务 | 依赖 |
|---|---|---|
| P0 | 项目脚手架（Vite + React + TS + Ant Design + 路由 + axios 封装） | 无 |
| P0 | AuthLayout + 登录页 + AuthContext + 路由守卫 | P0 |
| P1 | 问答页（知识库列表 + 对话 + SSE 流式聊天） | P0 |
| P1 | 知识库搜索页（多 KB 选择 + 关键词/语义/混合搜索） | P0 |
| P1 | 知识库管理页 — 基础信息 Tab | P0 |
| P1 | 知识库管理页 — 策略配置 Tab | P0 |
| P2 | 知识库管理页 — 文档管理 Tab（上传 + 列表 + 状态轮询） | P1 |
| P2 | 知识库管理页 — 切片编辑器 Tab | P2 |
| P2 | 仪表盘 | P0 |
| P2 | 用户管理 | P0 |
| P3 | 记住密码 + token 自动刷新 | P0 |
| P3 | 汇总联调 + 边界处理 | all |
