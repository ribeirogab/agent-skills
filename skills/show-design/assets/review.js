const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
const POLL_INTERVAL = 2000;
const NODE_SELECTOR = "g.node, g.cluster, g.edgeLabel, g.note, rect.actor, text.actor, text.messageText, text.noteText";
const BLOCK_SELECTOR = "td, th, li, p, h1, h2, h3, h4, dt, dd, pre, blockquote, aside, .card";
const NAMED_KINDS = new Set(["file", "component", "entity", "column", "table", "contract", "event", "job"]);
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

const design = document.getElementById("design");
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("drawer-backdrop");
const drawerList = document.getElementById("drawer-list");
const drawerMode = document.getElementById("drawer-mode");
const modeButton = document.getElementById("comment-mode");
const listButton = document.getElementById("comments-list");
const themeButton = document.getElementById("theme-toggle");
const THEME_KEY = "show-design:theme";
const SUN = "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1";
const MOON = "M13 9.6A5.5 5.5 0 0 1 6.4 3a5.5 5.5 0 1 0 6.6 6.6z";
const { slug, build } = document.body.dataset;
const storageKey = `show-design:${slug}:comments`;
const scrollKey = `show-design:${slug}:scroll`;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const pinLayer = element("div", { class: "sd-ui pin-layer" });

const state = {
  store: null,
  comments: [],
  commentsVersion: null,
  filter: "open",
  commenting: false,
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

function addChangeLegends() {
  for (const section of sections()) {
    const kinds = new Set([...section.querySelectorAll("[data-change]")].map((node) => node.dataset.change));
    const shown = Object.keys(CHANGE_MARKS).filter((kind) => kinds.has(kind));
    if (!shown.length) continue;
    const legend = element("p", { class: "sd-ui change-legend" }, shown.map((kind) => element("span", {}, [element("b", { class: kind, text: CHANGE_MARKS[kind] }), kind])));
    section.querySelector("h2")?.after(legend);
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

function readableText(node) {
  const copy = node.cloneNode(true);
  for (const lineBreak of copy.querySelectorAll("br")) lineBreak.replaceWith(" ");
  for (const part of copy.querySelectorAll("p, div, li, dt, dd, td, th, h1, h2, h3, h4, pre, blockquote, strong, tspan, text")) {
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

function numbered() {
  return [...state.comments].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).map((comment, index) => ({ comment, number: index + 1 }));
}

function matchesFilter(comment) {
  if (state.filter === "all") return true;
  return (state.filter === "resolved") === (comment.status === "resolved");
}

function placePin(pin, x, y, fixed) {
  pin.style.left = `${fixed ? x : x + scrollX}px`;
  pin.style.top = `${fixed ? y : y + scrollY}px`;
}

function renderPins() {
  pinLayer.replaceChildren();
  state.viewer?.pins.replaceChildren();
  for (const { comment, number } of numbered()) {
    if (!matchesFilter(comment)) continue;
    const frame = frameFor(comment);
    if (!frame) continue;
    const inViewer = Boolean(state.viewer?.stage.contains(frame));
    const { x, y, visible } = screenPoint(comment, frame);
    if (!visible) continue;
    const pin = element("button", { class: `pin ${comment.status === "resolved" ? "resolved" : "open"}`, type: "button", text: String(number), title: truncate(collapse(comment.body), 80), "aria-label": `Comment ${number}`, dataset: { id: comment.id } });
    pin.classList.toggle("active", state.popover?.dataset.id === comment.id);
    pin.addEventListener("click", (event) => {
      event.stopPropagation();
      openThread(comment, number);
    });
    placePin(pin, x, y, inViewer);
    (inViewer ? state.viewer.pins : pinLayer).append(pin);
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

function openComposer(target, clientX, clientY) {
  closePopover();
  const location = locate(target.anchor);
  const range = getSelection()?.rangeCount ? getSelection().getRangeAt(0) : null;
  const selection = range && target.frame.contains(range.commonAncestorContainer) ? collapse(range.toString()) : "";
  const quote = selection ? truncate(selection, 400) : target.quote;
  const point = pointIn(target.frame, clientX, clientY);
  const { form, textarea } = inputBox("Add a comment", async (body) => {
    try {
      await state.store.create({ anchor: target.anchor, location, quote, body, point: { ...point, block: target.block } });
      closePopover();
      await refreshComments();
      return true;
    } catch (error) {
      toast(`Comment not saved: ${error.message}`);
      return false;
    }
  });
  const card = element("div", { class: "sd-ui popover compact", role: "dialog", "aria-label": `New comment on ${location}`, dataset: { kind: "composer" } }, form);
  closeOnEscape(card);
  const draft = element("span", { class: "sd-ui pin draft", text: "+" });
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
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(document.documentElement.lang || undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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

function openThread(comment, number) {
  closePopover();
  const frame = frameFor(comment);
  if (!frame) return;
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
  const card = element("div", { class: "sd-ui popover thread-card", role: "dialog", "aria-label": `Comment ${number}`, dataset: { id: comment.id } }, [
    element("div", { class: "popover-head" }, [element("div", { class: "popover-location", text: `#${number} · ${comment.location || comment.anchor}${resolved ? " · resolved" : ""}` }), ...tools, ghostButton("Close", CLOSE, closePopover)]),
    element("div", { class: "thread" }, messages.map(messageView)),
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
  const entry = numbered().find(({ comment }) => comment.id === id);
  if (entry) openThread(entry.comment, entry.number);
}

function revealComment(comment) {
  const frame = frameFor(comment);
  if (!frame) return toast("This part of the design is no longer on the page.");
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
  const open = state.comments.filter((comment) => comment.status !== "resolved");
  for (const node of document.querySelectorAll('[data-count="open"]')) node.textContent = String(open.length);
  for (const node of document.querySelectorAll('[data-count="resolved"]')) node.textContent = String(state.comments.length - open.length);
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

function setCommenting(on) {
  state.commenting = on;
  document.body.classList.toggle("commenting", on);
  modeButton.setAttribute("aria-pressed", String(on));
  document.querySelector(".mode-hint")?.remove();
  if (on) document.body.append(element("div", { class: "sd-ui mode-hint", text: "Click anywhere to comment · Esc to stop" }));
  else setHighlight("hover", null);
  syncViewerToggle();
}

function onPointerMove(event) {
  if (!state.commenting || state.popover || state.viewer?.dragging) return setHighlight("hover", null);
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
  if (state.commenting && target) consume(event);
  return true;
}

function onClick(event) {
  if (event.button !== 0) return;
  if (state.viewer?.moved) {
    state.viewer.moved = false;
    return;
  }
  const hit = state.viewer ? document.elementFromPoint(event.clientX, event.clientY) : event.target;
  const target = state.commenting ? resolveTarget(hit, { x: event.clientX, y: event.clientY }) : null;
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
  const commentToggle = button("Comment mode (C)", icon("M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z"), () => setCommenting(!state.commenting));
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
  state.viewer?.commentToggle.setAttribute("aria-pressed", String(state.commenting));
  if (state.viewer) state.viewer.commentToggle.style.color = state.commenting ? "var(--accent)" : "";
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

function onKeyDown(event) {
  const typing = event.target.closest?.("textarea, input, [contenteditable]");
  if (event.key === "Escape") {
    if (state.popover) return closePopover();
    if (drawer.classList.contains("open")) return setDrawer(false);
    if (state.viewer) return closeViewer();
    if (state.commenting) return setCommenting(false);
  }
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "c" || event.key === "C") setCommenting(!state.commenting);
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
  renderDrawer();
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
  if (!open.length) return `No open comments on "${document.title}".`;
  const lines = [`Open review comments on "${document.title}" (${slug}):`];
  for (const { comment, number } of open) {
    lines.push("", `- #${number} [${comment.id}] ${comment.location || comment.anchor}`, `  anchor: ${comment.anchor}`);
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

function bindUi() {
  document.body.append(pinLayer);
  modeButton.addEventListener("click", () => setCommenting(!state.commenting));
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
  addChangeLegends();
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
