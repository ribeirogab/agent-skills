# Lessons

Read before you write `lesson:design` in step 2 of the skill, and when the user says they left explanation requests on the design.

A lesson teaches the reader a concept the design uses. It is a reading aid, not a decision: it records no choice, `/to-spec` and implementation skip it, and the design sections stay the source of every requirement. The page hides each lesson from the flow, marks the element it explains, and opens it as a panel of steps that ends with a quiz. The quiz is a self-check: the score stays in the reader's browser.

## A good lesson

- Start from what the reader already knows, and reach the concept one step at a time.
- Open with the problem the concept solves, before its definition.
- Show what the system does step by step, with a concrete example built from the design's own data: its tables, rows, routes, and names.
- Show the behavior before and after when timing decides it.
- Compare the concept with the alternative the reader already knows, then close with its cautions.
- Put the optional deep dive in a closed `<details class="more">`.
- End with a quiz of two to four questions on what the lesson taught. Each wrong choice is a plausible misunderstanding, and each `why` explains the right answer.
- Write under the rules in [sections.md](sections.md): short sentences, one term per concept.

## Markup

```html
<section class="lesson" data-anchor="lesson:<key>" data-lesson-for="<anchor of the element it explains>" data-lesson-term="<word to mark>">
  <h2>title</h2>
  <p class="takeaway">the answer, in one or two sentences</p>
  <h3>first step</h3>
  <p>…</p>
  <h3>quiz step</h3>
  <ol class="quiz">
    <li>
      <p>question</p>
      <ul class="choices">
        <li>choice</li>
        <li data-correct>right choice</li>
        <li>choice</li>
      </ul>
      <p class="why">why the right choice is right</p>
    </li>
  </ol>
</section>
```

- Put every lesson at the end of the content, after the base sections, as a top-level section.
- Write the `<h2>` and every step heading in the language of the conversation.
- Each `<h3>` directly inside the section starts one step of the panel, so give every step one. Use the components of [sections.md](sections.md) inside a step: walkthroughs, tables, before-and-after blocks, code blocks, and callouts.
- `data-lesson-for` names the anchor of the element the lesson explains, or `page` for the whole design. `data-lesson-term` names a word or short phrase exactly as that element's text spells it; the page underlines it and opens the lesson from it. Without a term, the page puts a book icon beside the element.
- Keep a lesson anchor unchanged across rebuilds: answered requests point to it.

## The design lesson

Every design has `lesson:design`, with `data-lesson-for="page"`. The page offers it under the lede, as the first thing to read. It teaches the whole change to the developer who will build it: the problem, what changes, the main flow step by step, an example with real data, the behavior before and after, what changes in the code, and the cautions. Its quiz checks the main decisions in three to five questions.

Write it in step 2 of the skill, after the design sections, and rewrite it whenever a decision changes.

## Answer explanation requests

The page saves each explanation request into `design.html`, next to the review comments, through the design server. A page opened without the server keeps new requests in the browser; the user then pastes them into the chat with the open comments, and that paste is the request list.

### 1. Read

Run `requests <design-file>`. Each entry gives the request id, the location, the anchor, the quoted text, what the reader wants to understand, and the replies. An entry marked `outdated` points to an anchor the content no longer has; locate it from its location and quote. A request whose anchor is a lesson asks a follow-up on that lesson.

### 2. Write the lessons

Write one lesson per concept under the rules above; requests about the same concept share one lesson. Set `data-lesson-for` to the request's anchor, or, for a follow-up, to the `data-lesson-for` of the lesson it follows. Set `data-lesson-term` to the quoted word when it is a word or short phrase of that element.

A request that exposes a gap or an error in the design also needs the fix: apply it to the content as [review-comments.md](review-comments.md) describes, and tell the user in the chat.

The server and the helper both write into `design.html`, so read the file again right before you edit its content.

**Ready when:** every open request has a lesson in the content that answers it.

### 3. Answer, rebuild, and report

Run `answer <design-file> <id> lesson:<key>` for each request. It closes the request with a reply that points to its lesson, and it accepts only a lesson the content already has. Then rebuild and check as in step 3 of the skill.

Send a short chat message that lists each lesson added, one line each with its title and the request it answers, and says that the lessons change no decision. End the turn.

**Ready when:** `requests` lists no open request, and the build reports no problem and no warning.
