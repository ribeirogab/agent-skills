const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const POLL_INTERVAL = 2000;
const NODE_SELECTOR = "g.node, g.cluster, g.edgeLabel, g.note, rect.actor, text.actor, text.messageText, text.noteText";
const BLOCK_SELECTOR = "td, th, li, p, h1, h2, h3, h4, dt, dd, pre, blockquote, aside, summary, .card";
const TERM_SKIP = "code, pre, script, h1, h2, h3, dl.terms, summary, a, .term, .sd-ui";
const MARK_SKIP = "script, figure, .sd-ui, .ask-mark, .lesson-term";
const TERM_TIP_WIDTH = 380;
const NAMED_KINDS = new Set(["file", "component", "entity", "column", "table", "contract", "event", "job"]);
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

const design = document.getElementById("design");
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("drawer-backdrop");
const drawerList = document.getElementById("drawer-list");
const drawerMode = document.getElementById("drawer-mode");
const modeButton = document.getElementById("comment-mode");
const explainButton = document.getElementById("explain-mode");
const listButton = document.getElementById("comments-list");
const lessonsButton = document.getElementById("lessons-list");
const themeButton = document.getElementById("theme-toggle");
const reader = document.getElementById("reader");
const readerResize = document.getElementById("reader-resize");
const selectionChip = document.getElementById("selection-chip");
const THEME_KEY = "show-design:theme";
const SUN = "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1";
const MOON = "M13 9.6A5.5 5.5 0 0 1 6.4 3a5.5 5.5 0 1 0 6.6 6.6z";
const { slug, build } = document.body.dataset;
const storageKey = `show-design:${slug}:comments`;
const lessonsKey = `show-design:${slug}:lessons`;
const READER_WIDTH_KEY = "show-design:reader-width";
const READER_WIDTH = 560;
const scrollKey = `show-design:${slug}:scroll`;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const pinLayer = element("div", { class: "sd-ui pin-layer" });

const state = {
  store: null,
  comments: [],
  commentsVersion: null,
  filter: "open",
  mode: null,
  lessons: [],
  nav: null,
  selection: null,
  askMarks: new Map(),
  popover: null,
  hovered: null,
  focused: null,
  viewer: null,
  online: true,
  staleBuild: false,
  figures: [],
  renders: 0,
  mermaid: null,
};

function element(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
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
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const darkScheme = () => (document.documentElement.dataset.theme ?? (systemDark.matches ? "dark" : "light")) === "dark";
const icon = (path) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${path}"/></svg>`;

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
    this.edit(id, (comment) => ({ ...comment, status: "open", replies: [...comment.replies, { author: "user", body, createdAt: timestamp() }] }));
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

const CHANGE_MARKS = { added: "+", changed: "~", removed: "−", moved: "→" };
const BLOCK_LABELS = [
  ["dl.terms", "Terms"],
  ["ol.decisions", "Decisions"],
];

function addBlockLabels() {
  for (const [selector, label] of BLOCK_LABELS) {
    for (const block of design.querySelectorAll(selector)) {
      if (block.previousElementSibling?.matches("h3, .block-label")) continue;
      block.before(element("p", { class: "sd-ui block-label", text: label }));
    }
  }
}

function addChangeLegends() {
  for (const section of sections()) {
    const kinds = new Set([...section.querySelectorAll("[data-change]")].map((node) => node.dataset.change));
    const shown = Object.keys(CHANGE_MARKS).filter((kind) => kinds.has(kind));
    if (!shown.length) continue;
    const legend = element("p", { class: "sd-ui change-legend" }, shown.map((kind) => element("span", {}, [element("b", { class: kind, text: CHANGE_MARKS[kind] }), kind])));
    (section.querySelector(":scope > h2 + .takeaway") ?? section.querySelector("h2"))?.after(legend);
  }
}

const CHEVRON = "M6 3.5 10.5 8 6 12.5";
const FOLD_ALL = "M4.5 2.5 8 6l3.5-3.5M4.5 13.5 8 10l3.5 3.5";
const UNFOLD_ALL = "M4.5 6 8 2.5 11.5 6M4.5 10 8 13.5 11.5 10";

function changeSummary(node, extra = "") {
  const counts = {};
  for (const entry of node.querySelectorAll("li[data-change]")) counts[entry.dataset.change] = (counts[entry.dataset.change] ?? 0) + 1;
  const parts = Object.entries(CHANGE_MARKS)
    .filter(([kind]) => counts[kind])
    .map(([kind, mark]) => element("span", { class: kind, text: `${mark}${counts[kind]}` }));
  return element("span", { class: `sd-ui tree-summary ${extra}`.trim() }, parts);
}

function treeDepth(item, tree) {
  let depth = 0;
  for (let node = item.parentElement; node !== tree; node = node.parentElement) {
    if (node.matches("li")) depth += 1;
  }
  return depth;
}

function addTreeRow(item, depth) {
  const folder = item.classList.contains("dir");
  const name = collapse(item.querySelector(":scope > code")?.textContent);
  const row = element("div", { class: "tree-row", style: `--depth: ${depth}` }, [...item.childNodes].filter((child) => !(child instanceof HTMLUListElement)));
  const lead = folder
    ? element("button", { class: "sd-ui tree-toggle", type: "button", "aria-expanded": "true", "aria-label": `Toggle ${name}`, html: icon(CHEVRON) })
    : element("span", { class: "tree-spacer" });
  row.prepend(element("span", { class: "tree-indent" }), lead);
  item.prepend(row);
  if (!folder) return;
  item.classList.add("tree-folder");
  row.append(changeSummary(item));
}

const toggleOf = (folder) => folder.querySelector(":scope > .tree-row > .tree-toggle");

function setFolded(folder, folded, deep = false) {
  for (const target of deep ? [folder, ...folder.querySelectorAll(".tree-folder")] : [folder]) {
    target.classList.toggle("folded", folded);
    toggleOf(target).setAttribute("aria-expanded", String(!folded));
  }
}

function foldedAncestors(node) {
  const folders = [];
  for (let folder = node?.closest?.(".tree-folder.folded"); folder; folder = folder.parentElement.closest(".tree-folder.folded")) folders.push(folder);
  return folders;
}

function closedDetails(node) {
  const closed = [];
  for (let details = node?.closest?.("details:not([open])"); details; details = details.parentElement.closest("details:not([open])")) closed.push(details);
  return closed;
}

function unfold(node) {
  for (const details of closedDetails(node)) details.open = true;
  for (const folder of foldedAncestors(node)) setFolded(folder, false);
}

function shownFrame(node) {
  const details = closedDetails(node).at(-1);
  if (details) return details.querySelector(":scope > summary") ?? details;
  return foldedAncestors(node).at(-1)?.querySelector(":scope > .tree-row") ?? node;
}

function onTreeClick(event) {
  const folder = event.target.closest(".tree-row")?.parentElement;
  if (!folder?.classList.contains("tree-folder")) return;
  setFolded(folder, !folder.classList.contains("folded"), event.altKey);
}

function onTreeKey(event) {
  const toggle = event.target.closest?.(".tree-toggle");
  if (!toggle || event.metaKey || event.ctrlKey || event.altKey) return;
  const folder = toggle.closest(".tree-folder");
  const folded = folder.classList.contains("folded");
  const parent = folder.parentElement.closest(".tree-folder");
  const toggles = [...event.currentTarget.querySelectorAll(".tree-toggle")].filter((node) => node.offsetParent);
  const index = toggles.indexOf(toggle);
  const moves = {
    ArrowRight: () => (folded ? setFolded(folder, false) : toggles[index + 1]?.focus()),
    ArrowLeft: () => (folded ? parent && toggleOf(parent).focus() : setFolded(folder, true)),
    ArrowDown: () => toggles[index + 1]?.focus(),
    ArrowUp: () => toggles[index - 1]?.focus(),
  };
  if (!moves[event.key]) return;
  event.preventDefault();
  moves[event.key]();
}

function treeHead(tree, frame) {
  const entries = [...tree.querySelectorAll("li:not(.dir)")];
  const [singular, plural] = entries.every((entry) => entry.dataset.anchor?.startsWith("file:")) ? ["file", "files"] : ["entry", "entries"];
  const total = element("span", { class: "tree-total" }, [`${entries.length} ${entries.length === 1 ? singular : plural}`, changeSummary(tree, "always")]);
  const foldAll = (folded) => () => {
    for (const folder of frame.querySelectorAll(".tree-folder")) setFolded(folder, folded);
  };
  const folders = tree.querySelector("li.dir")
    ? [
        tree.querySelector("li.dir li.dir") ? element("span", { class: "tree-hint", text: `${isMac ? "Option" : "Alt"}+click opens or closes every subfolder` }) : null,
        element("button", { class: "tree-action", type: "button", "aria-label": "Collapse all", "data-tip": "Collapse all", html: icon(FOLD_ALL), onclick: foldAll(true) }),
        element("button", { class: "tree-action", type: "button", "aria-label": "Expand all", "data-tip": "Expand all", html: icon(UNFOLD_ALL), onclick: foldAll(false) }),
      ]
    : [];
  return element("div", { class: "sd-ui tree-head" }, [total, ...folders]);
}

function enhanceTrees() {
  for (const tree of design.querySelectorAll("ul.tree")) {
    for (const item of tree.querySelectorAll("li")) addTreeRow(item, treeDepth(item, tree));
    const frame = element("div", { class: "tree-frame", onclick: onTreeClick, onkeydown: onTreeKey });
    tree.replaceWith(frame);
    frame.append(treeHead(tree, frame), tree);
  }
}

const CODE_RULES = [
  ["comment", /(?<![:\w/])\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
  ["property", /(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')(?=\s*:(?!:))/y],
  ["string", /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/y],
  ["property", /[A-Za-z_$][\w$-]*(?=\??\s*:(?!:))/y],
  ["keyword", /\b(?:true|false|null|undefined|const|let|var|type|interface|enum|export|import|from|return|async|await|new|extends|function)\b/y],
  ["method", /\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/y],
  ["type", /\b(?:string|number|boolean|bigint|object|any|unknown|void|never|[A-Z][A-Za-z0-9_]*)\b/y],
  ["number", /\b\d+(?:\.\d+)?\b/y],
  ["operator", /=>|→|\.\.\.|\?\?|\|\||&&|[|&?=<>!+\-*%]/y],
  ["punctuation", /[{}[\]();,.:]/y],
];

const SQL_KEYWORDS = "select|from|where|join|left|right|inner|outer|full|cross|on|as|group|by|order|having|limit|offset|distinct|union|all|with|create|or|replace|view|materialized|table|index|unique|concurrently|drop|alter|add|column|constraint|primary|foreign|key|references|default|not|null|and|is|in|exists|between|like|insert|into|values|update|set|delete|returning|case|when|then|else|end|refresh|begin|commit|true|false";
const SQL_RULES = [
  ["comment", /--[^\n]*|\/\*[\s\S]*?\*\//y],
  ["string", /'(?:''|[^'])*'/y],
  ["keyword", new RegExp(`\\b(?:${SQL_KEYWORDS})\\b`, "iy")],
  ["type", /[A-Za-z_]\w*(?=\s*\()/y],
  ["property", /(?<=\.)[A-Za-z_]\w*/y],
  ["number", /\b\d+(?:\.\d+)?\b/y],
  ["operator", /<>|!=|<=|>=|\|\||::|[=<>+\-*\/%]/y],
  ["punctuation", /[(),;.]/y],
];

function tokenize(source, rules = CODE_RULES) {
  const nodes = [];
  let plain = "";
  let position = 0;
  const flush = () => {
    if (plain) nodes.push(document.createTextNode(plain));
    plain = "";
  };
  while (position < source.length) {
    let token = null;
    for (const [kind, pattern] of rules) {
      pattern.lastIndex = position;
      const match = pattern.exec(source);
      if (match?.[0]) {
        token = { kind, text: match[0] };
        break;
      }
    }
    if (!token) {
      plain += source[position];
      position += 1;
      continue;
    }
    flush();
    nodes.push(element("span", { class: `tok-${token.kind}`, text: token.text }));
    position += token.text.length;
  }
  flush();
  return nodes;
}

function highlightCode() {
  for (const code of design.querySelectorAll("pre > code")) {
    if (code.dataset.highlighted || /\blanguage-(?:text|plain)\b/.test(code.className)) continue;
    code.replaceChildren(...tokenize(code.textContent, /\blanguage-sql\b/.test(code.className) ? SQL_RULES : CODE_RULES));
    code.dataset.highlighted = "true";
  }
}

function sections() {
  return [...design.querySelectorAll("section[data-anchor]:not(.lesson)")];
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function wordForms(word) {
  const escaped = escapeRegExp(word);
  return /ão$/i.test(word) ? `(?:${escaped}|${escaped.slice(0, -2)}ões)` : `${escaped}(?:e?s)?`;
}

function termPattern(name) {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${name.split(/\s+/).map(wordForms).join("\\s+")}(?![\\p{L}\\p{N}_])`, "iu");
}

function glossary() {
  return [...design.querySelectorAll("dl.terms > dt")]
    .map((term) => {
      const name = collapse(term.textContent.replace(/\([^)]*\)/g, ""));
      const meaning = term.nextElementSibling?.matches("dd") ? collapse(term.nextElementSibling.textContent) : "";
      return { name, meaning, pattern: termPattern(name) };
    })
    .filter((term) => term.name.length > 2 && term.meaning)
    .sort((a, b) => b.name.length - a.name.length);
}

function textNodes(root, skip) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (node) => (node.parentElement?.closest(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function wrapFirst(root, pattern, build, skip = MARK_SKIP) {
  for (const node of textNodes(root, skip)) {
    const match = pattern.exec(node.data);
    if (!match) continue;
    const word = node.splitText(match.index);
    word.splitText(match[0].length);
    const wrapper = build(word.data);
    word.replaceWith(wrapper);
    return wrapper;
  }
  return null;
}

function phrasePattern(phrase) {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(collapse(phrase)).replace(/ /g, "\\s+")}(?![\\p{L}\\p{N}_])`, "iu");
}

function markFirstUse(root, term) {
  wrapFirst(root, term.pattern, (text) => element("span", { class: "term", tabindex: 0, "data-definition": term.meaning, text }), TERM_SKIP);
}

function placeTermTip(event) {
  const term = event.target.closest?.(".term");
  if (term) term.classList.toggle("flip", term.getBoundingClientRect().left > innerWidth - TERM_TIP_WIDTH);
}

function markTerms() {
  const terms = glossary();
  if (!terms.length) return;
  for (const section of sections()) {
    for (const term of terms) markFirstUse(section, term);
  }
  design.addEventListener("pointerover", placeTermTip);
  design.addEventListener("focusin", placeTermTip);
}

function buildToc() {
  const toc = document.getElementById("toc");
  const items = sections().map((section, index) => {
    section.id ||= section.dataset.anchor.replace(/^section:/, "").replace(/[^\w-]+/g, "-") || `section-${index + 1}`;
    const title = collapse(section.querySelector("h2")?.textContent) || section.id;
    return element("li", {}, element("a", { href: `#${section.id}`, dataset: { section: section.dataset.anchor } }, [element("span", { text: title }), element("span", { class: "toc-count", hidden: true })]));
  });
  toc.replaceChildren(element("ol", {}, items));
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
  figure.canvas.replaceChildren(element("div", {}, [element("p", { class: "diagram-error", text: `Diagram failed to render: ${collapse(message)}` }), element("pre", { text: figure.source })]));
}

function addFigureTools(figure) {
  if (figure.node.querySelector(".figure-tools")) return;
  const expand = element("button", { class: "icon-button", type: "button", "aria-label": "Open diagram in the viewer", html: `${icon("M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9")}<span>Expand</span>`, onclick: () => openViewer(figure.node) });
  figure.node.append(element("div", { class: "sd-ui figure-tools" }, expand));
}

async function loadMermaid() {
  state.mermaid ??= import(MERMAID_URL).then((module) => module.default);
  return state.mermaid;
}

async function drawDiagrams() {
  const report = { build, diagrams: state.figures.length, errors: [], renderedAt: timestamp() };
  if (!state.figures.length) return report;
  let mermaid;
  try {
    mermaid = await loadMermaid();
  } catch (error) {
    state.mermaid = null;
    for (const figure of state.figures) failFigure(figure, `Mermaid did not load (${error.message})`, report);
    return report;
  }
  state.renders += 1;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: darkScheme() ? "dark" : "neutral", fontFamily: cssVar("--font") });
  for (const [index, figure] of state.figures.entries()) {
    const id = `show-design-diagram-${index}-${state.renders}`;
    try {
      await mermaid.parse(figure.source);
      const { svg, bindFunctions } = await mermaid.render(id, withChangeClasses(figure.source));
      figure.canvas.innerHTML = svg;
      bindFunctions?.(figure.canvas);
      addFigureTools(figure);
    } catch (error) {
      document.getElementById(`d${id}`)?.remove();
      failFigure(figure, error?.message ?? String(error), report);
    }
  }
  return report;
}

async function renderDiagrams() {
  state.figures = [...design.querySelectorAll('script[type="text/x-mermaid"]')].map(toFigure);
  return drawDiagrams();
}

function syncThemeButton() {
  const dark = darkScheme();
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  themeButton.innerHTML = icon(dark ? SUN : MOON);
  themeButton.dataset.tip = label;
  themeButton.setAttribute("aria-label", label);
}

async function redrawForTheme() {
  closeViewer();
  closePopover();
  syncThemeButton();
  await drawDiagrams();
  renderPins();
}

function toggleTheme() {
  const next = darkScheme() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
  redrawForTheme();
}

function anchorElement(anchor) {
  if (anchor === "page") return design;
  return design.querySelector(`[data-anchor="${CSS.escape(anchor)}"]`);
}

function labelOf(target) {
  if (target === design) return "Page";
  if (target.dataset.label) return target.dataset.label;
  const [kind, ...rest] = target.dataset.anchor.split(":");
  if (NAMED_KINDS.has(kind) && rest.length) return rest.join(":");
  if (target.matches("figure.diagram")) return target.dataset.caption || target.dataset.anchor;
  const lead = target.querySelector(":scope > h3, :scope > strong, :scope > summary, :scope > td, :scope > th, :scope > code, :scope > .tree-row > code");
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

function readableText(node) {
  const copy = node.cloneNode(true);
  for (const chrome of copy.querySelectorAll(".sd-ui")) chrome.remove();
  for (const lineBreak of copy.querySelectorAll("br")) lineBreak.replaceWith(" ");
  for (const part of copy.querySelectorAll("p, div, li, dt, dd, td, th, h1, h2, h3, h4, pre, blockquote, strong, tspan, text, .note")) {
    part.prepend(" ");
    part.append(" ");
  }
  return collapse(copy.textContent);
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
  if (!entity) return truncate(readableText(node), 160);
  const attribute = point ? attributeAt(node, point) : "";
  return attribute ? `${entity}.${attribute}` : entity;
}

function figureSvg(figure) {
  return state.viewer?.figure === figure ? state.viewer.svg : figure.querySelector(".diagram-canvas svg");
}

function resolveTarget(node, point) {
  if (!(node instanceof Element) || node.closest(".sd-ui")) return null;
  const inViewer = Boolean(state.viewer?.stage.contains(node));
  const figure = inViewer ? state.viewer.figure : node.closest("figure.diagram");
  if (figure && design.contains(figure)) {
    const svg = figureSvg(figure);
    if (!svg) return null;
    const hit = node.closest(NODE_SELECTOR);
    const diagramNode = hit && svg.contains(hit) ? (hit.matches("rect.actor") ? hit.parentElement : hit) : null;
    return { anchor: figure.dataset.anchor, highlight: diagramNode ?? svg, frame: svg, quote: diagramNode ? nodeLabel(diagramNode, point) : "", block: "", fixed: inViewer };
  }
  if (!design.contains(node)) return null;
  const anchored = node.closest("[data-anchor]") ?? design;
  const candidate = node.closest(BLOCK_SELECTOR);
  const block = candidate && anchored.contains(candidate) ? candidate : anchored;
  const whole = block === anchored && (block === design || block.matches("section"));
  const text = whole ? "" : truncate(readableText(block), 240);
  return { anchor: anchored === design ? "page" : anchored.dataset.anchor, highlight: block, frame: block, quote: text, block: truncate(text, 80), fixed: false };
}

function frameFor(comment) {
  const target = anchorElement(comment.anchor);
  if (!target) return null;
  if (target.matches("figure.diagram")) return figureSvg(target) ?? target;
  const key = comment.point?.block?.replace(/…$/, "");
  if (!key) return target;
  const matches = [target, ...target.querySelectorAll(BLOCK_SELECTOR)].filter((block) => readableText(block).startsWith(key));
  return matches.sort((a, b) => a.textContent.length - b.textContent.length)[0] ?? target;
}

function highlightFor(comment) {
  const frame = frameFor(comment);
  if (frame instanceof SVGSVGElement && comment.quote) {
    const node = [...frame.querySelectorAll(NODE_SELECTOR)].find((candidate) => {
      const label = nodeLabel(candidate);
      return label === comment.quote || (entityName(candidate) === label && comment.quote.startsWith(`${label}.`));
    });
    if (node) return node;
  }
  return frame;
}

function pointIn(frame, clientX, clientY) {
  const box = frame.getBoundingClientRect();
  const round = (value) => Math.round(clamp(value, 0, 1) * 10000) / 10000;
  return { x: round((clientX - box.left) / Math.max(box.width, 1)), y: round((clientY - box.top) / Math.max(box.height, 1)) };
}

function screenPoint(comment, frame) {
  const box = frame.getBoundingClientRect();
  const point = comment.point ?? { x: 1, y: 0 };
  return { x: box.left + point.x * box.width, y: box.top + point.y * box.height, visible: box.width > 0 || box.height > 0 };
}

const isRequest = (comment) => comment.kind === "explain";
const reviewComments = () => state.comments.filter((comment) => !isRequest(comment));
const openRequests = () => state.comments.filter((comment) => isRequest(comment) && comment.status !== "resolved");

function numbered() {
  return reviewComments().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).map((comment, index) => ({ comment, number: index + 1 }));
}

function matchesFilter(comment) {
  if (state.filter === "all") return true;
  return (state.filter === "resolved") === (comment.status === "resolved");
}

function placePin(pin, x, y, fixed) {
  pin.style.left = `${fixed ? x : x + scrollX}px`;
  pin.style.top = `${fixed ? y : y + scrollY}px`;
}

function addPin(comment, text, className, label) {
  const target = frameFor(comment);
  if (!target) return;
  const frame = shownFrame(target);
  const inViewer = Boolean(state.viewer?.stage.contains(frame));
  const { x, y, visible } = screenPoint(comment, frame);
  if (!visible) return;
  const pin = element("button", { class: `pin ${className}`, type: "button", text, title: truncate(collapse(comment.body), 80), "aria-label": label, dataset: { id: comment.id } });
  pin.classList.toggle("active", state.popover?.dataset.id === comment.id);
  pin.addEventListener("click", (event) => {
    event.stopPropagation();
    openThread(comment);
  });
  placePin(pin, inViewer ? x : clamp(x, 0, document.documentElement.clientWidth - 24), y, inViewer);
  (inViewer ? state.viewer.pins : pinLayer).append(pin);
}

function renderPins() {
  pinLayer.replaceChildren();
  state.viewer?.pins.replaceChildren();
  for (const { comment, number } of numbered()) {
    if (matchesFilter(comment)) addPin(comment, String(number), comment.status === "resolved" ? "resolved" : "open", `Comment ${number}`);
  }
  for (const request of openRequests()) {
    if (!state.askMarks.get(request.id)?.isConnected) addPin(request, "?", "ask", "Explanation request");
  }
}

function setHighlight(kind, node) {
  const className = kind === "hover" ? "comment-target" : "focus-target";
  const key = kind === "hover" ? "hovered" : "focused";
  if (state[key] === node) return;
  state[key]?.classList.remove(className);
  state[key] = node;
  node?.classList.add(className);
}

function placePopover(node, clientX, clientY, fixed) {
  node.classList.toggle("fixed", fixed);
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const right = drawer.classList.contains("open") && innerWidth > 720 ? drawer.getBoundingClientRect().left : innerWidth;
  const left = clamp(clientX + 12, 12, right - width - 12);
  const top = clientY + 12 + height < innerHeight - 12 ? clientY + 12 : Math.max(12, clientY - height - 12);
  node.style.left = `${fixed ? left : left + scrollX}px`;
  node.style.top = `${fixed ? top : top + scrollY}px`;
}

function closePopover() {
  state.popover?.remove();
  state.popover = null;
  for (const draft of document.querySelectorAll(".pin.draft")) draft.remove();
  document.body.classList.remove("explain-draft");
  setHighlight("focus", null);
  renderPins();
  if (state.staleBuild) showBanner();
}

const SEND = "M8 12.5v-9M4.5 7 8 3.5 11.5 7";
const CHECK = "M3.5 8.5l3 3 6-7";
const TRASH = "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5";
const CLOSE = "M4.5 4.5l7 7M11.5 4.5l-7 7";

function ghostButton(label, path, onclick, extra = "") {
  return element("button", { class: `ghost-button ${extra}`.trim(), type: "button", "data-tip": label, "aria-label": label, html: icon(path), onclick });
}

function inputBox(placeholder, onSubmit) {
  const textarea = element("textarea", { rows: 1, placeholder, "aria-label": placeholder });
  const send = element("button", { class: "send", type: "submit", "data-tip": "Send", "aria-label": "Send", html: icon(SEND), disabled: true });
  const form = element("form", { class: "input-box" }, [textarea, send]);
  const refresh = () => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
    send.disabled = !textarea.value.trim();
  };
  textarea.addEventListener("input", refresh);
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = textarea.value.trim();
    if (!body || send.disabled) return;
    send.disabled = true;
    textarea.readOnly = true;
    if (await onSubmit(body)) return;
    textarea.readOnly = false;
    refresh();
    textarea.focus();
  });
  return { form, textarea };
}

function closeOnEscape(card) {
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    closePopover();
  });
}

function openComposer(target, clientX, clientY, kind = state.mode ?? "comment") {
  closePopover();
  const explain = kind === "explain";
  const location = locate(target.anchor);
  const range = getSelection()?.rangeCount ? getSelection().getRangeAt(0) : null;
  const selection = range && target.frame.contains(range.commonAncestorContainer) ? collapse(range.toString()) : "";
  const quote = selection ? truncate(selection, 400) : target.quote;
  const point = pointIn(target.frame, clientX, clientY);
  const { form, textarea } = inputBox(explain ? "What do you want to understand?" : "Add a comment", async (body) => {
    try {
      await state.store.create({ anchor: target.anchor, location, quote, body, point: { ...point, block: target.block }, ...(explain ? { kind } : {}) });
      closePopover();
      getSelection()?.removeAllRanges();
      await refreshComments();
      return true;
    } catch (error) {
      toast(`${explain ? "Request" : "Comment"} not saved: ${error.message}`);
      return false;
    }
  });
  const card = element("div", { class: `sd-ui popover compact${explain ? " explain" : ""}`, role: "dialog", "aria-label": `${explain ? "New explanation request" : "New comment"} on ${location}`, dataset: { kind: "composer" } }, form);
  closeOnEscape(card);
  document.body.classList.toggle("explain-draft", explain);
  const draft = element("span", { class: `sd-ui pin draft${explain ? " ask" : ""}`, text: explain ? "?" : "+" });
  (target.fixed ? state.viewer.overlay : document.body).append(card);
  placePin(draft, clientX, clientY, target.fixed);
  (target.fixed ? state.viewer.pins : pinLayer).append(draft);
  placePopover(card, clientX, clientY, target.fixed);
  state.popover = card;
  setHighlight("focus", target.highlight);
  textarea.focus({ preventScroll: true });
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function messageView(message) {
  const agent = message.author === "agent";
  return element("div", { class: `message ${agent ? "agent" : "user"}` }, [
    element("div", { class: "message-head" }, [element("span", { class: "message-author", text: agent ? "Agent" : "You" }), element("span", { class: "message-time", text: formatTime(message.createdAt) })]),
    element("p", { class: "comment-body", text: message.body }),
  ]);
}

async function mutate(action, after) {
  try {
    await action();
    await refreshComments();
    after?.();
  } catch (error) {
    toast(`Not saved: ${error.message}`);
  }
}

function threadTitle(comment) {
  const location = comment.location || comment.anchor;
  if (isRequest(comment)) return `? · ${location} · ${comment.lesson ? "answered" : comment.status === "resolved" ? "resolved" : "waiting for a lesson"}`;
  const number = numbered().find((entry) => entry.comment.id === comment.id)?.number;
  return `#${number} · ${location}${comment.status === "resolved" ? " · resolved" : ""}`;
}

function openThread(comment) {
  closePopover();
  const frame = frameFor(comment);
  if (!frame) return;
  unfold(frame);
  const fixed = Boolean(state.viewer?.stage.contains(frame));
  const resolved = comment.status === "resolved";
  const editable = state.store.editable(comment);
  const messages = [{ author: "user", body: comment.body, createdAt: comment.createdAt }, ...(comment.replies ?? [])];
  const tools = editable
    ? [
        ghostButton(resolved ? "Reopen" : "Resolve", CHECK, () => mutate(() => state.store.update(comment.id, { status: resolved ? "open" : "resolved" }), closePopover), resolved ? "active" : ""),
        ghostButton("Delete", TRASH, () => confirm("Delete this comment and its replies?") && mutate(() => state.store.remove(comment.id), closePopover), "danger"),
      ]
    : [];
  const reply = editable
    ? inputBox(resolved ? "Reply to reopen" : "Reply", async (body) => {
        try {
          await state.store.reply(comment.id, body);
          await refreshComments();
          reopenThread(comment.id);
          return true;
        } catch (error) {
          toast(`Reply not saved: ${error.message}`);
          return false;
        }
      })
    : null;
  const lesson = comment.lesson ? lessonByAnchor(comment.lesson) : null;
  const openLessonButton = lesson ? element("button", { class: "button open-lesson", type: "button", onclick: () => openLesson(lesson) }, [element("span", { class: "button-icon", html: icon(BOOK) }), "Open lesson"]) : null;
  const card = element("div", { class: `sd-ui popover thread-card${isRequest(comment) ? " explain" : ""}`, role: "dialog", "aria-label": isRequest(comment) ? "Explanation request" : "Comment", dataset: { id: comment.id } }, [
    element("div", { class: "popover-head" }, [element("div", { class: "popover-location", text: threadTitle(comment) }), ...tools, ghostButton("Close", CLOSE, closePopover)]),
    element("div", { class: "thread" }, messages.map(messageView)),
    openLessonButton,
    reply?.form ?? null,
  ]);
  closeOnEscape(card);
  (fixed ? state.viewer.overlay : document.body).append(card);
  const { x, y } = screenPoint(comment, frame);
  placePopover(card, x, y, fixed);
  state.popover = card;
  setHighlight("focus", highlightFor(comment));
  renderPins();
}

function reopenThread(id) {
  const comment = state.comments.find((candidate) => candidate.id === id);
  if (comment) openThread(comment);
}

function revealComment(comment) {
  const frame = frameFor(comment);
  if (!frame) return toast("This part of the design is no longer on the page.");
  unfold(frame);
  if (!matchesFilter(comment)) setFilter("all");
  setDrawer(false);
  if (!state.viewer?.stage.contains(frame)) {
    const focus = frame instanceof SVGSVGElement ? frame.closest("figure") : frame;
    focus.scrollIntoView({ block: "center" });
  }
  renderPins();
  reopenThread(comment.id);
}

function setFilter(filter) {
  state.filter = filter;
  renderDrawer();
  renderPins();
}

function renderDrawer() {
  const comments = reviewComments();
  const open = comments.filter((comment) => comment.status !== "resolved");
  for (const node of document.querySelectorAll('[data-count="open"]')) node.textContent = String(open.length);
  for (const node of document.querySelectorAll('[data-count="resolved"]')) node.textContent = String(comments.length - open.length);
  for (const tab of drawer.querySelectorAll("[data-filter]")) tab.setAttribute("aria-selected", String(tab.dataset.filter === state.filter));
  const items = numbered().filter(({ comment }) => matchesFilter(comment));
  drawerList.replaceChildren(
    ...(items.length
      ? items.map(({ comment, number }) =>
          element("button", { class: "drawer-item", type: "button", onclick: () => revealComment(comment) }, [
            element("span", { class: "drawer-item-head" }, [element("span", { class: `pin ${comment.status === "resolved" ? "resolved" : "open"}`, text: String(number) }), element("span", { text: comment.location || comment.anchor })]),
            comment.quote ? element("blockquote", { text: truncate(comment.quote, 140) }) : null,
            element("p", { class: "comment-body", text: comment.body }),
            comment.replies?.length ? element("span", { class: "status-line", text: `${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}` }) : null,
          ]),
        )
      : [element("p", { class: "empty", text: state.filter === "resolved" ? "No resolved comments." : state.filter === "all" ? "No comments yet. Turn on Comment and click anywhere on the page." : "No open comments." })]),
  );
  const perSection = new Map();
  for (const comment of open) {
    const section = anchorElement(comment.anchor)?.closest("section[data-anchor]")?.dataset.anchor;
    if (section) perSection.set(section, (perSection.get(section) ?? 0) + 1);
  }
  for (const link of document.querySelectorAll("#toc a")) {
    const badge = link.querySelector(".toc-count");
    const count = perSection.get(link.dataset.section) ?? 0;
    badge.hidden = count === 0;
    badge.textContent = String(count);
  }
}

function setDrawer(open) {
  if (open === drawer.classList.contains("open")) return;
  if (open) closePopover();
  drawer.classList.toggle("open", open);
  backdrop.classList.toggle("open", open);
  listButton.setAttribute("aria-expanded", String(open));
  document.documentElement.style.overflow = open ? "hidden" : "";
  if (open) document.getElementById("drawer-close").focus({ preventScroll: true });
  else if (drawer.contains(document.activeElement)) listButton.focus({ preventScroll: true });
}

const MODE_HINTS = { comment: "Click anywhere to comment · Esc to stop", explain: "Click or select what you want explained · Esc to stop" };

function setMode(mode) {
  state.mode = mode;
  document.body.classList.toggle("commenting", Boolean(mode));
  document.body.classList.toggle("explaining", mode === "explain");
  modeButton.setAttribute("aria-pressed", String(mode === "comment"));
  explainButton.setAttribute("aria-pressed", String(mode === "explain"));
  document.querySelector(".mode-hint")?.remove();
  if (mode) document.body.append(element("div", { class: "sd-ui mode-hint", text: MODE_HINTS[mode] }));
  else setHighlight("hover", null);
  hideSelectionChip();
  syncViewerToggle();
}

function toggleMode(mode) {
  setMode(state.mode === mode ? null : mode);
}

function onPointerMove(event) {
  if (!state.mode || state.popover || state.viewer?.dragging) return setHighlight("hover", null);
  const target = resolveTarget(event.target, { x: event.clientX, y: event.clientY });
  setHighlight("hover", target?.highlight ?? null);
}

function consume(event) {
  event.preventDefault();
  event.stopPropagation();
}

function closeFromOutside(event, target) {
  const popover = state.popover;
  if (!popover || popover.contains(event.target) || event.target.closest?.(".pin")) return false;
  const field = popover.querySelector("textarea");
  if (field?.value.trim()) {
    consume(event);
    field.focus();
    return true;
  }
  closePopover();
  if (state.mode && target) consume(event);
  return true;
}

function onClick(event) {
  if (event.button !== 0) return;
  if (state.viewer?.moved) {
    state.viewer.moved = false;
    return;
  }
  const hit = state.viewer ? document.elementFromPoint(event.clientX, event.clientY) : event.target;
  const target = state.mode ? resolveTarget(hit, { x: event.clientX, y: event.clientY }) : null;
  if (closeFromOutside(event, target) || !target) return;
  consume(event);
  setHighlight("hover", null);
  openComposer(target, event.clientX, event.clientY);
}

function naturalSize(svg) {
  const box = svg.viewBox?.baseVal;
  if (box?.width && box?.height) return { width: box.width, height: box.height };
  const rect = svg.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function applyViewer() {
  const viewer = state.viewer;
  viewer.stage.style.transform = `translate(${viewer.x}px, ${viewer.y}px) scale(${viewer.k})`;
  viewer.zoomLabel.textContent = `${Math.round(viewer.k * 100)}%`;
  renderPins();
  repositionThread();
}

function repositionThread() {
  const id = state.popover?.dataset.id;
  const comment = id && state.comments.find((candidate) => candidate.id === id);
  const frame = comment && frameFor(comment);
  if (!frame) return;
  const { x, y } = screenPoint(comment, frame);
  placePopover(state.popover, x, y, state.popover.classList.contains("fixed"));
}

function zoomAt(factor, clientX, clientY) {
  const viewer = state.viewer;
  const next = clamp(viewer.k * factor, MIN_ZOOM, MAX_ZOOM);
  viewer.x = clientX - (clientX - viewer.x) * (next / viewer.k);
  viewer.y = clientY - (clientY - viewer.y) * (next / viewer.k);
  viewer.k = next;
  applyViewer();
}

function fitViewer(actual = false) {
  const viewer = state.viewer;
  const { width, height } = naturalSize(viewer.svg);
  const k = actual ? 1 : clamp(Math.min((innerWidth - 80) / width, (innerHeight - 140) / height), MIN_ZOOM, MAX_ZOOM);
  viewer.k = k;
  viewer.x = (innerWidth - width * k) / 2;
  viewer.y = Math.max(70, (innerHeight - height * k) / 2);
  applyViewer();
}

function openViewer(figure) {
  const svg = figure.querySelector(".diagram-canvas svg");
  if (!svg || state.viewer) return;
  closePopover();
  const { width, height } = naturalSize(svg);
  const canvas = svg.parentElement;
  const saved = { width: svg.getAttribute("width"), height: svg.getAttribute("height"), style: svg.getAttribute("style") };
  const stage = element("div", { class: "viewer-stage" });
  const pins = element("div", { class: "sd-ui viewer-pins" });
  const zoomLabel = element("span", { class: "viewer-zoom", text: "100%" });
  const button = (label, html, onclick) => element("button", { class: "icon-button", type: "button", "data-tip": label, "aria-label": label, html, onclick });
  const center = () => [innerWidth / 2, innerHeight / 2];
  const commentToggle = button("Comment mode (C)", icon("M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"), () => toggleMode("comment"));
  const toolbar = element("div", { class: "sd-ui viewer-toolbar" }, [
    element("span", { class: "viewer-title", text: figure.dataset.caption || figure.dataset.anchor }),
    element("span", { class: "viewer-separator" }),
    button("Zoom out (−)", icon("M3.5 8h9"), () => zoomAt(1 / 1.25, ...center())),
    zoomLabel,
    button("Zoom in (+)", icon("M3.5 8h9M8 3.5v9"), () => zoomAt(1.25, ...center())),
    button("Fit to screen (0)", icon("M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"), () => fitViewer()),
    button("Actual size (1)", "<span>1:1</span>", () => fitViewer(true)),
    element("span", { class: "viewer-separator" }),
    commentToggle,
    button("Close (Esc)", icon("M4 4l8 8M12 4l-8 8"), closeViewer),
  ]);
  const overlay = element("div", { class: "viewer", role: "dialog", "aria-modal": "true", "aria-label": figure.dataset.caption || "Diagram" }, [stage, pins, toolbar, element("div", { class: "viewer-hint", text: `Drag to pan · pinch or ${isMac ? "⌘" : "Ctrl"} + scroll to zoom · Esc to close` })]);
  svg.style.maxWidth = "none";
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  stage.append(svg);
  canvas.append(element("div", { class: "diagram-placeholder", text: "Open in the viewer" }));
  document.body.append(overlay);
  document.documentElement.style.overflow = "hidden";
  state.viewer = { figure, svg, canvas, saved, overlay, stage, pins, zoomLabel, commentToggle, k: 1, x: 0, y: 0, pointers: new Map(), dragging: false, moved: false };
  syncViewerToggle();
  bindViewerGestures(overlay);
  fitViewer();
}

function syncViewerToggle() {
  state.viewer?.commentToggle.setAttribute("aria-pressed", String(state.mode === "comment"));
  if (state.viewer) state.viewer.commentToggle.style.color = state.mode === "comment" ? "var(--accent)" : "";
}

function closeViewer() {
  const viewer = state.viewer;
  if (!viewer) return;
  closePopover();
  for (const [name, value] of Object.entries(viewer.saved)) {
    if (value === null) viewer.svg.removeAttribute(name);
    else viewer.svg.setAttribute(name, value);
  }
  viewer.canvas.replaceChildren(viewer.svg);
  viewer.overlay.remove();
  document.documentElement.style.overflow = "";
  state.viewer = null;
  renderPins();
}

function bindViewerGestures(overlay) {
  const viewer = state.viewer;
  let start = null;
  let pinch = null;
  overlay.addEventListener(
    "wheel",
    (event) => {
      if (event.target.closest(".popover")) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
      else {
        viewer.x -= event.deltaX;
        viewer.y -= event.deltaY;
        applyViewer();
      }
    },
    { passive: false },
  );
  overlay.addEventListener("gesturestart", (event) => {
    event.preventDefault();
    pinch = { k: viewer.k };
  });
  overlay.addEventListener("gesturechange", (event) => {
    event.preventDefault();
    if (pinch) zoomAt((pinch.k * event.scale) / viewer.k, event.clientX, event.clientY);
  });
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".sd-ui")) return;
    event.preventDefault();
    getSelection()?.removeAllRanges();
    viewer.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    start = { x: event.clientX, y: event.clientY, vx: viewer.x, vy: viewer.y };
    viewer.moved = false;
  });
  overlay.addEventListener("pointermove", (event) => {
    if (!viewer.pointers.has(event.pointerId)) return;
    const previous = viewer.pointers.get(event.pointerId);
    viewer.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (viewer.pointers.size === 2) {
      const [a, b] = [...viewer.pointers.values()];
      const other = [...viewer.pointers.entries()].find(([id]) => id !== event.pointerId)[1];
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(a.x - b.x, a.y - b.y);
      if (before > 0) zoomAt(after / before, (a.x + b.x) / 2, (a.y + b.y) / 2);
      viewer.moved = true;
      return;
    }
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!viewer.dragging && Math.hypot(dx, dy) < 4) return;
    if (!viewer.dragging) overlay.setPointerCapture(event.pointerId);
    viewer.dragging = true;
    viewer.moved = true;
    overlay.classList.add("dragging");
    viewer.x = start.vx + dx;
    viewer.y = start.vy + dy;
    applyViewer();
  });
  const release = (event) => {
    viewer.pointers.delete(event.pointerId);
    if (viewer.pointers.size === 0) {
      start = null;
      viewer.dragging = false;
      overlay.classList.remove("dragging");
    }
  };
  overlay.addEventListener("pointerup", release);
  overlay.addEventListener("pointercancel", release);
}

const BOOK = "M8 4.6C6.7 3.6 4.9 3.2 2.5 3.4v8.8c2.4-.2 4.2.2 5.5 1.2 1.3-1 3.1-1.4 5.5-1.2V3.4c-2.4-.2-4.2.2-5.5 1.2zM8 4.6v8.8";
const ASK = "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM6.2 6.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.5M8 11.4v.1";
const BACK = "M6 3.5 2.5 7 6 10.5M2.5 7H10a3.5 3.5 0 0 1 0 7H8.5";
const LIST = "M3 4.5h10M3 8h10M3 11.5h6";
const PREVIOUS = "M10 3.5 5.5 8l4.5 4.5";

function unwrap(node) {
  const parent = node.parentNode;
  node.replaceWith(...[...node.childNodes].filter((child) => !(child instanceof Element && child.matches(".sd-ui"))));
  parent?.normalize();
}

function markRequests() {
  for (const mark of state.askMarks.values()) if (mark.isConnected) unwrap(mark);
  state.askMarks.clear();
  for (const request of openRequests()) {
    const quote = collapse(request.quote);
    const root = anchorElement(request.anchor);
    if (!root || !quote || quote.length > 60 || root.closest("section.lesson")) continue;
    const mark = wrapFirst(root, phrasePattern(quote), (text) => element("span", { class: "ask-mark", tabindex: 0, title: "Waiting for a lesson", dataset: { id: request.id }, text }));
    if (mark) state.askMarks.set(request.id, mark);
  }
}

function onDesignClick(event) {
  const mark = event.target.closest?.(".ask-mark");
  if (!mark || state.mode) return;
  const request = state.comments.find((comment) => comment.id === mark.dataset.id);
  if (request) openThread(request);
}

function hideSelectionChip() {
  selectionChip.hidden = true;
  state.selection = null;
}

function syncSelectionChip() {
  const selection = getSelection();
  const range = selection?.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0) : null;
  const text = collapse(range?.toString());
  const container = range?.commonAncestorContainer;
  const node = container?.nodeType === Node.ELEMENT_NODE ? container : container?.parentElement;
  if (!text || text.length > 160 || state.mode || state.popover || !node || !design.contains(node) || node.closest(".sd-ui")) return hideSelectionChip();
  const box = range.getBoundingClientRect();
  selectionChip.hidden = false;
  selectionChip.style.left = `${box.left + box.width / 2 + scrollX}px`;
  selectionChip.style.top = `${box.top + scrollY}px`;
  state.selection = { range: range.cloneRange(), node };
}

function explainSelection(event) {
  event.stopPropagation();
  const picked = state.selection;
  hideSelectionChip();
  if (!picked) return;
  const box = picked.range.getBoundingClientRect();
  const target = resolveTarget(picked.node, { x: box.left, y: box.top });
  if (target) openComposer(target, box.left, box.bottom, "explain");
}

function collectLessons() {
  state.lessons = [...design.querySelectorAll("section.lesson[data-anchor]")].map((section) => ({
    section,
    anchor: section.dataset.anchor,
    title: collapse(section.querySelector(":scope > h2")?.textContent) || section.dataset.anchor,
    source: section.dataset.lessonFor || "page",
    term: collapse(section.dataset.lessonTerm),
    marker: null,
    views: null,
  }));
  for (const node of document.querySelectorAll('[data-count="lessons"]')) node.textContent = String(state.lessons.length);
}

const lessonByAnchor = (anchor) => state.lessons.find((lesson) => lesson.anchor === anchor);
const requestFor = (lesson) => state.comments.find((comment) => isRequest(comment) && comment.lesson === lesson.anchor);

function lessonScores() {
  try {
    return JSON.parse(localStorage.getItem(lessonsKey) ?? "{}");
  } catch {
    return {};
  }
}

function saveLessonScore(anchor, score) {
  try {
    localStorage.setItem(lessonsKey, JSON.stringify({ ...lessonScores(), [anchor]: score }));
  } catch {}
}

function lessonChip(target, lesson) {
  const chip = element("button", { class: "sd-ui lesson-chip", type: "button", "aria-label": `Lesson: ${lesson.title}`, "data-tip": lesson.title, html: icon(BOOK) });
  const label = target.matches("figure") ? target.querySelector("figcaption") : target.querySelector(":scope > strong, :scope > h3, :scope > .tree-row > code, :scope > code, :scope > td");
  (label ?? target).append(chip);
  return chip;
}

function markLessons() {
  const scores = lessonScores();
  for (const lesson of state.lessons) {
    if (lesson.source === "page") continue;
    const target = anchorElement(lesson.source);
    if (!target) continue;
    const term = lesson.term ? wrapFirst(target, phrasePattern(lesson.term), (text) => element("span", { class: "lesson-term", tabindex: 0, role: "button", "aria-label": `Lesson: ${lesson.title}` }, [text, element("span", { class: "sd-ui lesson-icon", html: icon(BOOK) })])) : null;
    lesson.marker = term ?? lessonChip(target, lesson);
    lesson.marker.classList.toggle("done", Boolean(scores[lesson.anchor]));
    lesson.marker.addEventListener("click", () => !state.mode && openLesson(lesson));
    lesson.marker.addEventListener("keydown", (event) => event.key === "Enter" && openLesson(lesson));
  }
  addStartCard();
}

function addStartCard() {
  const lesson = state.lessons.find((item) => item.source === "page");
  if (!lesson) return;
  const card = element("div", { class: "sd-ui lesson-start" });
  const steps = lessonParts(lesson.section).parts.length;
  const questions = lesson.section.querySelectorAll("ol.quiz > li").length;
  lesson.marker = card;
  lesson.renderCard = () => {
    const score = lessonScores()[lesson.anchor];
    card.classList.toggle("done", Boolean(score));
    card.replaceChildren(
      element("span", { class: "lesson-start-icon", html: icon(score ? CHECK : BOOK) }),
      element("span", { class: "lesson-start-text" }, [element("b", { text: lesson.title }), element("span", { text: score ? `Finished · ${score} correct` : `${steps} steps${questions ? ` · ${questions}-question quiz` : ""}` })]),
      element("button", { class: "button lesson-start-button", type: "button", onclick: () => openLesson(lesson) }, [score ? "Review" : "Start", element("span", { class: "button-icon", html: icon(CHEVRON) })]),
    );
  };
  lesson.renderCard();
  (design.querySelector(":scope > .lede") ?? design.querySelector(":scope > h1"))?.after(card);
}

function lessonParts(section) {
  const intro = [];
  const parts = [];
  for (const node of section.children) {
    if (node.matches("h2")) continue;
    if (node.matches("h3")) parts.push({ title: collapse(node.textContent), nodes: [] });
    else (parts.at(-1)?.nodes ?? intro).push(node);
  }
  return { intro, parts };
}

function lessonViews(lesson) {
  const { intro, parts } = lessonParts(lesson.section);
  lesson.views ??= parts.map((part) => {
    const view = element("div", { class: "design reader-body" }, part.nodes.map((node) => node.cloneNode(true)));
    enhanceQuiz(view, lesson);
    return view;
  });
  return { intro: intro.map((node) => node.cloneNode(true)), parts, views: lesson.views };
}

function showReader(view) {
  reader.dataset.view = view;
  reader.classList.add("open");
  document.body.classList.add("reading");
  lessonsButton.setAttribute("aria-expanded", "true");
  setTimeout(renderPins, 220);
}

function closeReader() {
  reader.classList.remove("open");
  document.body.classList.remove("reading");
  lessonsButton.setAttribute("aria-expanded", "false");
  state.nav = null;
  for (const node of document.querySelectorAll(".lesson-active")) node.classList.remove("lesson-active");
  setTimeout(renderPins, 220);
}

function readerHead(children) {
  return element("div", { class: "reader-head" }, [...children, ghostButton("Close (Esc)", CLOSE, closeReader)]);
}

function sourceLabel(lesson) {
  return lesson.source === "page" ? "Whole design" : locate(lesson.source);
}

function flash(node) {
  node.classList.remove("flash");
  void node.offsetWidth;
  node.classList.add("flash");
}

function revealLessonSource(lesson) {
  const target = lesson.source === "page" ? lesson.marker ?? design : anchorElement(lesson.source);
  if (!target) return;
  unfold(target);
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  flash(target);
}

function stepButton(title, label, forward, onclick) {
  return element("button", { class: `step-nav${forward ? " forward" : ""}`, type: "button", onclick }, [
    forward ? null : element("span", { class: "button-icon", html: icon(PREVIOUS) }),
    element("span", { class: "step-nav-text" }, [element("small", { text: label }), element("span", { text: title })]),
    forward ? element("span", { class: "button-icon", html: icon(CHEVRON) }) : null,
  ]);
}

function openLesson(lesson, index = 0) {
  closePopover();
  setDrawer(false);
  const { intro, parts, views } = lessonViews(lesson);
  if (!parts.length) return;
  const step = clamp(index, 0, parts.length - 1);
  const go = (target) => target >= 0 && target < parts.length && openLesson(lesson, target);
  const request = requestFor(lesson);
  reader.replaceChildren(
    readerHead([
      ghostButton("All lessons", LIST, openLessonIndex),
      element("button", { class: "reader-source", type: "button", onclick: () => revealLessonSource(lesson) }, [element("span", { class: "button-icon", html: icon(BACK) }), sourceLabel(lesson)]),
    ]),
    element("div", { class: "reader-scroll" }, [
      element("h2", { class: "reader-title", text: lesson.title }),
      element("div", { class: "design reader-intro" }, intro),
      request ? element("p", { class: "reader-asked", text: `“${request.body}”` }) : null,
      element(
        "div",
        { class: "steps" },
        parts.map((part, position) => element("button", { class: `step-bar${position < step ? " done" : ""}${position === step ? " current" : ""}`, type: "button", "aria-label": part.title, "data-tip": part.title, onclick: () => go(position) })),
      ),
      element("p", { class: "step-title" }, [element("span", { text: `${step + 1}/${parts.length}` }), parts[step].title]),
      views[step],
    ]),
    element("div", { class: "reader-foot" }, [step > 0 ? stepButton(parts[step - 1].title, "Previous", false, () => go(step - 1)) : element("span"), step < parts.length - 1 ? stepButton(parts[step + 1].title, "Next", true, () => go(step + 1)) : element("span")]),
  );
  reader.querySelector(".reader-scroll").scrollTop = 0;
  state.nav = { lesson, step, go };
  for (const node of document.querySelectorAll(".lesson-active")) node.classList.remove("lesson-active");
  lesson.marker?.classList.add("lesson-active");
  showReader("lesson");
}

function openLessonIndex() {
  closePopover();
  const scores = lessonScores();
  const lessons = state.lessons.map((lesson) =>
    element("button", { class: "index-item", type: "button", onclick: () => openLesson(lesson) }, [
      element("span", { class: `index-icon${scores[lesson.anchor] ? " done" : ""}`, html: icon(scores[lesson.anchor] ? CHECK : BOOK) }),
      element("span", { class: "index-text" }, [element("b", { text: lesson.title }), element("span", { text: scores[lesson.anchor] ? `${sourceLabel(lesson)} · finished · ${scores[lesson.anchor]}` : sourceLabel(lesson) })]),
    ]),
  );
  const waiting = openRequests().map((request) =>
    element("button", { class: "index-item", type: "button", onclick: () => revealRequest(request) }, [
      element("span", { class: "pin ask", text: "?" }),
      element("span", { class: "index-text" }, [element("b", { text: request.body }), element("span", { text: request.location || request.anchor })]),
    ]),
  );
  const ask = () => {
    if (innerWidth < 1100) closeReader();
    setMode("explain");
  };
  reader.replaceChildren(
    readerHead([element("span", { class: "reader-kicker", text: "Lessons" })]),
    element("div", { class: "reader-scroll" }, [
      lessons.length ? element("div", { class: "index-list" }, lessons) : element("p", { class: "empty", text: "No lessons yet." }),
      waiting.length ? element("p", { class: "index-label", text: "Waiting" }) : null,
      waiting.length ? element("div", { class: "index-list" }, waiting) : null,
    ]),
    element("div", { class: "reader-foot index-foot" }, [
      element("button", { class: "button new-request", type: "button", onclick: ask }, [element("span", { class: "button-icon", html: icon(ASK) }), "New request"]),
      element("span", { class: "index-hint", text: "or select text and press Explain" }),
    ]),
  );
  state.nav = null;
  showReader("index");
}

function revealRequest(request) {
  const mark = state.askMarks.get(request.id);
  const frame = mark?.isConnected ? mark : frameFor(request);
  if (!frame?.getClientRects().length) return toast("Waiting for a lesson.");
  if (innerWidth < 1100) closeReader();
  unfold(frame);
  frame.scrollIntoView({ block: "center" });
  requestAnimationFrame(() => openThread(request));
}

function enhanceQuiz(root, lesson) {
  for (const quiz of root.querySelectorAll("ol.quiz")) {
    const questions = [...quiz.children].filter((node) => node.matches("li"));
    const result = element("div", { class: "quiz-result", hidden: true });
    const retry = () => {
      for (const question of questions) question.resetAnswer?.();
      result.hidden = true;
    };
    const finish = () => {
      const right = questions.filter((question) => question.dataset.answered === "right").length;
      const missed = questions.find((question) => question.dataset.answered === "wrong");
      const score = `${right}/${questions.length}`;
      const done = element("button", { class: "button quiz-finish", type: "button", onclick: () => completeLesson(lesson, score, done) }, [element("span", { class: "button-icon", html: icon(CHECK) }), "Finish lesson"]);
      result.replaceChildren(
        element("p", { class: "quiz-score" }, [element("b", { text: score }), "correct"]),
        done,
        element("div", { class: "quiz-actions" }, [
          missed ? element("button", { class: "button link quiz-follow-up", type: "button", onclick: (event) => askFollowUp(lesson, missed, event.currentTarget) }, [element("span", { class: "button-icon", html: icon(ASK) }), "Ask a follow-up"]) : null,
          element("button", { class: "button link", type: "button", text: "Try again", onclick: retry }),
        ]),
      );
      result.hidden = false;
      requestAnimationFrame(() => result.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    };
    for (const question of questions) buildQuestion(question, () => questions.every((item) => item.dataset.answered) && finish());
    quiz.after(result);
  }
}

function buildQuestion(question, onAnswer) {
  const list = question.querySelector(":scope > ul.choices");
  const why = question.querySelector(":scope > .why");
  if (!list) return;
  const verdict = element("b", { class: "quiz-verdict" });
  why?.prepend(verdict);
  const choices = [...list.children].map((choice, index) =>
    element("button", { class: "quiz-choice", type: "button", dataset: { correct: choice.hasAttribute("data-correct") ? "true" : "" } }, [
      element("span", { class: "quiz-key", text: String.fromCharCode(65 + index) }),
      element("span", {}, [...choice.childNodes].map((node) => node.cloneNode(true))),
    ]),
  );
  list.replaceWith(element("div", { class: "quiz-choices", role: "group" }, choices));
  question.resetAnswer = () => {
    delete question.dataset.answered;
    for (const choice of choices) {
      choice.disabled = false;
      choice.classList.remove("correct", "wrong");
    }
    if (why) why.hidden = true;
  };
  for (const choice of choices) {
    choice.addEventListener("click", () => {
      const right = Boolean(choice.dataset.correct);
      question.dataset.answered = right ? "right" : "wrong";
      for (const other of choices) {
        other.disabled = true;
        if (other.dataset.correct) other.classList.add("correct");
      }
      choice.classList.add(right ? "correct" : "wrong");
      verdict.textContent = right ? "Correct. " : "Not quite. ";
      if (why) {
        why.hidden = false;
        why.classList.toggle("right", right);
      }
      onAnswer();
    });
  }
  question.resetAnswer();
}

function completeLesson(lesson, score, button) {
  saveLessonScore(lesson.anchor, score);
  button.disabled = true;
  button.replaceChildren(element("span", { class: "button-icon", html: icon(CHECK) }), "Finished");
  closeReader();
  lesson.renderCard?.();
  lesson.marker?.classList.add("done");
  toast(`Lesson finished · ${score}`);
  revealLessonSource(lesson);
}

function askFollowUp(lesson, question, button) {
  const box = button.getBoundingClientRect();
  const target = { anchor: lesson.anchor, highlight: null, frame: lesson.section, quote: collapse(question.querySelector(":scope > p")?.textContent), block: "", fixed: false };
  openComposer(target, box.left, box.bottom, "explain");
}

function setReaderWidth(value) {
  const width = clamp(Math.round(value), 420, Math.max(420, Math.min(960, innerWidth - 360)));
  document.documentElement.style.setProperty("--reader-width", `${width}px`);
  return width;
}

function bindReaderResize() {
  try {
    const saved = Number(localStorage.getItem(READER_WIDTH_KEY));
    if (saved) setReaderWidth(saved);
  } catch {}
  const save = (width) => {
    try {
      localStorage.setItem(READER_WIDTH_KEY, String(width));
    } catch {}
    renderPins();
  };
  readerResize.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    readerResize.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing");
  });
  readerResize.addEventListener("pointermove", (event) => {
    if (readerResize.hasPointerCapture(event.pointerId)) setReaderWidth(innerWidth - event.clientX);
  });
  readerResize.addEventListener("pointerup", (event) => {
    readerResize.releasePointerCapture(event.pointerId);
    document.body.classList.remove("resizing");
    save(setReaderWidth(innerWidth - event.clientX));
  });
  readerResize.addEventListener("dblclick", () => save(setReaderWidth(READER_WIDTH)));
}

function onKeyDown(event) {
  const typing = event.target.closest?.("textarea, input, [contenteditable]");
  if (event.key === "Escape") {
    if (state.popover) return closePopover();
    if (drawer.classList.contains("open")) return setDrawer(false);
    if (state.viewer) return closeViewer();
    if (state.mode) return setMode(null);
    if (reader.classList.contains("open")) return closeReader();
  }
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "c" || event.key === "C") toggleMode("comment");
  if (event.key === "e" || event.key === "E") toggleMode("explain");
  if (state.nav && !state.viewer && !event.target.closest?.(".tree-frame") && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    event.preventDefault();
    return state.nav.go(state.nav.step + (event.key === "ArrowRight" ? 1 : -1));
  }
  if (!state.viewer) return;
  const center = [innerWidth / 2, innerHeight / 2];
  if (event.key === "+" || event.key === "=") zoomAt(1.25, ...center);
  if (event.key === "-") zoomAt(1 / 1.25, ...center);
  if (event.key === "0") fitViewer();
  if (event.key === "1") fitViewer(true);
}

async function refreshComments() {
  const { comments, version } = await state.store.load();
  state.comments = Array.isArray(comments) ? comments : [];
  state.commentsVersion = version;
  markRequests();
  renderDrawer();
  if (reader.classList.contains("open") && reader.dataset.view === "index") openLessonIndex();
  const typing = state.popover?.querySelector("textarea")?.value.trim();
  if (!state.popover || state.popover.dataset.kind === "composer" || typing) renderPins();
  else reopenThread(state.popover.dataset.id);
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const node = element("div", { class: "sd-ui toast", role: "status", text: message });
  document.body.append(node);
  setTimeout(() => node.remove(), 3600);
}

function showBanner() {
  if (document.querySelector(".banner")) return;
  document.body.append(element("div", { class: "sd-ui banner", role: "status" }, [element("span", { text: "A new build of this design is ready." }), element("button", { class: "button primary", type: "button", text: "Reload", onclick: reloadKeepingScroll })]));
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
  if (state.store.mode === "local") drawerMode.textContent = "Opened without the design server: new comments stay in this browser. Copy them and paste them in the chat.";
  else if (offline) drawerMode.textContent = "The design server stopped. New comments cannot be saved until it runs again.";
  else drawerMode.textContent = "Comments are saved into this design file. Tell the agent in the chat when you finish.";
  drawerMode.classList.toggle("offline", offline);
}

function poll() {
  setInterval(async () => {
    try {
      const version = await request("GET", "/api/version");
      if (!state.online) {
        state.online = true;
        renderMode();
      }
      if (version.build && version.build !== build) {
        if (state.popover?.dataset.kind === "composer") {
          state.staleBuild = true;
          return showBanner();
        }
        return reloadKeepingScroll();
      }
      if (version.comments !== state.commentsVersion && state.popover?.dataset.kind !== "composer") await refreshComments();
    } catch {
      if (state.online) {
        state.online = false;
        renderMode();
      }
    }
  }, POLL_INTERVAL);
}

function commentsMarkdown() {
  const open = numbered().filter(({ comment }) => comment.status !== "resolved");
  const requests = openRequests();
  if (!open.length && !requests.length) return `No open comments on "${document.title}".`;
  const lines = [`Open review comments on "${document.title}" (${slug}):`];
  for (const { comment, number } of open) {
    lines.push("", `- #${number} [${comment.id}] ${comment.location || comment.anchor}`, `  anchor: ${comment.anchor}`);
    if (comment.quote) lines.push(`  quote: ${comment.quote}`);
    lines.push(`  comment: ${comment.body.replace(/\n/g, "\n    ")}`);
    for (const reply of comment.replies ?? []) lines.push(`  ${reply.author}: ${reply.body.replace(/\n/g, "\n    ")}`);
  }
  if (requests.length) lines.push("", "Open explanation requests:");
  for (const request of requests) {
    lines.push("", `- [${request.id}] ${request.location || request.anchor}`, `  anchor: ${request.anchor}`);
    if (request.quote) lines.push(`  quote: ${request.quote}`);
    lines.push(`  request: ${request.body.replace(/\n/g, "\n    ")}`);
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

function bindUi() {
  document.body.append(pinLayer);
  modeButton.addEventListener("click", () => toggleMode("comment"));
  explainButton.addEventListener("click", () => toggleMode("explain"));
  lessonsButton.addEventListener("click", () => (reader.classList.contains("open") && reader.dataset.view === "index" ? closeReader() : openLessonIndex()));
  selectionChip.addEventListener("pointerdown", (event) => event.preventDefault());
  selectionChip.addEventListener("click", explainSelection);
  design.addEventListener("click", onDesignClick);
  let selectionTimer = null;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(syncSelectionChip, 140);
  });
  bindReaderResize();
  themeButton.addEventListener("click", toggleTheme);
  systemDark.addEventListener("change", () => {
    if (!document.documentElement.dataset.theme) redrawForTheme();
  });
  syncThemeButton();
  listButton.addEventListener("click", () => setDrawer(!drawer.classList.contains("open")));
  document.getElementById("drawer-close").addEventListener("click", () => setDrawer(false));
  backdrop.addEventListener("click", () => setDrawer(false));
  document.getElementById("copy-comments").addEventListener("click", copyComments);
  for (const tab of drawer.querySelectorAll("[data-filter]")) tab.addEventListener("click", () => setFilter(tab.dataset.filter));
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown);
  addEventListener("resize", () => {
    renderPins();
    if (state.viewer) applyViewer();
  });
  new ResizeObserver(() => renderPins()).observe(design);
}

async function boot() {
  wrapTables();
  highlightCode();
  addBlockLabels();
  addChangeLegends();
  markTerms();
  enhanceTrees();
  collectLessons();
  markLessons();
  buildToc();
  bindUi();
  state.store = await chooseStore();
  renderMode();
  await refreshComments();
  const report = await renderDiagrams();
  restoreScroll();
  renderPins();
  if (state.store.mode !== "server") return;
  request("POST", "/api/render", report).catch(() => {});
  poll();
}

boot();
