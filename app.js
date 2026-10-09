(() => {
  const REPO = "stabey/tech-brief";
  const ISSUE_BASE = `https://github.com/${REPO}/issues/new`;
  const LS_RATINGS = "tech-brief-ratings";
  const LS_WATCHES = "tech-brief-watches";

  const $ = (sel, el = document) => el.querySelector(sel);

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDateLabel(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-").map(Number);
    if (!y || !m || !d) return isoDate;
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const wd = weekdays[new Date(y, m - 1, d).getDay()];
    return `${y}年${m}月${d}日 · 周${wd}`;
  }

  function addDaysISO(days) {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const today = fmt.format(now);
    const [y, m, d] = today.split("-").map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() + Number(days));
    const yy = base.getUTCFullYear();
    const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(base.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  function openIssue({ title, body, labels }) {
    const params = new URLSearchParams();
    params.set("title", title);
    params.set("body", body);
    if (labels) params.set("labels", labels);
    window.open(`${ISSUE_BASE}?${params.toString()}`, "_blank", "noopener");
  }

  function getRatings() {
    return loadJSON(LS_RATINGS, {});
  }

  function setRating(itemId, vote) {
    const ratings = getRatings();
    ratings[itemId] = { vote, at: new Date().toISOString() };
    saveJSON(LS_RATINGS, ratings);
  }

  function voteButtons(item) {
    const ratings = getRatings();
    const current = ratings[item.id]?.vote;
    const likeActive = current === "like" ? " active" : "";
    const dislikeActive = current === "dislike" ? " active" : "";
    return `
      <div class="actions">
        <button type="button" class="btn like${likeActive}" data-vote="like" data-id="${escapeHtml(item.id)}" aria-pressed="${current === "like"}">喜欢</button>
        <button type="button" class="btn dislike${dislikeActive}" data-vote="dislike" data-id="${escapeHtml(item.id)}" aria-pressed="${current === "dislike"}">不喜欢</button>
      </div>
    `;
  }

  function metaRow(item, { source, meta } = {}) {
    const bits = [];
    if (source) bits.push(`<span class="source-tag">${escapeHtml(source)}</span>`);
    if (meta) bits.push(`<span class="meta-chip">${escapeHtml(meta)}</span>`);
    if (item.discussion_url) {
      bits.push(
        `<a class="meta-chip" href="${escapeHtml(item.discussion_url)}" target="_blank" rel="noopener">讨论</a>`
      );
    }
    bits.push(voteButtons(item));
    return `<div class="meta-row">${bits.join("")}</div>`;
  }

  function itemCard(item, { title, summary, source, url, meta, extraHtml = "" } = {}) {
    const displayTitle = title || item.title || item.summary || "（无标题）";
    const displaySummary = summary ?? item.summary ?? "";
    const displaySource = source || item.source || "";
    const href = url || item.url || "";
    const titleHtml = href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(displayTitle)}</a>`
      : escapeHtml(displayTitle);

    return `
      <article class="card item-card" data-item-id="${escapeHtml(item.id)}">
        <h3>${titleHtml}</h3>
        ${displaySummary ? `<p class="summary">${escapeHtml(displaySummary)}</p>` : ""}
        ${extraHtml}
        ${metaRow(item, { source: displaySource, meta })}
      </article>
    `;
  }

  function emptyState(text) {
    return `<div class="empty">${escapeHtml(text)}</div>`;
  }

  function renderHighlights(data) {
    const el = $("#highlights-list");
    const items = data.highlights || [];
    if (!items.length) {
      el.innerHTML = emptyState("本期内容写入中");
      return;
    }
    el.innerHTML = items
      .map((item) =>
        itemCard(item, {
          title: item.title,
          summary: item.summary,
          source: item.source,
          url: item.url,
        })
      )
      .join("");
  }

  function renderAccounts(data) {
    const el = $("#accounts-list");
    const accounts = data.accounts || [];
    if (!accounts.length) {
      el.innerHTML = emptyState("本期内容写入中");
      return;
    }

    el.innerHTML = accounts
      .map((acc) => {
        const items = acc.items || [];
        let body;
        if (!items.length) {
          body = `<div class="empty">暂无公开发帖，或本期尚未写入</div>`;
        } else {
          body = items
            .map((item) => {
              const interactions = (item.interactions || [])
                .map((ix) => {
                  const text = escapeHtml(ix.summary || "");
                  return ix.url
                    ? `<li><a href="${escapeHtml(ix.url)}" target="_blank" rel="noopener">${text}</a></li>`
                    : `<li>${text}</li>`;
                })
                .join("");
              const extra = interactions
                ? `<ul class="interactions">${interactions}</ul>`
                : "";
              const title =
                (item.summary || "").length > 72
                  ? `${item.summary.slice(0, 72)}…`
                  : item.summary || "动态";
              const href = item.url || "";
              const titleHtml = href
                ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>`
                : escapeHtml(title);
              return `
                <div class="account-item item-card" data-item-id="${escapeHtml(item.id)}">
                  <h3>${titleHtml}</h3>
                  ${item.summary ? `<p class="summary">${escapeHtml(item.summary)}</p>` : ""}
                  ${extra}
                  ${metaRow(item, { source: `@${acc.handle}`, meta: item.time || "" })}
                </div>
              `;
            })
            .join("");
        }

        return `
          <div class="account-block">
            <div class="card">
              <div class="account-head">
                <h3>${escapeHtml(acc.name || acc.handle)}</h3>
                <a href="https://x.com/${escapeHtml(acc.handle)}" target="_blank" rel="noopener">@${escapeHtml(acc.handle)}</a>
              </div>
              ${body}
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderSections(data) {
    const el = $("#sections-list");
    const sections = data.sections || [];
    if (!sections.length) {
      el.innerHTML = emptyState("本期内容写入中");
      return;
    }

    el.innerHTML = sections
      .map((sec) => {
        const items = sec.items || [];
        const cards = items.length
          ? `<div class="card-grid">${items
              .map((item) =>
                itemCard(item, {
                  title: item.title,
                  summary: item.summary,
                  source: sec.source,
                  url: item.url,
                  meta: item.meta || "",
                })
              )
              .join("")}</div>`
          : emptyState("暂无条目");
        return `
          <div class="section-block">
            <h3 class="source-title">${escapeHtml(sec.source)}</h3>
            ${cards}
          </div>
        `;
      })
      .join("");
  }

  function renderGaps(data) {
    const section = $("#gaps");
    const list = $("#gaps-list");
    const gaps = data.gaps || [];
    if (!gaps.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    list.innerHTML = gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("");
  }

  function renderPodcast(data) {
    const panel = $("#podcast-panel");
    const podcast = data.podcast;
    if (!podcast) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const player = $("#podcast-player");
    const script = $("#podcast-script");
    if (podcast.src) player.src = podcast.src;
    script.textContent = podcast.script || "";
    $("#podcast-label").textContent = podcast.src ? "本期语音" : "播客稍后上线";
  }

  function handleVoteClick(e) {
    const btn = e.target.closest("[data-vote]");
    if (!btn) return;
    const vote = btn.dataset.vote;
    const itemId = btn.dataset.id;
    const card = btn.closest("[data-item-id]");
    const titleEl = card?.querySelector("h3");
    const link = titleEl?.querySelector("a");
    const title = titleEl?.textContent?.trim() || itemId;
    const url = link?.href || "";
    const issueDate = document.body.dataset.issueId || "";

    setRating(itemId, vote);

    const group = btn.parentElement;
    group.querySelectorAll("[data-vote]").forEach((b) => {
      b.classList.toggle("active", b.dataset.vote === vote);
      b.setAttribute("aria-pressed", b.dataset.vote === vote ? "true" : "false");
    });

    const body = [
      `## Rating`,
      ``,
      `- vote: ${vote}`,
      `- item_id: ${itemId}`,
      `- title: ${title}`,
      `- url: ${url || "(none)"}`,
      `- issue: ${issueDate}`,
      `- at: ${new Date().toISOString()}`,
      ``,
      `_Submitted from tech-brief static page_`,
    ].join("\n");

    openIssue({
      title: `[${vote}] ${itemId}`,
      body,
      labels: "rating",
    });
  }

  function getLocalWatches() {
    return loadJSON(LS_WATCHES, []);
  }

  function saveLocalWatch(entry) {
    const list = getLocalWatches();
    list.unshift(entry);
    saveJSON(LS_WATCHES, list.slice(0, 50));
  }

  function renderLocalWatches(configWatches = []) {
    const el = $("#local-watches");
    const local = getLocalWatches().map((w) => ({ ...w, origin: "local" }));
    const fromConfig = (configWatches || []).map((w) => ({ ...w, origin: "config" }));
    const merged = [...local, ...fromConfig];
    if (!merged.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `
      <h4>当前关注（本地 + 已同步配置）</h4>
      <ul>
        ${merged
          .map((w) => {
            const label = w.label || w.value || "";
            const type = w.type === "topic" ? "话题" : "账号";
            const exp = w.expires_on ? `至 ${w.expires_on}` : "长期";
            return `<li><span>${escapeHtml(type)} · ${escapeHtml(label)}</span><span>${escapeHtml(exp)}</span></li>`;
          })
          .join("")}
      </ul>
    `;
  }

  function setupWatchForm(config) {
    const typeSelect = $("#watch-type");
    const valueLabel = $("#watch-value-label");
    const valueInput = $("#watch-value");

    const syncPlaceholder = () => {
      if (typeSelect.value === "topic") {
        valueLabel.textContent = "话题关键词";
        valueInput.placeholder = "例如 AI Agent";
      } else {
        valueLabel.textContent = "账号（不带 @）";
        valueInput.placeholder = "例如 thsottiaux";
      }
    };
    typeSelect.addEventListener("change", syncPlaceholder);
    syncPlaceholder();

    $("#watch-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const type = typeSelect.value;
      let value = valueInput.value.trim();
      if (type === "account") value = value.replace(/^@+/, "");
      if (!value) return;

      const days = Number($("#watch-days").value) || 7;
      const expires = addDaysISO(days);
      const label = $("#watch-label").value.trim() || value;
      const createdAt = new Date().toISOString();
      const id = `watch-${type}-${value}-${expires}`;

      const title =
        type === "account"
          ? `[watch] account:@${value} expires:${expires}`
          : `[watch] topic:${value} expires:${expires}`;

      const body = [
        `## Temporary watch`,
        ``,
        `- type: ${type}`,
        `- value: ${type === "account" ? "@" + value : value}`,
        `- label: ${label}`,
        `- expires_on: ${expires}`,
        `- created_at: ${createdAt}`,
        ``,
        `_Submitted from tech-brief static page_`,
      ].join("\n");

      saveLocalWatch({
        id,
        type,
        value,
        label,
        expires_on: expires,
        created_at: createdAt,
      });
      renderLocalWatches(config.temp_watches || []);

      openIssue({ title, body, labels: "watch" });
      e.target.reset();
      $("#watch-days").value = "7";
      syncPlaceholder();
    });
  }

  async function loadData() {
    const res = await fetch("data/latest.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`无法加载 data/latest.json (${res.status})`);
    return res.json();
  }

  async function loadConfig() {
    try {
      const res = await fetch("data/config.json", { cache: "no-store" });
      if (!res.ok) return { temp_watches: [] };
      return res.json();
    } catch {
      return { temp_watches: [] };
    }
  }

  async function main() {
    document.body.addEventListener("click", handleVoteClick);

    const [data, config] = await Promise.all([loadData(), loadConfig()]);
    document.body.dataset.issueId = data.id || "";
    document.title = data.title || "技术早报";
    $("#issue-date").textContent = formatDateLabel(data.id) || data.title || "";

    renderPodcast(data);
    renderHighlights(data);
    renderAccounts(data);
    renderSections(data);
    renderGaps(data);
    setupWatchForm(config);
    renderLocalWatches(config.temp_watches || []);
  }

  main().catch((err) => {
    $("#issue-date").textContent = "加载失败";
    $("#highlights-list").innerHTML = emptyState(err.message || "加载失败");
    console.error(err);
  });
})();
