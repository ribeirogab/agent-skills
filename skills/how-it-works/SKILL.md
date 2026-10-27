---
name: how-it-works
description: Builds a single-file HTML page that shows how a feature, a user flow, or a whole product works, screen by screen, with real screenshots in a carousel. Use when the user wants to explain how something works to a team, a client, or new users, or asks for a visual guide or walkthrough of a feature, flow, or site.
---

# how-it-works

Turn a feature, a flow (checkout, onboarding, a refund), or a whole product into one page that teaches a reader how it works, with the real screens. The reader uses the product, not its code: support, operations, sales, a client, a new teammate. The page is one self-contained file, `.scratch/<slug>/how-it-works.html`, built from the content you write in `.scratch/<slug>/content.html` and the images in `.scratch/<slug>/screens/`.

The helper `scripts/how_it_works.py` (Python 3, standard library only) builds and serves the page. Run it from the repository root as `python3 <skill-dir>/scripts/how_it_works.py <command> <file>`; each command explains its options with `--help`.

## 1. Map the subject to screens

Settle three things from the conversation, the issue or spec, and the code: the subject, the reader, and what the reader must be able to do or tell apart after reading. Ask the user only what none of these answer.

Read the repository's screen capture recipe when it has one: `docs/agents/screen-capture.md`, or the doc that `AGENTS.md` names for capturing screens. It names where the screens come from (a prototype, a design site, a local environment, staging), how to sign in, the URL of each state, and the element to crop. Without one, find the screens yourself in that order: a running app or local environment, a published prototype or Storybook, a staging site. Ask the user for images only when you can open none of them.

List the steps the reader goes through, in the order they meet them. Give each step the one screen state that shows it. Collect the rules the subject enforces from the code, the spec, and the glossary, and the real names the product uses: button labels and screen titles as the interface spells them, glossary terms as the glossary writes them.

**Ready when:** every step has a screen state you can open, and every rule traces to the code, the spec, or the conversation.

## 2. Capture the screens

Read [references/screens.md](references/screens.md) and capture every state into `.scratch/<slug>/screens/`, reusing the slug the subject already has under `.scratch/`.

**Ready when:** every step's screen is a file in `screens/`, and you looked at each file and saw the state the step describes.

## 3. Write the content

Write `.scratch/<slug>/content.html` with [references/sections.md](references/sections.md) as the structure, under its writing rules and markup contract. Write all text in the language of your conversation with the user, and quote interface names exactly as the product spells them.

**Ready when:** the lede alone tells what the subject does, every step shows its screen, and every rule fits on one line.

## 4. Build and look

1. `build .scratch/<slug>/content.html --lang <content-language-tag>` checks the content, embeds the screens, and writes `how-it-works.html` next to it. A problem stops the build; a warning names a long sentence, a long heading, a section without a takeaway, or a heavy image. Fix every problem and every warning, then build again.
2. Look at the built page once with your browser tool: at phone width (390 px) and desktop width, in light and dark, and with the carousel open. Fix what is clipped, overlapping, or unreadable, then build again.

**Ready when:** the build reports no problem and no warning, and the look showed nothing broken.

## 5. Hand over

- When your host publishes pages (a Claude artifact, for example), build again with `--fragment` and publish `how-it-works.fragment.html`.
- Otherwise start `serve .scratch/<slug>/how-it-works.html` as a background process. It prints a local URL and reloads an open page after each build. On a remote host, give the URL the user can open from their machine.

Send a short message with the link, the absolute path of `how-it-works.html`, and the sections and number of screens on the page. End the turn.

When the subject changes later, capture the changed screens again, edit `content.html`, and repeat step 4.
