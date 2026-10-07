# Review comments

Read when the user says they left comments on the design page.

The page saves each comment into `design.html` itself, as the embedded `review-comments` JSON, through the design server. The helper reads the comments and writes your replies into the same file, and the open page shows each reply within a few seconds. A page opened without the server keeps new comments in the browser; the user then pastes them into the chat as Markdown, and that paste is the comment list, answered in the chat.

## 1. Read

Run `comments <design-file>`. Each entry gives the comment id, the location (section and element), the anchor, the quoted text or diagram node, the comment, and the thread of replies; the anchor `page` means the title or the lead paragraph. An entry marked `outdated` points to an anchor the current content no longer has; locate it from its location and quote.

## 2. Address each comment

| Comment | Action |
| --- | --- |
| Question about the design | Answer it with evidence from the code or the conversation. Change the content only when the answer exposes a gap in it. |
| Correction or change that fits the settled decisions | Apply it to the content, and to `GLOSSARY.md` or the ADR when it changes a term or a recorded decision. |
| Change that reverses a settled decision, or that has more than one reasonable reading | Leave the content as it is and ask one concrete question with your recommended answer. |

Reply to every comment with `reply <design-file> <id> "<text>"`, stating what changed, the answer, or the question; pass `-` as the text to read it from standard input. Add `--resolve` when the reply closes the comment, and leave a comment that asks the user something open.

The server and the helper both write into `design.html`, so read the file again right before you edit its content.

**Ready when:** every open comment has a reply from this round, and every applied change is in the content.

## 3. Rebuild and report

Rebuild and check as in step 3 of the skill. Then send a short chat message that states each decision changed in this round as a plain sentence, so the conversation carries it to `/to-spec`, and lists the questions left open on the page. End the turn.
