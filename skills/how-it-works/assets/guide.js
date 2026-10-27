const THEME_KEY = "how-it-works:theme";
const SUN = "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1";
const MOON = "M13 9.6A5.5 5.5 0 0 1 6.4 3a5.5 5.5 0 1 0 6.6 6.6z";
const SWIPE_DISTANCE = 40;

const root = document.documentElement;
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function isDark() {
  return (root.dataset.theme || (systemDark.matches ? "dark" : "light")) === "dark";
}

function setupTheme() {
  const button = document.getElementById("theme-toggle");
  if (!button) return;
  const sync = () => {
    const dark = isDark();
    const label = dark ? button.dataset.labelLight : button.dataset.labelDark;
    button.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${dark ? SUN : MOON}"/></svg>`;
    button.setAttribute("aria-label", label);
    button.title = label;
  };
  button.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    sync();
  });
  systemDark.addEventListener("change", sync);
  sync();
}

function setupContents() {
  const links = [...document.querySelectorAll(".toc a")];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const linkFor = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) link.classList.toggle("active", link === linkFor.get(entry.target.id));
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  for (const id of linkFor.keys()) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
}

function slideFor(screen) {
  const box = screen.closest("li, .pair");
  const heading = box?.querySelector("h3, .takeaway");
  const picture = screen.querySelector("img");
  return {
    src: picture.getAttribute("src"),
    alt: picture.getAttribute("alt"),
    caption: screen.dataset.caption || heading?.textContent.trim() || picture.getAttribute("alt"),
    section: screen.closest("section")?.querySelector("h2")?.textContent.trim() || "",
    href: screen.dataset.href || "",
    wide: screen.classList.contains("wide"),
  };
}

function setupViewer() {
  const screens = [...document.querySelectorAll(".guide .screen")];
  const dialog = document.getElementById("viewer");
  const count = document.getElementById("screen-count");
  if (count) count.textContent = screens.length;
  if (!dialog?.showModal || !screens.length) return;
  const image = document.getElementById("viewer-image");
  const title = document.getElementById("viewer-title");
  const caption = document.getElementById("viewer-caption");
  const position = document.getElementById("viewer-count");
  const open = document.getElementById("viewer-open");
  const previous = dialog.querySelector('[data-step="-1"]');
  const next = dialog.querySelector('[data-step="1"]');
  const slides = screens.map(slideFor);
  let current = 0;

  const show = (index) => {
    current = Math.max(0, Math.min(slides.length - 1, index));
    const slide = slides[current];
    image.src = slide.src;
    image.alt = slide.alt;
    title.textContent = slide.section;
    caption.textContent = slide.caption;
    position.textContent = `${current + 1} / ${slides.length}`;
    open.hidden = !slide.href;
    if (slide.href) open.href = slide.href;
    dialog.classList.toggle("is-wide", slide.wide);
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
  };

  const openAt = (index) => {
    show(index);
    dialog.showModal();
  };

  screens.forEach((screen, index) => screen.addEventListener("click", () => openAt(index)));
  document.getElementById("all-screens")?.addEventListener("click", () => openAt(0));

  dialog.addEventListener("click", (event) => {
    const step = event.target.closest("[data-step]");
    if (step) {
      show(current + Number(step.dataset.step));
      return;
    }
    if (event.target.closest("[data-close]") || event.target === dialog || event.target.classList.contains("viewer-stage")) dialog.close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(current + 1);
    }
  });

  let startX = null;
  image.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
  });
  image.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const distance = event.clientX - startX;
    startX = null;
    if (Math.abs(distance) > SWIPE_DISTANCE) show(current + (distance < 0 ? 1 : -1));
  });
  image.addEventListener("pointercancel", () => {
    startX = null;
  });

  dialog.addEventListener("close", () => screens[current]?.focus({ preventScroll: true }));
}

setupTheme();
setupContents();
setupViewer();
