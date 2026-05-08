(function () {
  const state = {
    items: [],
    source: "全部",
    topic: "全部"
  };

  const sampleData = {
    fetchedAt: new Date().toISOString(),
    sources: [
      { id: "sample", name: "Local Preview", status: "ok", itemCount: 3 }
    ],
    errors: [],
    items: [
      {
        id: "sample-1",
        titleZh: "OpenAI 发布新一代模型能力，企业 AI 工作流继续加速",
        summaryZh: "这是一条本地预览样例，用于检查移动端布局。部署后会替换为真实全球 AI 资讯。",
        originalTitle: "OpenAI announces new model capabilities",
        url: "https://openai.com/news/",
        source: "OpenAI News",
        publishedAt: new Date().toISOString(),
        score: 142,
        importance: "极高",
        topics: ["模型发布", "产品应用"],
        reportedBy: ["OpenAI News"]
      },
      {
        id: "sample-2",
        titleZh: "AI 监管政策成为科技行业本周关注重点",
        summaryZh: "多个地区继续推进 AI 治理框架，模型安全、版权和数据透明度成为核心议题。",
        originalTitle: "AI regulation remains in focus",
        url: "https://www.technologyreview.com/",
        source: "MIT Technology Review",
        publishedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        score: 118,
        importance: "高",
        topics: ["监管政策"],
        reportedBy: ["MIT Technology Review"]
      },
      {
        id: "sample-3",
        titleZh: "研究团队发布新的 AI Agent 基准测试",
        summaryZh: "新基准关注长期任务执行、工具调用和多步骤推理，为评估实用型 Agent 提供参考。",
        originalTitle: "Researchers release a new AI agent benchmark",
        url: "https://arxiv.org/",
        source: "arXiv CS.AI",
        publishedAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
        score: 89,
        importance: "观察",
        topics: ["研究突破"],
        reportedBy: ["arXiv CS.AI"]
      },
      {
        id: "sample-4",
        titleZh: "Google 将 Gemini 能力接入更多 Workspace 场景",
        summaryZh: "办公套件中的 AI 写作、检索和自动化能力继续扩展，企业用户成为重点目标。",
        originalTitle: "Google expands Gemini across Workspace",
        url: "https://blog.google/technology/ai/",
        source: "Google AI Blog",
        publishedAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString(),
        score: 84,
        importance: "观察",
        topics: ["产品应用"],
        reportedBy: ["Google AI Blog"]
      },
      {
        id: "sample-5",
        titleZh: "芯片供应链继续影响 AI 训练和推理成本",
        summaryZh: "GPU、推理芯片和云服务价格成为模型公司控制成本的关键变量。",
        originalTitle: "AI chip supply chain shapes inference costs",
        url: "https://www.wired.com/tag/artificial-intelligence/",
        source: "WIRED AI",
        publishedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        score: 78,
        importance: "观察",
        topics: ["资本市场"],
        reportedBy: ["WIRED AI"]
      },
      {
        id: "sample-6",
        titleZh: "开源模型生态加速迭代，企业部署选择更多",
        summaryZh: "多家团队发布轻量模型和工具链，降低私有化 AI 应用门槛。",
        originalTitle: "Open source AI models keep accelerating",
        url: "https://venturebeat.com/category/ai/",
        source: "VentureBeat AI",
        publishedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        score: 74,
        importance: "观察",
        topics: ["模型发布", "产品应用"],
        reportedBy: ["VentureBeat AI"]
      },
      {
        id: "sample-7",
        titleZh: "AI 搜索产品竞争升级，浏览器入口价值上升",
        summaryZh: "搜索、浏览器和个人助手正在融合，用户入口成为新一轮竞争焦点。",
        originalTitle: "AI search competition moves into browsers",
        url: "https://www.theverge.com/rss/index.xml",
        source: "The Verge",
        publishedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
        score: 69,
        importance: "观察",
        topics: ["产品应用"],
        reportedBy: ["The Verge"]
      },
      {
        id: "sample-8",
        titleZh: "Hacker News 热议 AI 编程工具对团队效率的影响",
        summaryZh: "开发者讨论代码生成、审查和测试自动化在真实工程流程中的收益与限制。",
        originalTitle: "Developers debate AI coding tools",
        url: "https://news.ycombinator.com/",
        source: "Hacker News",
        publishedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        score: 64,
        importance: "观察",
        topics: ["产品应用"],
        reportedBy: ["Hacker News"]
      }
    ]
  };

  const nodes = {
    itemCount: document.getElementById("itemCount"),
    notice: document.getElementById("notice"),
    refreshButton: document.getElementById("refreshButton"),
    sourceCount: document.getElementById("sourceCount"),
    sourceFilters: document.getElementById("sourceFilters"),
    statusLine: document.getElementById("statusLine"),
    stories: document.getElementById("stories"),
    topStories: document.getElementById("topStories"),
    topicFilters: document.getElementById("topicFilters"),
    updatedAt: document.getElementById("updatedAt")
  };

  function init() {
    nodes.refreshButton.addEventListener("click", function () {
      loadNews(true);
    });

    renderLoading();
    loadNews(false);
  }

  async function loadNews(forceRefresh) {
    setLoading(true);

    try {
      if (window.location.protocol === "file:") {
        throw new Error("local-file-preview");
      }

      const response = await fetch(forceRefresh ? "/api/news?refresh=1" : "/api/news", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(response.status + " " + response.statusText);
      }

      const data = await response.json();
      applyData(data);
    } catch (error) {
      applyData(sampleData);
    } finally {
      setLoading(false);
    }
  }

  function applyData(data) {
    state.items = Array.isArray(data.items) ? data.items : [];
    state.source = "全部";
    state.topic = "全部";

    renderStatus(data);
    renderFilters();
    renderStories();
    renderNotice(data.errors || []);
  }

  function renderStatus(data) {
    const okSources = (data.sources || []).filter(function (source) {
      return source.status === "ok";
    });

    nodes.itemCount.textContent = String(state.items.length);
    nodes.sourceCount.textContent = okSources.length + "/" + ((data.sources || []).length || 0);
    nodes.updatedAt.textContent = data.fetchedAt ? formatDateTime(data.fetchedAt) : "--:--";
    nodes.statusLine.textContent = state.items.length
      ? "Top 20 AI 资讯 / 已按重要性排序"
      : "暂未获取到资讯";
  }

  function renderNotice(errors) {
    if (!errors.length) {
      nodes.notice.classList.add("is-hidden");
      nodes.notice.textContent = "";
      return;
    }

    nodes.notice.classList.remove("is-hidden");
    nodes.notice.textContent = errors.slice(0, 3).join(" / ");
  }

  function renderFilters() {
    const sources = ["全部"].concat(unique(state.items.map(function (item) {
      return item.source;
    })));
    const topics = ["全部"].concat(unique(state.items.flatMap(function (item) {
      return item.topics || [];
    })));

    renderChipGroup(nodes.sourceFilters, sources, state.source, function (value) {
      state.source = value;
      renderFilters();
      renderStories();
    });
    renderChipGroup(nodes.topicFilters, topics, state.topic, function (value) {
      state.topic = value;
      renderFilters();
      renderStories();
    });
  }

  function renderChipGroup(container, values, activeValue, onSelect) {
    container.replaceChildren.apply(
      container,
      values.map(function (value) {
        const button = document.createElement("button");
        button.className = "chip" + (value === activeValue ? " is-active" : "");
        button.type = "button";
        button.textContent = value;
        button.addEventListener("click", function () {
          onSelect(value);
        });
        return button;
      })
    );
  }

  function renderStories() {
    const filtered = state.items.filter(function (item) {
      const sourceMatches = state.source === "全部" || item.source === state.source;
      const topicMatches = state.topic === "全部" || (item.topics || []).includes(state.topic);
      return sourceMatches && topicMatches;
    });
    const top = filtered.slice(0, 3);
    const rest = filtered.slice(3);

    nodes.topStories.replaceChildren.apply(
      nodes.topStories,
      top.map(function (item, index) {
        return renderCard(item, index + 1, true);
      })
    );

    if (!rest.length && !top.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "当前筛选条件下没有资讯。请切换来源或主题。";
      nodes.stories.replaceChildren(empty);
      return;
    }

    nodes.stories.replaceChildren.apply(
      nodes.stories,
      rest.map(function (item) {
        return renderCard(item, 0, false);
      })
    );
  }

  function renderCard(item, rank, isTop) {
    const link = document.createElement("a");
    link.className = "story-card" + (isTop ? " top" : "");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.dataset.importance = item.importance || "观察";
    link.setAttribute("aria-label", "打开原文：" + item.titleZh);

    const body = document.createElement("article");
    body.className = "story-body";

    const head = document.createElement("div");
    head.className = "card-head";

    const badge = document.createElement("span");
    badge.className =
      "badge" +
      (item.importance === "极高" ? " critical" : item.importance === "高" ? " high" : "");
    badge.textContent = item.importance || "观察";

    const rankText = document.createElement("span");
    rankText.className = "rank";
    rankText.textContent = isTop ? "TOP " + rank : Math.round(item.score || 0) + " 权重";

    head.append(badge, rankText);

    const title = document.createElement("h3");
    title.className = "story-title";
    title.textContent = item.titleZh || item.originalTitle || "未命名资讯";

    const summary = document.createElement("p");
    summary.className = "story-summary";
    summary.textContent = item.summaryZh || "暂无摘要，点击查看原文。";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = [
      item.source,
      formatRelative(item.publishedAt),
      Math.round(item.score || 0) + " 权重"
    ].filter(Boolean).join(" / ");

    const topics = document.createElement("div");
    topics.className = "topics";
    (item.topics || []).forEach(function (topic) {
      const node = document.createElement("span");
      node.className = "topic";
      node.textContent = topic;
      topics.append(node);
    });

    body.append(head, title, summary, meta, topics);
    link.append(body);
    return link;
  }

  function renderLoading() {
    const template = document.getElementById("loadingTemplate");
    const cards = Array.from({ length: 6 }, function () {
      return template.content.firstElementChild.cloneNode(true);
    });
    nodes.topStories.replaceChildren.apply(nodes.topStories, cards.slice(0, 3));
    nodes.stories.replaceChildren.apply(nodes.stories, cards.slice(3));
  }

  function setLoading(isLoading) {
    nodes.refreshButton.disabled = isLoading;
    nodes.refreshButton.classList.toggle("is-loading", isLoading);
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function formatDateTime(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      timeZone: "Asia/Shanghai"
    }).format(new Date(value));
  }

  function formatRelative(value) {
    const published = Date.parse(value);

    if (!Number.isFinite(published)) {
      return "时间未知";
    }

    const minutes = Math.max(1, Math.round((Date.now() - published) / 60000));

    if (minutes < 60) {
      return minutes + " 分钟前";
    }

    const hours = Math.round(minutes / 60);

    if (hours < 48) {
      return hours + " 小时前";
    }

    return Math.round(hours / 24) + " 天前";
  }

  init();
})();
