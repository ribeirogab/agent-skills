# Sections and markup

Read before writing or reworking the design content.

## Markup contract

The design content is an HTML fragment: the first build wraps it into the page template, which supplies the styles, the table of contents, the change legends, the diagram viewer, Mermaid, and the comment layer. Write content markup only, with the components below; `<html>`, `<head>`, `<body>`, `<main>`, and scripts other than diagrams belong to the template.

- Open with one `<h1>` (the design title, which also titles the page) and one `<p class="lede">` that states the change in one or two sentences.
- Wrap each section in `<section data-anchor="section:<key>">` with one `<h2>`.
- Give every element a reviewer could point at a `data-anchor`: each decision, tree entry, table row, diagram, contract, risk, question, and scope item. Other blocks take comments through their section's anchor, with the block text as the quote. `page` is reserved for the page itself. Build anchor values as `<kind>:<key>` from stable names: `decision:d1`, `file:src/orders/status.ts`, `component:OrderStatusBadge`, `entity:Order`, `column:Order.status`, `contract:PATCH /orders/{id}/status`, `diagram:architecture`. Comments attach through anchors, so keep an anchor unchanged across rebuilds while its element keeps its meaning, and give a reworked element a new anchor.
- Mark change state with `data-change="added|changed|removed|moved|unchanged"` on tree entries, table rows, and cards. The page draws the marker (`+ ~ − →`) and adds a one-line legend under the heading of each section that uses markers.
- Write each diagram as `<script type="text/x-mermaid" data-anchor="diagram:<key>" data-caption="<one line>">…</script>`. The script element keeps `<`, `>`, and `&` literal, so write Mermaid as is.
- State only what the code establishes or the conversation settled, in plain prose without status labels. A point that needs the user's decision, or a connection the code does not confirm, goes to the open questions section.

| Component | Markup |
| --- | --- |
| Decision list | `<ol class="decisions">` of `<li data-anchor="decision:dN"><strong>statement</strong><p>reason, with the repository path of the ADR in <code> when one records it</p></li>` |
| Glossary terms | `<dl class="terms">` of `<dt>` term and `<dd>` meaning |
| File or component tree | `<ul class="tree">`; directory `<li class="dir"><code>src/orders/</code><ul>…</ul></li>`; entry `<li data-anchor="file:<path>" data-change="…"><code>name</code><span class="note">responsibility or change</span></li>` |
| Table | `<table>` with `<thead>`; anchored rows `<tr data-anchor="…" data-change="…">` |
| Card | `<article class="card" data-anchor="…" data-change="…"><h3>…</h3>…</article>`, with `<pre><code>` for payloads |
| Code block | `<pre><code>…</code></pre>`; the page colors its syntax (keys, strings, types, comments, HTTP methods). Mark a block that is not code with `<code class="language-text">` |
| Callout | `<aside class="callout">`, or `class="callout warning"` for a hazard |
| Questions | `<ol class="questions">` of `<li data-anchor="question:qN">question<p class="recommendation">recommended answer</p></li>` |
| Risks | `<ul class="risks">` of `<li data-anchor="risk:rN">risk<p class="mitigation">mitigation</p></li>` |

## Sections

Write the sections in this order. Skip a section when the change does not touch its subject, or when its own skip condition below holds; a section on the page always has content.

### 1. Overview (`section:overview`)

The problem, the goal, and the decisions list: one entry per settled decision, with its reason and the ADR that records it. Follow with the glossary terms the design uses, as `GLOSSARY.md` defines them.

### 2. Architecture (`section:architecture`)

One Mermaid `flowchart` of the components the change touches and the communications between them, in their target state.

- Group components into shallow subgraphs by responsibility or system boundary: entry points, API, storage, background processing, external services. Use `TB` for several layers and `LR` for a short pipeline.
- Give each node a concrete system or module name and a short responsibility, at most two short lines. Append `:::added`, `:::changed`, or `:::removed` to a node the plan touches; the template defines these classes, and untouched nodes keep the default style.
- Label each edge with the mechanism and the essential operation or payload. HTTP: method and route. Database: an edge from the querying component to the database, labeled `SQL SELECT`, `SQL UPDATE`, or the actual storage operation. Queue: producer to queue with `SendMessage · <message type>`, queue to consumer with `ReceiveMessage`. In-process call: `internal call` where it could pass for a network hop. External service: protocol and operation.
- Leave a connection the code does not confirm out of the diagram, and add it to the open questions.
- Keep labels short and crossings few, and move secondary detail into the prose below the diagram. A physical queue or database drawn twice for readability keeps the same name on both copies, with a note that they are one resource.

Follow the diagram with the points needed to read it: ownership, the source of truth for each piece of data, synchronous confirmation versus asynchronous processing, and transaction boundaries.

### 3. Flows (`section:flows`)

A Mermaid `sequenceDiagram` per critical path where order, synchronous versus asynchronous steps, transactions, retries, or idempotency decide the behavior. Show participants by their architecture names. Skip the section when the architecture diagram already makes the order evident.

### 4. Changes (`section:changes`)

The change tree: the planned files on their real repository paths.

- Show only the directories on the path to a change; collapse every untouched branch.
- A `changed`, `removed`, or `moved` entry names a path that exists today. An `added` entry follows the naming and placement of its neighbors. A `moved` entry notes its old path.
- Include the tests, migrations, configuration, and documentation the change needs.
- Give each entry a one-line note: the responsibility of a new file, or what changes in an existing one.
- For several repositories, write one tree per repository with the repository name as its root.

When the change touches UI, add a component tree in the same section, with `component:<Name>` anchors and the props and state that matter.

### 5. Data model (`section:data-model`)

A Mermaid `erDiagram` of the target schema, built from the schema source of truth with its table and column names.

- Show the touched entities and their direct neighbors. Add `direction LR` when a chain of entities would stack into a tall diagram. Keep each primary key, each foreign key that draws a relationship, and every added or changed column; leave out unrelated columns.
- Mark added and changed attributes with the attribute comment `"added"` or `"changed"`; every attribute of a new entity is `"added"`.

Follow it with a schema change table: entity, column, type and constraints (nullability, default, unique, index, foreign key), and migration note; the row's `data-change` draws its change marker. Write one `column:<Entity>.<column>` row per added, changed, or removed column; a new or removed entity also takes an `entity:<Name>` row before its columns. Removed columns appear only in this table.

Close with the migration notes: additive or destructive, backfill, defaults for existing rows, new indexes and their lock risk on large tables, and the deploy order when running code must keep working across the migration (expand, migrate, contract).

### 6. Contracts (`section:contracts`)

One card per new or changed contract: HTTP route, message or event, job, webhook, or shared public type. Give its name as the heading, its change state in `data-change`, the request and response or payload shape as a short `<pre><code>` block, and the authentication, errors, and idempotency rules it carries. Mark unchanged contracts the change depends on as `unchanged` only when they explain a constraint.

### 7. Risks and open questions (`section:risks`)

Risks with their mitigation; open questions with your recommended answer, one per gap found while mapping the plan; then what stays out of scope, as a list with `scope:<key>` anchors.
