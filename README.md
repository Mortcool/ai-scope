# AIScope · AI 瞭望

零本地依赖的 AI 资讯网站：静态前端 + 原生 Vercel Serverless API。项目没有 `package.json`，不需要在本机运行 `npm install`。

## 文件结构

```text
index.html
styles.css
app.js
api/news.js
vercel.json
```

## 功能

- 自动聚合全球 AI 资讯 RSS/API。
- 服务端按来源权重、时效、热度和主题信号排序。
- 默认展示前 20 条，移动端单列优先。
- 配置 `OPENAI_API_KEY` 后，服务端调用 OpenAI Responses API 批量翻译为中文。
- 不使用数据库，只设置短时 HTTP 缓存。

## Vercel 部署

1. 把代码推送到 GitHub。
2. 在 Vercel 导入该仓库。
3. Framework Preset 选 `Other`。
4. Build Command 留空。
5. Output Directory 留空。
6. 配置环境变量：
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` 可选，默认 `gpt-5.4-mini`

部署完成后，手机浏览器打开 Vercel 分配的域名即可访问。
