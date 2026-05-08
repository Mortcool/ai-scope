const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 9000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const SOURCES = [
  {
    id: "openai-news",
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    kind: "rss",
    sourceScore: 95,
    aiFocused: true,
    limit: 10
  },
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    kind: "rss",
    sourceScore: 85,
    aiFocused: true,
    limit: 14
  },
  {
    id: "wired-ai",
    name: "WIRED AI",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    kind: "rss",
    sourceScore: 80,
    aiFocused: true,
    limit: 12
  },
  {
    id: "venturebeat-ai",
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed",
    kind: "rss",
    sourceScore: 75,
    aiFocused: true,
    limit: 12
  },
  {
    id: "google-ai",
    name: "Google AI Blog",
    url: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    kind: "rss",
    sourceScore: 88,
    aiFocused: true,
    limit: 10
  },
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    kind: "rss",
    sourceScore: 90,
    aiFocused: false,
    limit: 12
  },
  {
    id: "the-verge",
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    kind: "rss",
    sourceScore: 80,
    aiFocused: false,
    limit: 12
  },
  {
    id: "ars-technica-ai",
    name: "Ars Technica AI",
    url: "https://arstechnica.com/tag/ai/feed/",
    kind: "rss",
    sourceScore: 75,
    aiFocused: true,
    limit: 10
  },
  {
    id: "arxiv-cs-ai",
    name: "arXiv CS.AI",
    url: "https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20",
    kind: "rss",
    sourceScore: 70,
    aiFocused: true,
    limit: 8
  },
  {
    id: "hacker-news-ai",
    name: "Hacker News",
    url: "https://hn.algolia.com/api/v1/search?query=AI&tags=story&hitsPerPage=40",
    kind: "hn",
    sourceScore: 72,
    aiFocused: false,
    limit: 12
  }
];

const TOPIC_RULES = [
  ["模型发布", 1.6, /\b(gpt-5|gpt|gemini|claude|deepseek|llama|mistral|qwen|sora|frontier model|model release|launches new model|introduces new model)\b/i],
  ["监管政策", 1.4, /\b(regulation|regulator|government|white house|congress|senate|ai act|lawsuit|copyright|antitrust|safety|policy)\b/i],
  ["AGI", 1.3, /\b(agi|superintelligence|artificial general intelligence|alignment)\b/i],
  ["资本市场", 1.2, /\b(funding|raises?|raised|ipo|valuation|acquires?|acquisition|billion|million|investment|invests?)\b/i],
  ["研究突破", 1.1, /\b(research|paper|benchmark|sota|breakthrough|arxiv|study)\b/i],
  ["产品应用", 1, /\b(product|feature|app|tool|assistant|agent|platform|api|search|browser|device)\b/i]
];

const AI_RELEVANCE = /\b(ai|artificial intelligence|machine learning|deep learning|llm|gpt|openai|anthropic|claude|gemini|deepseek|mistral|llama|qwen|sora|generative|neural|robotics|agentic|nvidia|gpu|inference|training|model)\b/i;
const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "over", "new", "are", "you", "its", "has"]);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const forceRefresh = req.url && req.url.includes("refresh=1");
  const cached = globalThis.__AISCOPE_CACHE__;

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    sendJson(res, cached.value, "s-maxage=300, stale-while-revalidate=600");
    return;
  }

  const data = await getNewsResponse();
  globalThis.__AISCOPE_CACHE__ = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: data
  };

  sendJson(res, data, forceRefresh ? "no-store" : "s-maxage=300, stale-while-revalidate=600");
};

async function getNewsResponse() {
  const settled = await Promise.allSettled(SOURCES.map(fetchSource));
  const statuses = [];
  const errors = [];
  const rawItems = [];

  settled.forEach((result, index) => {
    const source = SOURCES[index];

    if (result.status === "fulfilled") {
      statuses.push({ id: source.id, name: source.name, status: "ok", itemCount: result.value.length });
      rawItems.push(...result.value);
      return;
    }

    const message = `${source.name} 抓取失败：${result.reason && result.reason.message ? result.reason.message : "未知错误"}`;
    statuses.push({ id: source.id, name: source.name, status: "error", itemCount: 0, error: message });
    errors.push(message);
  });

  const ranked = rankAndDedupe(rawItems).slice(0, 30);
  const translated = await translateItems(ranked);

  if (translated.error) {
    errors.push(translated.error);
  }

  return {
    items: mergeTranslations(ranked, translated.items).slice(0, 20),
    fetchedAt: new Date().toISOString(),
    sources: statuses,
    errors
  };
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      Accept: source.kind === "hn"
        ? "application/json"
        : "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "User-Agent": "AIScope/1.0 Vercel AI news reader"
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const items = source.kind === "hn"
    ? parseHackerNews(await response.json(), source)
    : parseFeed(await response.text(), source);

  return (source.aiFocused ? items : items.filter(isAiRelevant)).slice(0, source.limit || 12);
}

function parseHackerNews(payload, source) {
  return (payload.hits || [])
    .map((hit) => {
      const title = hit.title || hit.story_title;
      const url = hit.url || hit.story_url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

      if (!title || !url) {
        return null;
      }

      return {
        id: stableId(`${source.id}:${url}:${title}`),
        sourceId: source.id,
        source: source.name,
        sourceScore: source.sourceScore,
        title: cleanText(title),
        summary: "Hacker News 热门讨论，点击查看原始链接和评论上下文。",
        url,
        publishedAt: hit.created_at || new Date().toISOString(),
        points: Number(hit.points || 0)
      };
    })
    .filter(Boolean)
    .slice(0, source.limit || 12);
}

function parseFeed(xml, source) {
  const blocks = extractBlocks(xml, "item");
  const entries = blocks.length ? blocks : extractBlocks(xml, "entry");

  return entries
    .map((block) => {
      const title = cleanText(readTag(block, "title"));
      const url = readLink(block) || cleanText(readTag(block, "guid")) || cleanText(readTag(block, "id"));
      const summary = truncate(
        cleanText(
          readTag(block, "description") ||
          readTag(block, "summary") ||
          readTag(block, "content") ||
          readTag(block, "content:encoded")
        ),
        420
      );
      const publishedAt =
        cleanText(readTag(block, "pubDate")) ||
        cleanText(readTag(block, "published")) ||
        cleanText(readTag(block, "updated")) ||
        cleanText(readTag(block, "dc:date")) ||
        new Date().toISOString();

      if (!title || !url) {
        return null;
      }

      return {
        id: stableId(`${source.id}:${url}:${title}`),
        sourceId: source.id,
        source: source.name,
        sourceScore: source.sourceScore,
        title,
        summary,
        url,
        publishedAt
      };
    })
    .filter(Boolean)
    .slice(0, source.limit || 12);
}

function extractBlocks(xml, tag) {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches = [];
  let match;

  while ((match = pattern.exec(xml))) {
    matches.push(match[1]);
  }

  return matches;
}

function readTag(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const pattern = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i");
  const match = pattern.exec(block);
  return match ? match[1] : "";
}

function readLink(block) {
  const rss = cleanText(readTag(block, "link"));

  if (rss && /^https?:\/\//i.test(rss)) {
    return rss;
  }

  const atom = /<link\b[^>]*href=["']([^"']+)["'][^>]*>/i.exec(block);
  return atom ? decodeEntities(atom[1]) : rss;
}

function rankAndDedupe(items) {
  const scored = items
    .filter((item) => item.title && item.url)
    .map(scoreItem)
    .sort((left, right) => right.score - left.score);
  const deduped = [];

  scored.forEach((item) => {
    const existing = deduped.find((candidate) => {
      return candidate.canonicalUrl === item.canonicalUrl || titleSimilarity(candidate.originalTitle, item.originalTitle) > 0.72;
    });

    if (existing) {
      existing.reportedBy = Array.from(new Set(existing.reportedBy.concat(item.source)));
      return;
    }

    deduped.push(item);
  });

  return deduped;
}

function scoreItem(item) {
  const recency = recencyMultiplier(item.publishedAt);
  const engagement = item.points ? Math.min(1.5, 0.8 + Math.min(item.points, 500) / 500 * 0.7) : 1;
  const topicSignal = getTopicSignal(`${item.title} ${item.summary}`);
  const score = Math.round(item.sourceScore * recency * engagement * topicSignal.multiplier);

  return {
    ...item,
    canonicalUrl: normalizeUrl(item.url),
    originalTitle: item.title,
    score,
    importance: score >= 125 ? "极高" : score >= 95 ? "高" : "观察",
    topics: topicSignal.topics,
    reportedBy: [item.source]
  };
}

function getTopicSignal(text) {
  const matched = TOPIC_RULES.filter((rule) => rule[2].test(text));

  if (!matched.length) {
    return { topics: ["AI 资讯"], multiplier: 1 };
  }

  return {
    topics: matched.map((rule) => rule[0]),
    multiplier: Math.max(...matched.map((rule) => rule[1]))
  };
}

function recencyMultiplier(value) {
  const published = Date.parse(value);

  if (!Number.isFinite(published)) {
    return 0.8;
  }

  const hours = Math.max(0, (Date.now() - published) / 3600000);
  if (hours < 2) return 1.5;
  if (hours < 6) return 1.2;
  if (hours < 12) return 1;
  if (hours < 24) return 0.8;
  if (hours < 48) return 0.5;
  return 0.3;
}

async function translateItems(items) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      items: [],
      error: "缺少 OPENAI_API_KEY，已回退展示原文标题；请在 Vercel 环境变量中配置。"
    };
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        input: [
          {
            role: "developer",
            content: "你是专业科技媒体编辑。把英文 AI 资讯标题和摘要翻译成简洁、准确、适合中文读者阅读的中文。保留公司名、模型名、产品名英文原文。只返回 JSON。"
          },
          {
            role: "user",
            content: JSON.stringify(items.map((item) => ({
              id: item.id,
              title: item.title,
              summary: item.summary
            })))
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "translated_news",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["items"],
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "titleZh", "summaryZh"],
                    properties: {
                      id: { type: "string" },
                      titleZh: { type: "string" },
                      summaryZh: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        },
        max_output_tokens: 6000
      })
    });

    if (!response.ok) {
      return { items: [], error: `OpenAI 翻译失败：${response.status} ${response.statusText}` };
    }

    const payload = await response.json();
    return { items: parseTranslations(extractOpenAIText(payload)) };
  } catch (error) {
    return { items: [], error: `OpenAI 翻译异常：${error.message || "未知错误"}` };
  }
}

function mergeTranslations(items, translations) {
  const map = new Map(translations.map((item) => [item.id, item]));

  return items.map((item) => {
    const translation = map.get(item.id);

    return {
      id: item.id,
      titleZh: translation && translation.titleZh ? translation.titleZh : item.title,
      summaryZh: translation && translation.summaryZh ? translation.summaryZh : item.summary || "暂无摘要，点击查看原文。",
      originalTitle: item.originalTitle,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt,
      score: item.score,
      importance: item.importance,
      topics: item.topics,
      reportedBy: item.reportedBy
    };
  });
}

function parseTranslations(text) {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.items || [];
  } catch {
    return [];
  }
}

function extractOpenAIText(payload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.output_text || "")
    .join("");
}

function isAiRelevant(item) {
  return AI_RELEVANCE.test(`${item.title} ${item.summary}`);
}

function cleanText(value) {
  return decodeEntities(String(value || ""))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1).trim()}...` : value;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) {
        url.searchParams.delete(key);
      }
    });
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").replace(/\/$/, "");
  }
}

function titleSimilarity(left, right) {
  const a = tokenize(left);
  const b = tokenize(right);
  const union = new Set([...a, ...b]);

  if (!union.size) {
    return 0;
  }

  return [...a].filter((token) => b.has(token)).length / union.size;
}

function tokenize(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s.-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

function stableId(value) {
  let hash = 5381;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function sendJson(res, data, cacheControl) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(data));
}
