# Sections and markup

Read before writing or reworking the content of a page.

## Writing for the reader

The reader uses the product and has never seen this subject. They read the page once from top to bottom, then come back to one section when a customer or a teammate asks. Write so that the first read takes a few minutes and the screens carry most of the explanation.

- Put the conclusion first. The page opens with the lede, and every section after the summary opens with a takeaway: one sentence that states a fact the reader can see ("The Hub asks for the framing only on photos that do not fit."), never a description of the section.
- Describe what the reader sees and does: what appears, what is blocked, who gets told. Name screens, buttons, and messages exactly as the interface spells them, in quotes when they are labels ("Concluir envio").
- Write one idea per sentence, in about 20 words or fewer, in the active voice and the present tense. Give each step a heading of 8 words or fewer and one short sentence under it.
- Use one term for one concept, the term the product and its glossary use, every time.
- Keep implementation out of the page: file paths, tables, services, and flags belong to a technical design, not to this reader.

## Markup contract

The content is an HTML fragment: the build wraps it into the page template, which supplies the styles, the top bar, the contents list, the theme switch, and the carousel. Write content markup only, with the components below. `<html>`, `<head>`, `<body>`, `<main>`, `<script>`, `<style>`, and `<link>` belong to the template.

- Open with an optional `<p class="eyebrow">` (the product area or issue key), one `<h1>` (the subject, which also titles the page), and one `<p class="lede">` that states what the subject does in one or two plain sentences.
- Wrap each section in `<section id="<key>">` with one `<h2>`. The `id` is a short kebab-case key; the contents list links to it. Write the heading in the language of the page.
- Show every screen as `<img class="screen" src="screens/<state>.<ext>" alt="what the screen shows">`, with `data-href` when the reader can open the live state and `data-caption` when the carousel needs a caption other than the step heading. The build embeds the image, marks it `tall` or `wide` from its size, and turns it into a button that opens the carousel.

| Component | Markup |
| --- | --- |
| Takeaway | `<p class="takeaway">`, the first element after the section's `<h2>` |
| Label | `<p class="label">`, a small uppercase heading over a block inside a section |
| Before and after | `<div class="before-after"><div><h3>today label</h3><ul>…</ul></div><div><h3>after label</h3><ul>…</ul></div></div>`, two to four short lines each |
| Journey | `<ol class="journey">` of `<li><a href="#section-id">stage</a></li>`: the stages of a flow, or the areas of a product, as linked chips in order |
| Cards | `<div class="cards">` of `<a href="#section-id"><h3>…</h3><small>…</small></a>`, or of `<div>` when the card links nowhere |
| Steps | `<ol class="steps">` of `<li>` with a screen, an `<h3>`, and a `<p>`: numbered steps on phone-sized screens, in a strip that scrolls sideways |
| Gallery | `<ul class="gallery">` of `<li>` with a screen, an `<h3>`, and a `<p>`: screens without an order, usually desktop-sized |
| Pair | `<div class="pair">` with a screen and a `<div>` of text: one screen next to its explanation |
| Flow | `<ol class="flow">` of `<li><div class="flow-screens">screens</div><div><p class="actor">who or where</p><h3>…</h3><p>…</p></div></li>`: numbered steps that cross apps or people, such as the customer, then the team |
| Rules | `<ul class="rules">` of `<li>`, a check mark each; `<li class="no">` takes a cross, for what the subject leaves out |
| Bars | `<ul class="bars" data-max="40" data-mark="15" data-unit="%">` of `<li data-value="11">label</li>`: values against a threshold. The build draws each bar; a value over `data-mark` takes the warning color, under it the success color. Follow it with `<p class="legend">` saying what the mark means |
| Figure | `<figure class="figure">` with an inline `<svg>` or an `<img>`, and a `<figcaption>` that states its conclusion. The SVG classes `sky`, `ground`, `fig`, `paper`, `frame`, `arrow`, `arrow-head`, `cut`, `svg-label`, and `svg-note` follow the page theme |
| Callout | `<aside class="callout">`, or `class="callout warning"` for a limit the reader must know |
| Table | `<table>` with `<thead>`; the build makes it scroll sideways on a phone |
| Links | `<div class="links">` of `<div><h3>group</h3><ul><li><a href="…">state</a></li></ul></div>`: where to open each state live |

## Sections

Pick the shape that fits the subject. Every shape opens with the summary and keeps the sections in the order the reader meets them. A section on the page always has content.

### The summary, every shape

`<section id="summary">` with the heading the page language uses for "Summary". No takeaway: the whole section is one.

- A before-and-after block: under the today label, what happens now and the problem it causes; under the after label, what happens with the subject.
- Then, when it helps: a figure that draws the problem, a journey of the stages, or cards for the places the subject shows up.

### A feature

One section per surface or product the feature touches, in the order the reader meets them. Use steps for a sequence on one surface, a pair for a single screen, a gallery for screens without an order, and a flow when the feature passes from one person or app to another. Close with a rules section (rules, bars, a callout) and, when the screens have live URLs, a links section.

### A flow

A journey in the summary, then one section per stage of the flow (cart, payment, confirmation), each with its steps. Show where the flow branches or stops (a failed payment, an out-of-stock item) in the stage where it happens, with a callout or a pair. Close with the rules the flow enforces.

### A whole product

A journey or cards in the summary that map the areas of the product, then one section per area with a gallery of its main screens and steps for its most common task. Close with a section for what the reader should know before they start: access, roles, limits.
