# Sections and markup

Read before writing or reworking the design content.

## Writing for the reader

The reader knows the product and the goal of the plan, but not this code. They read the page once from top to bottom, then come back to one section to comment. Write so that the first read takes minutes and the summary alone tells what changes.

- Put the conclusion first. The page opens with the summary, and each section opens with a takeaway: one sentence that states what the section shows, as a fact ("One process owns all the data."), never as a description of the section ("This section describes the architecture.").
- Write one idea per sentence, in about 20 words or fewer. Use the active voice and the present tense. A sentence names at most three items; four or more go into a list.
- Use one term for one concept. Write the glossary term every time, never a synonym for it: not "login", "token", and "grant" for the same thing.
- Put every term the reader may not know in the glossary, or replace it with a plain word. Spell out an acronym the first time it appears.
- Say what changes and why. Library internals, protocol versions, exact flags, and other implementation detail go into a `<details class="more">` block under the text they support, or stay off the page: the spec carries them.
- Write the comments inside code blocks in the language of the conversation, like the prose.

## Markup contract

The design content is an HTML fragment: the first build wraps it into the page template, which supplies the styles, the table of contents, the change legends, the folding of tree directories, the glossary hints, the diagram viewer, Mermaid, and the comment layer. Write content markup only, with the components below; `<html>`, `<head>`, `<body>`, `<main>`, and scripts other than diagrams belong to the template.

- Open with one `<h1>` (the design title, which also titles the page) and one `<p class="lede">` that states the change in one or two plain sentences.
- Wrap each section in `<section data-anchor="section:<key>">` with one `<h2>` heading in English: the exact heading listed below for a base section (the build checks those), or a short English heading for a section you add. Write everything else in the language of the conversation with the user.
- Give every element a reviewer could point at a `data-anchor`: each decision, tree entry, table row, diagram, contract, risk, question, and scope item. Other blocks take comments through their section's anchor, with the block text as the quote. `page` is reserved for the page itself. Build anchor values as `<kind>:<key>` from stable names: `decision:d1`, `file:src/orders/status.ts`, `component:OrderStatusBadge`, `entity:Order`, `column:Order.status`, `contract:PATCH /orders/{id}/status`, `diagram:architecture`. Comments attach through anchors, so keep an anchor unchanged across rebuilds while its element keeps its meaning, and give a reworked element a new anchor.
- Mark change state with `data-change="added|changed|removed|moved|unchanged"` on tree entries, table rows, and cards. The page draws the marker (`+ ~ − →`) and adds a one-line legend under the takeaway, or under the heading, of each section that uses markers.
- Write each diagram as `<script type="text/x-mermaid" data-anchor="diagram:<key>" data-caption="<one line>">…</script>`, with a caption that states what the diagram shows as a conclusion. The script element keeps `<`, `>`, and `&` literal, so write Mermaid as is.
- State only what the code establishes or the conversation settled, in plain prose without status labels. A point that needs the user's decision, or a connection the code does not confirm, goes to the open questions section.

| Component | Markup |
| --- | --- |
| Takeaway | `<p class="takeaway">`, the first element after the section's `<h2>` |
| Before and after | `<div class="before-after"><div><h3>today label</h3><ul>…</ul></div><div><h3>after label</h3><ul>…</ul></div></div>`, with both labels in the language of the conversation |
| Walkthrough | `<ol class="story">` of `<li>`, one short sentence per step |
| Decision list | `<ol class="decisions">` of `<li data-anchor="decision:dN"><strong>decision</strong><p>reason, with the repository path of the ADR in <code> when one records it</p></li>` |
| Glossary terms | `<dl class="terms">` of `<dt>` term and `<dd>` meaning. Write each `<dt>` as the prose writes the term, with any alias in parentheses after it; the page marks the first use of each term in every section and shows its meaning on hover |
| File or component tree | `<ul class="tree">`; directory `<li class="dir"><code>src/orders/</code><ul>…</ul></li>`; entry `<li data-anchor="file:<path>" data-change="…"><code>name</code><span class="note">responsibility or change</span></li>` |
| Table | `<table>` with `<thead>`; anchored rows `<tr data-anchor="…" data-change="…">` |
| Card | `<article class="card" data-anchor="…" data-change="…"><h3>…</h3>…</article>`, with `<pre><code>` for payloads |
| Code block | `<pre><code>…</code></pre>`; the page colors its syntax (keys, strings, types, comments, HTTP methods). Mark a block that is not code with `<code class="language-text">` |
| More detail | `<details class="more"><summary>label</summary>…</details>`, closed until the reader opens it. Never put a diagram, a decision, or anything else the reviewer must see inside it |
| Callout | `<aside class="callout">`, or `class="callout warning"` for a hazard |
| Questions | `<ol class="questions">` of `<li data-anchor="question:qN">question<p class="recommendation">recommended answer</p></li>` |
| Risks | `<ul class="risks">` of `<li data-anchor="risk:rN">risk<p class="mitigation">mitigation</p></li>` |

## Sections

These sections are the base structure, in their usual order. Skip a section when the change does not touch its subject or its own skip condition below holds, and add or reorder sections when the design reads better that way; a section on the page always has content. Every base section from Architecture to Risks opens with a takeaway.

### 1. `section:summary`, heading `Summary`

What changes, for a reader who reads nothing else. No takeaway: the whole section is one.

- A before-and-after block. Under the today label, two to four short lines on what happens now and the problem it causes. Under the after label, two to four short lines on what happens after the change and the goal it meets.
- A walkthrough of the main use case after the change: three to seven steps, one short sentence each, in plain words. Leave out code, paths, and names the glossary does not hold.

### 2. `section:overview`, heading `Overview`

The glossary terms the design uses, then the decisions. The terms come first, so the reader knows each term before a decision uses it.

- Glossary: each term as `GLOSSARY.md` defines it, plus each other term the reader may not know.
- Decisions: one entry per settled decision. The `<strong>` states the decision in 12 words or fewer. Names of systems, files, and variables are fine there; expressions, commands, lists of conditions, and algorithms are not. The `<p>` gives the reason in one or two sentences. Put the mechanics in the section that owns them (Architecture, Flows, Changes, Data model, or Contracts), not in the decision.

### 3. `section:architecture`, heading `Architecture`

A takeaway, then one Mermaid `flowchart` of the components the change touches and the communications between them, in their target state.

- Keep the first diagram at 12 nodes or fewer. When the change needs more, draw an overview first (`diagram:architecture`, one node per system or group, 8 nodes or fewer), then the full diagram after it (`diagram:architecture-detail`).
- Group components into shallow subgraphs by responsibility or system boundary: entry points, API, storage, background processing, external services. Use `TB` for several layers and `LR` for a short pipeline.
- Give each node a concrete system or module name and a short responsibility, at most two short lines. Append `:::added`, `:::changed`, or `:::removed` to a node the plan touches; the template defines these classes, and untouched nodes keep the default style.
- Label each edge with the mechanism and the essential operation or payload. HTTP: method and route. Database: an edge from the querying component to the database, labeled `SQL SELECT`, `SQL UPDATE`, or the actual storage operation. Queue: producer to queue with `SendMessage · <message type>`, queue to consumer with `ReceiveMessage`. In-process call: `internal call` where it could pass for a network hop. External service: protocol and operation.
- Leave a connection the code does not confirm out of the diagram, and add it to the open questions.
- Keep labels short and crossings few, and move secondary detail into the prose below the diagram. A physical queue or database drawn twice for readability keeps the same name on both copies, with a note that they are one resource.

Follow the diagram with the points needed to read it, one short line each: ownership, the source of truth for each piece of data, synchronous confirmation versus asynchronous processing, and transaction boundaries.

### 4. `section:flows`, heading `Flows`

A takeaway, then a Mermaid `sequenceDiagram` per critical path where order, synchronous versus asynchronous steps, transactions, retries, or idempotency decide the behavior. Show participants by their architecture names. Follow each diagram with at most three short lines on what its order decides. Skip the section when the architecture diagram already makes the order evident.

### 5. `section:changes`, heading `Changes`

A takeaway, then the change tree: the planned files on their real repository paths.

- Show only the directories on the path to a change; collapse every untouched branch.
- A `changed`, `removed`, or `moved` entry names a path that exists today. An `added` entry follows the naming and placement of its neighbors. A `moved` entry notes its old path.
- Include the tests, migrations, configuration, and documentation the change needs.
- Give each entry a one-line note of about 12 words: the responsibility of a new file, or what changes in an existing one. A note names at most three things.
- For several repositories, write one tree per repository with the repository name as its root.

When the change touches UI, add a component tree in the same section, with `component:<Name>` anchors and the props and state that matter.

### 6. `section:data-model`, heading `Data model`

A takeaway, then a Mermaid `erDiagram` of the target schema, built from the schema source of truth with its table and column names.

- Show the touched entities and their direct neighbors. Add `direction LR` when a chain of entities would stack into a tall diagram. Keep each primary key, each foreign key that draws a relationship, and every added or changed column; leave out unrelated columns.
- Mark added and changed attributes with the attribute comment `"added"` or `"changed"`; every attribute of a new entity is `"added"`.

Follow it with a schema change table: entity, column, type and constraints (nullability, default, unique, index, foreign key), and migration note; the row's `data-change` draws its change marker. Write one `column:<Entity>.<column>` row per added, changed, or removed column; a new or removed entity also takes an `entity:<Name>` row before its columns. Removed columns appear only in this table.

Close with the migration notes: additive or destructive, backfill, defaults for existing rows, new indexes and their lock risk on large tables, and the deploy order when running code must keep working across the migration (expand, migrate, contract).

### 7. `section:contracts`, heading `Contracts`

A takeaway, then one card per new or changed contract: HTTP route, message or event, job, webhook, or shared public type. Give its name as the heading, its change state in `data-change`, the request and response or payload shape as a short `<pre><code>` block, and the authentication, errors, and idempotency rules it carries, one short line each. Mark unchanged contracts the change depends on as `unchanged` only when they explain a constraint.

### 8. `section:risks`, heading `Risks`

A takeaway that names the highest risk, then each risk the change brings with its mitigation, in the risks list. Order the risks by impact, highest first. A risk the user accepted says so in its mitigation.

### 9. `section:questions`, heading `Open questions`

One question per gap found while mapping the plan, each with your recommended answer, in the questions list.

### 10. `section:out-of-scope`, heading `Out of scope`

What this change leaves out, as a plain list with one `scope:<key>` anchor per item.
