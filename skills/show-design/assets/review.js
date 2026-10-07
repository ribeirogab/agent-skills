const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const POLL_INTERVAL = 2000;
const NODE_SELECTOR = "g.node, g.cluster, g.edgeLabel, g.note, rect.actor, text.actor, text.messageText, text.noteText";
const BLOCK_SELECTOR = "p, li, tr, h2, h3, h4, dt, dd, pre, blockquote, figure, aside, .card";
const NAMED_KINDS = new Set(["file", "component", "entity", "column", "table", "contract", "event", "job"]);

const design = document.getElementById("design");
const panel = document.getElementById("review");
const list = document.getElementById("review-list");
const modeLine = document.getElementById("review-mode");
const toggle = document.getElementById("review-toggle");
const { slug, build } = document.body.dataset;
const storageKey = `show-design:${slug}:comments`;
const scrollKey = `show-design:${slug}:scroll`;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

const state = {
  store: null,
  comments: [],
  commentsVersion: null,
  filter: "open",
  composer: null,
  selection: null,
  hovered: null,
  hideTimer: null,
  online: true,
  deferred: false,
  staleBuild: false,
};

const selectAction = element("button", { class: "floating-action select-action", type: "button", text: "Comment", hidden: true });
const addAction = element("button", { class: "floating-action add-action", type: "button", text: "+", title: "Comment on this block", "aria-label": "Comment on this block", hidden: true });

function element(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  node.append(...[children].flat().filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}

const collapse = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const truncate = (text, size) => (text.length > size ? `${text.slice(0, size - 1)}…` : text);
const timestamp = () => new Date().toISOString();
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const darkScheme = () => matchMedia("(prefers-color-scheme: dark)").matches;
const narrow = () => matchMedia("(max-width: 860px)").matches;

function debounce(callback, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}

function embeddedComments() {
  try {
    const data = JSON.parse(document.getElementById("review-comments")?.textContent || "{}");
    return Array.isArray(data.comments) ? data.comments : [];
  } catch {
    return [];
  }
}

async function request(method, url, payload) {
  const options = { method, cache: "no-store", headers: {} };
  if (payload !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? `${method} ${url} returned ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

const serverStore = {
  mode: "server",
  load: () => request("GET", "/api/comments"),
  create: (input) => request("POST", "/api/comments", input),
  update: (id, patch) => request("PATCH", `/api/comments/${encodeURIComponent(id)}`, patch),
  remove: (id) => request("DELETE", `/api/comments/${encodeURIComponent(id)}`),
  reply: (id, body) => request("POST", `/api/comments/${encodeURIComponent(id)}/replies`, { body }),
  editable: () => true,
};

const localStore = {
  mode: "local",
  read() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch {
      return [];
    }
  },
  write(comments) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(comments));
    } catch {
      toast("This browser blocks local storage: copy your comments before you close the page.");
    }
  },
  edit(id, change) {
    this.write(this.read().map((comment) => (comment.id === id ? { ...change(comment), updatedAt: timestamp() } : comment)));
  },
  async load() {
    return { comments: [...embeddedComments(), ...this.read()], version: null };
  },
  async create(input) {
    const comment = { id: `local-${Math.random().toString(16).slice(2, 8)}`, status: "open", createdAt: timestamp(), updatedAt: timestamp(), replies: [], local: true, ...input };
    this.write([...this.read(), comment]);
    return comment;
  },
  async update(id, patch) {
    this.edit(id, (comment) => ({ ...comment, ...patch }));
  },
  async remove(id) {
    this.write(this.read().filter((comment) => comment.id !== id));
  },
  async reply(id, body) {
    this.edit(id, (comment) => ({ ...comment, replies: [...comment.replies, { author: "user", body, createdAt: timestamp() }] }));
  },
  editable: (comment) => Boolean(comment.local),
};

async function chooseStore() {
  if (!location.protocol.startsWith("http")) return localStore;
  try {
    await request("GET", "/api/health");
    return serverStore;
  } catch {
    return localStore;
  }
}

function wrapTables() {
  for (const table of design.querySelectorAll("table")) {
    if (table.parentElement?.classList.contains("table-scroll")) continue;
    const wrapper = element("div", { class: "table-scroll" });
    table.replaceWith(wrapper);
    wrapper.append(table);
  }
}

function sections() {
  return [...design.querySelectorAll("section[data-anchor]")];
}

function buildToc() {
  const toc = document.getElementById("toc");
  const items = sections().map((section, index) => {
    section.id ||= section.dataset.anchor.replace(/^section:/, "").replace(/[^\w-]+/g, "-") || `section-${index + 1}`;
    const title = collapse(section.querySelector("h2")?.textContent) || section.id;
    return element("li", {}, element("a", { href: `#${section.id}`, dataset: { section: section.dataset.anchor } }, [element("span", { text: title }), element("span", { class: "toc-count", hidden: true })]));
  });
  toc.replaceChildren(element("p", { class: "toc-title", text: "Contents" }), element("ol", {}, items));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of toc.querySelectorAll("a")) link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      }
    },
    { rootMargin: "0px 0px -70% 0px" },
  );
  for (const section of sections()) observer.observe(section);
}

function withChangeClasses(source) {
  if (!/^\s*(?:%%.*\n\s*)*(?:flowchart|graph)\b/.test(source)) return source;
  const definitions = ["added", "changed", "removed", "moved"].map((kind) => {
    const dash = kind === "removed" ? ",stroke-dasharray:5 3" : "";
    return `classDef ${kind} fill:${cssVar(`--${kind}-soft`)},stroke:${cssVar(`--${kind}`)},stroke-width:2px,color:${cssVar("--text")}${dash}`;
  });
  return `${source.trimEnd()}\n${definitions.join("\n")}\n`;
}

function toFigure(script) {
  const canvas = element("div", { class: "diagram-canvas" });
  const caption = script.dataset.caption ? element("figcaption", { text: script.dataset.caption }) : null;
  const node = element("figure", { class: "diagram", dataset: { ...script.dataset } }, [canvas, caption]);
  script.replaceWith(node);
  return { node, canvas, source: script.textContent, anchor: script.dataset.anchor };
}

function failFigure(figure, message, report) {
  report.errors.push({ anchor: figure.anchor, message: collapse(message) });
  figure.node.classList.add("diagram-failed");
  figure.canvas.replaceChildren(element("div", {}, [element("p", { class: "diagram-error", text: `Diagram failed to render: ${collapse(message)}` }), element("pre", { text: figure.source })]));
}

async function renderDiagrams() {
  const figures = [...design.querySelectorAll('script[type="text/x-mermaid"]')].map(toFigure);
  const report = { build, diagrams: figures.length, errors: [], renderedAt: timestamp() };
  if (!figures.length) return report;
  let mermaid;
  try {
    ({ default: mermaid } = await import(MERMAID_URL));
  } catch (error) {
    for (const figure of figures) failFigure(figure, `Mermaid did not load (${error.message})`, report);
    return report;
  }
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: darkScheme() ? "dark" : "neutral", fontFamily: cssVar("--font") });
  for (const [index, figure] of figures.entries()) {
    const id = `show-design-diagram-${index}`;
    const source = withChangeClasses(figure.source);
    try {
      await mermaid.parse(figure.source);
      const { svg, bindFunctions } = await mermaid.render(id, source);
      figure.canvas.innerHTML = svg;
      bindFunctions?.(figure.canvas);
    } catch (error) {
      document.getElementById(`d${id}`)?.remove();
      failFigure(figure, error?.message ?? String(error), report);
    }
  }
  return report;
}

function anchorElement(anchor) {
  return design.querySelector(`[data-anchor="${CSS.escape(anchor)}"]`);
}

function anchorOrder() {
  return new Map([...design.querySelectorAll("[data-anchor]")].map((node, index) => [node.dataset.anchor, index]));
}

function labelOf(target) {
  if (target.dataset.label) return target.dataset.label;
  const [kind, ...rest] = target.dataset.anchor.split(":");
  if (NAMED_KINDS.has(kind) && rest.length) return rest.join(":");
  if (target.matches("figure.diagram, script")) return target.dataset.caption || target.dataset.anchor;
  const lead = target.querySelector(":scope > h3, :scope > strong, :scope > summary, :scope > td, :scope > th, :scope > code");
  return truncate(collapse((lead ?? target).textContent), 80);
}

function locate(anchor) {
  const target = anchorElement(anchor);
  if (!target) return anchor;
  const section = target.closest("section[data-anchor]");
  const sectionTitle = section ? collapse(section.querySelector("h2")?.textContent) : "";
  if (target === section) return sectionTitle || anchor;
  return [sectionTitle, labelOf(target)].filter(Boolean).join(" › ");
}

function entityName(node) {
  return node.matches("g.node") ? collapse(node.querySelector(":scope > g.label.name")?.textContent) : "";
}

function attributeAt(node, point) {
  const rows = [...node.querySelectorAll(":scope > g.row-rect-odd, :scope > g.row-rect-even")];
  const names = [...node.querySelectorAll(":scope > g.label.attribute-name")];
  const index = rows.findIndex((row) => {
    const box = row.getBoundingClientRect();
    return point.y >= box.top && point.y <= box.bottom;
  });
  return index >= 0 ? collapse(names[index]?.textContent) : "";
}

function nodeLabel(node, point) {
  const entity = entityName(node);
  if (!entity) return truncate(collapse(node.textContent), 160);
  const attribute = point ? attributeAt(node, point) : "";
  return attribute ? `${entity}.${attribute}` : entity;
}

function diagramNode(figure, quote) {
  return [...figure.querySelectorAll(NODE_SELECTOR)].find((node) => {
    const label = nodeLabel(node);
    return label === quote || (entityName(node) === label && quote.startsWith(`${label}.`));
  }) ?? null;
}

function textRange(scope, quote) {
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const positions = [];
  let normalized = "";
  let lastSpace = true;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest("script, style, svg")) continue;
    for (let offset = 0; offset < node.data.length; offset += 1) {
      const space = /\s/.test(node.data[offset]);
      if (space && lastSpace) continue;
      normalized += space ? " " : node.data[offset];
      positions.push([node, offset]);
      lastSpace = space;
    }
  }
  const index = normalized.indexOf(quote);
  if (index < 0 || !quote) return null;
  const [startNode, startOffset] = positions[index];
  const [endNode, endOffset] = positions[index + quote.length - 1];
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset + 1);
  return range;
}

function placeNear(node, rect) {
  const left = Math.min(Math.max(12, rect.left), innerWidth - node.offsetWidth - 12);
  const below = rect.bottom + 8;
  const top = below + node.offsetHeight < innerHeight - 12 ? below : Math.max(12, rect.top - node.offsetHeight - 8);
  node.style.left = `${left + scrollX}px`;
  node.style.top = `${top + scrollY}px`;
}

function openComposer({ anchor, quote = "", rect }) {
  closeComposer();
  hideSelectAction();
  addAction.hidden = true;
  const location = locate(anchor);
  const textarea = element("textarea", { rows: 4, placeholder: "Leave a comment", "aria-label": "Comment" });
  const save = element("button", { class: "button primary", type: "submit", text: "Comment" });
  const form = element("form", { class: "composer", "aria-label": "New comment" }, [
    element("div", { class: "composer-location", text: location }),
    quote ? element("blockquote", { text: truncate(quote, 400) }) : null,
    textarea,
    element("div", { class: "composer-actions" }, [
      element("span", { class: "hint", text: `${isMac ? "⌘" : "Ctrl"} + Enter` }),
      element("button", { class: "button", type: "button", text: "Cancel", onclick: closeComposer }),
      save,
    ]),
  ]);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = textarea.value.trim();
    if (!body) return textarea.focus();
    save.disabled = true;
    try {
      await state.store.create({ anchor, location, quote, body });
      closeComposer();
      await refreshComments(true);
    } catch (error) {
      save.disabled = false;
      toast(`Comment not saved: ${error.message}`);
    }
  });
  form.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeComposer();
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) form.requestSubmit();
  });
  document.body.append(form);
  placeNear(form, rect);
  state.composer = form;
  textarea.focus({ preventScroll: true });
}

function closeComposer() {
  state.composer?.remove();
  state.composer = null;
  if (state.staleBuild) showBanner();
}

function hideSelectAction() {
  selectAction.hidden = true;
  state.selection = null;
}

function trackSelection() {
  const selection = getSelection();
  const quote = selection?.rangeCount && !selection.isCollapsed ? collapse(selection.toString()) : "";
  const range = quote ? selection.getRangeAt(0) : null;
  const origin = range?.commonAncestorContainer;
  const target = (origin?.nodeType === Node.ELEMENT_NODE ? origin : origin?.parentElement)?.closest("[data-anchor]");
  if (!quote || !target || !design.contains(target)) {
    setTimeout(() => {
      if (!collapse(getSelection()?.toString())) hideSelectAction();
    }, 250);
    return;
  }
  const rect = range.getBoundingClientRect();
  state.selection = { anchor: target.dataset.anchor, quote, rect };
  selectAction.hidden = false;
  const left = Math.min(Math.max(12, rect.right - selectAction.offsetWidth), innerWidth - selectAction.offsetWidth - 12);
  selectAction.style.left = `${left + scrollX}px`;
  selectAction.style.top = `${rect.bottom + scrollY + 8}px`;
}

function headOf(target) {
  return target.matches("section") ? (target.querySelector("h2") ?? target) : target;
}

function trackHover(node) {
  const target = node.closest?.("[data-anchor]");
  if (!target || !design.contains(target) || state.composer) return;
  clearTimeout(state.hideTimer);
  const candidate = node.closest(BLOCK_SELECTOR);
  const block = candidate && target.contains(candidate) ? candidate : headOf(target);
  state.hovered = { target, block };
  addAction.hidden = false;
  const box = block.getBoundingClientRect();
  const column = design.getBoundingClientRect();
  const left = narrow() ? column.right - addAction.offsetWidth : column.right + 8;
  const top = box.top + Math.max(0, (Math.min(box.height, 32) - addAction.offsetHeight) / 2);
  addAction.style.left = `${left + scrollX}px`;
  addAction.style.top = `${top + scrollY}px`;
}

function scheduleHideAdd() {
  clearTimeout(state.hideTimer);
  state.hideTimer = setTimeout(() => {
    addAction.hidden = true;
  }, 450);
}

function commentOnHovered() {
  const hovered = state.hovered;
  if (!hovered) return;
  const { target, block } = hovered;
  const quote = block === target || block === headOf(target) ? "" : truncate(collapse(block.textContent), 240);
  openComposer({ anchor: target.dataset.anchor, quote, rect: block.getBoundingClientRect() });
}

function onDiagramClick(event) {
  const figure = event.target.closest("figure.diagram");
  if (!figure || !design.contains(figure) || collapse(getSelection()?.toString())) return;
  const hit = event.target.closest(NODE_SELECTOR);
  if (!hit || !figure.contains(hit)) return;
  const node = hit.matches("rect.actor") ? hit.parentElement : hit;
  const quote = nodeLabel(node, { x: event.clientX, y: event.clientY });
  if (!quote) return;
  event.preventDefault();
  openComposer({ anchor: figure.dataset.anchor, quote, rect: node.getBoundingClientRect() });
}

function bindCommentTriggers() {
  document.body.append(selectAction, addAction);
  selectAction.addEventListener("mousedown", (event) => event.preventDefault());
  selectAction.addEventListener("click", () => state.selection && openComposer(state.selection));
  document.addEventListener("selectionchange", debounce(trackSelection, 120));
  design.addEventListener("pointerover", (event) => trackHover(event.target));
  design.addEventListener("pointerleave", scheduleHideAdd);
  design.addEventListener("click", onDiagramClick);
  addAction.addEventListener("pointerenter", () => clearTimeout(state.hideTimer));
  addAction.addEventListener("pointerleave", scheduleHideAdd);
  addAction.addEventListener("click", commentOnHovered);
}

function replyView(reply) {
  const agent = reply.author === "agent";
  return element("div", { class: `reply ${agent ? "agent" : "user"}` }, [element("span", { class: "reply-author", text: agent ? "Agent" : "You" }), element("p", { text: reply.body })]);
}

function openReply(article, comment) {
  const existing = article.querySelector(".reply-form textarea");
  if (existing) return existing.focus();
  const textarea = element("textarea", { rows: 3, placeholder: "Reply", "aria-label": "Reply" });
  const form = element("form", { class: "reply-form" }, [
    textarea,
    element("div", { class: "composer-actions" }, [
      element("button", { class: "button", type: "button", text: "Cancel", onclick: () => closeReply(form) }),
      element("button", { class: "button primary", type: "submit", text: "Reply" }),
    ]),
  ]);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const body = textarea.value.trim();
    if (body) mutate(() => state.store.reply(comment.id, body));
  });
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeReply(form);
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) form.requestSubmit();
  });
  article.querySelector(".comment-actions").before(form);
  textarea.focus();
}

function closeReply(form) {
  form.remove();
  if (state.deferred) renderPanel();
}

function commentCard(comment, present) {
  const resolved = comment.status === "resolved";
  const editable = state.store.editable(comment);
  const article = element("article", { class: `comment ${resolved ? "resolved" : "open"}`, dataset: { id: comment.id } }, [
    element("div", { class: "comment-head" }, [
      element("button", { class: "comment-location", type: "button", text: comment.location || comment.anchor, title: comment.anchor, onclick: () => reveal(comment) }),
      present ? null : element("span", { class: "tag unverified", text: "outdated" }),
      resolved ? element("span", { class: "tag added", text: "resolved" }) : null,
    ]),
    comment.quote ? element("blockquote", { text: truncate(comment.quote, 280) }) : null,
    element("p", { class: "comment-body", text: comment.body }),
    ...(comment.replies ?? []).map(replyView),
  ]);
  if (editable) {
    article.append(
      element("div", { class: "comment-actions" }, [
        state.store.mode === "server" ? element("button", { class: "button link", type: "button", text: "Reply", onclick: () => openReply(article, comment) }) : null,
        element("button", { class: "button link", type: "button", text: resolved ? "Reopen" : "Resolve", onclick: () => mutate(() => state.store.update(comment.id, { status: resolved ? "open" : "resolved" })) }),
        element("button", { class: "button link danger", type: "button", text: "Delete", onclick: () => confirm("Delete this comment?") && mutate(() => state.store.remove(comment.id)) }),
      ]),
    );
  }
  return article;
}

function emptyMessage() {
  if (state.filter === "resolved") return "No resolved comments yet.";
  if (state.filter === "all") return "No comments yet.";
  return "No open comments.";
}

function updateCounts(open) {
  for (const node of document.querySelectorAll('[data-count="open"]')) node.textContent = String(open.length);
  for (const node of document.querySelectorAll('[data-count="resolved"]')) node.textContent = String(state.comments.length - open.length);
  const perSection = new Map();
  for (const comment of open) {
    const section = anchorElement(comment.anchor)?.closest("section[data-anchor]")?.dataset.anchor;
    if (section) perSection.set(section, (perSection.get(section) ?? 0) + 1);
  }
  for (const link of document.querySelectorAll("#toc a")) {
    const count = perSection.get(link.dataset.section) ?? 0;
    const badge = link.querySelector(".toc-count");
    badge.hidden = count === 0;
    badge.textContent = String(count);
  }
}

function renderPanel() {
  state.deferred = false;
  const order = anchorOrder();
  const open = state.comments.filter((comment) => comment.status !== "resolved");
  updateCounts(open);
  for (const tab of panel.querySelectorAll("[data-filter]")) tab.setAttribute("aria-selected", String(tab.dataset.filter === state.filter));
  const visible = state.comments.filter((comment) => state.filter === "all" || (state.filter === "resolved") === (comment.status === "resolved"));
  visible.sort((a, b) => (order.get(a.anchor) ?? Infinity) - (order.get(b.anchor) ?? Infinity) || String(a.createdAt).localeCompare(String(b.createdAt)));
  list.replaceChildren(...(visible.length ? visible.map((comment) => commentCard(comment, order.has(comment.anchor))) : [element("p", { class: "empty", text: emptyMessage() })]));
}

function paintHighlights() {
  for (const node of design.querySelectorAll(".has-comments")) node.classList.remove("has-comments");
  const ranges = [];
  for (const comment of state.comments) {
    if (comment.status === "resolved") continue;
    const target = anchorElement(comment.anchor);
    if (!target) continue;
    const node = target.matches("figure.diagram") && comment.quote ? diagramNode(target, comment.quote) : null;
    if (node) {
      node.classList.add("has-comments");
      continue;
    }
    const range = comment.quote ? textRange(target, comment.quote) : null;
    if (range) ranges.push(range);
    target.classList.add("has-comments");
  }
  if (globalThis.Highlight && CSS.highlights) CSS.highlights.set("review-quote", new Highlight(...ranges));
}

function panelBusy() {
  return [...panel.querySelectorAll(".reply-form textarea")].some((area) => area.value.trim() || document.activeElement === area);
}

async function refreshComments(force = false) {
  const { comments, version } = await state.store.load();
  state.comments = Array.isArray(comments) ? comments : [];
  state.commentsVersion = version;
  if (!force && panelBusy()) state.deferred = true;
  else renderPanel();
  paintHighlights();
}

async function mutate(action) {
  try {
    await action();
    await refreshComments(true);
  } catch (error) {
    toast(`Not saved: ${error.message}`);
  }
}

function flash(node) {
  node.classList.remove("flash");
  void node.getBoundingClientRect();
  node.classList.add("flash");
  setTimeout(() => node.classList.remove("flash"), 1700);
}

function reveal(comment) {
  const target = anchorElement(comment.anchor);
  if (!target) return toast("This part of the design is no longer on the page.");
  const node = target.matches("figure.diagram") && comment.quote ? diagramNode(target, comment.quote) : null;
  const range = !node && comment.quote ? textRange(target, comment.quote) : null;
  const focus = node ?? range?.startContainer.parentElement?.closest(BLOCK_SELECTOR) ?? target;
  if (narrow()) setPanelOpen(false);
  focus.scrollIntoView({ behavior: "smooth", block: "center" });
  flash(focus);
}

function setPanelOpen(open) {
  panel.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const node = element("div", { class: "toast", role: "status", text: message });
  document.body.append(node);
  setTimeout(() => node.remove(), 3600);
}

function showBanner() {
  if (document.querySelector(".banner")) return;
  document.body.append(element("div", { class: "banner", role: "status" }, [element("span", { text: "A new build of this design is ready." }), element("button", { class: "button primary", type: "button", text: "Reload", onclick: reloadKeepingScroll })]));
}

function reloadKeepingScroll() {
  try {
    sessionStorage.setItem(scrollKey, String(scrollY));
  } catch {}
  location.reload();
}

function restoreScroll() {
  try {
    const saved = sessionStorage.getItem(scrollKey);
    if (saved === null) return;
    sessionStorage.removeItem(scrollKey);
    scrollTo(0, Number(saved));
  } catch {}
}

function renderMode() {
  const offline = state.store.mode === "server" && !state.online;
  if (state.store.mode === "local") modeLine.textContent = "Opened without the design server: new comments stay in this browser. Copy them and paste them in the chat.";
  else if (offline) modeLine.textContent = "The design server stopped. New comments cannot be saved until it runs again.";
  else modeLine.textContent = "Comments are saved into this design file. Tell the agent in the chat when you finish.";
  modeLine.classList.toggle("offline", offline);
}

function setOnline(online) {
  if (state.online === online) return;
  state.online = online;
  renderMode();
}

function onNewBuild() {
  if (state.composer || panelBusy()) {
    state.staleBuild = true;
    return showBanner();
  }
  reloadKeepingScroll();
}

function poll() {
  setInterval(async () => {
    try {
      const version = await request("GET", "/api/version");
      setOnline(true);
      if (version.build && version.build !== build) return onNewBuild();
      if (version.comments !== state.commentsVersion) await refreshComments();
      else if (state.deferred && !panelBusy()) renderPanel();
    } catch {
      setOnline(false);
    }
  }, POLL_INTERVAL);
}

function commentsMarkdown() {
  const open = state.comments.filter((comment) => comment.status !== "resolved");
  if (!open.length) return `No open comments on "${document.title}".`;
  const lines = [`Open review comments on "${document.title}" (${slug}):`];
  for (const comment of open) {
    lines.push("", `- [${comment.id}] ${comment.location || comment.anchor}`, `  anchor: ${comment.anchor}`);
    if (comment.quote) lines.push(`  quote: ${comment.quote}`);
    lines.push(`  comment: ${comment.body.replace(/\n/g, "\n    ")}`);
    for (const reply of comment.replies ?? []) lines.push(`  ${reply.author}: ${reply.body.replace(/\n/g, "\n    ")}`);
  }
  return lines.join("\n");
}

async function copyComments() {
  const text = commentsMarkdown();
  try {
    await navigator.clipboard.writeText(text);
    toast("Open comments copied as Markdown.");
  } catch {
    const area = element("textarea", { "aria-hidden": "true", style: "position:fixed;opacity:0" });
    area.value = text;
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    toast(copied ? "Open comments copied as Markdown." : "Copy failed: select the comments in the panel instead.");
  }
}

function bindPanel() {
  for (const tab of panel.querySelectorAll("[data-filter]")) {
    tab.addEventListener("click", () => {
      state.filter = tab.dataset.filter;
      renderPanel();
    });
  }
  document.getElementById("copy-comments").addEventListener("click", copyComments);
  document.getElementById("review-close").addEventListener("click", () => setPanelOpen(false));
  toggle.addEventListener("click", () => setPanelOpen(!panel.classList.contains("open")));
}

async function boot() {
  wrapTables();
  buildToc();
  bindCommentTriggers();
  bindPanel();
  state.store = await chooseStore();
  renderMode();
  await refreshComments(true);
  const report = await renderDiagrams();
  renderPanel();
  paintHighlights();
  restoreScroll();
  if (state.store.mode !== "server") return;
  request("POST", "/api/render", report).catch(() => {});
  poll();
}

boot();
