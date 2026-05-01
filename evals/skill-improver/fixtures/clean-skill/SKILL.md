---
name: clean-skill
description: Extracts text from PDF files and saves it to a destination path provided by the caller. Use when the user wants to convert a PDF to plain text, when the user mentions PDF text extraction, or when they reference .pdf files and want the textual content. Do NOT use to render PDFs as images, fill PDF forms, or merge multiple PDFs — use a dedicated PDF rendering or form-filling skill for those workflows.
---

# Clean Skill

A minimal, conformant fixture skill used to verify that the auditor does not invent findings on a skill that already follows Anthropic's authoring rules.

## When to invoke

When invoked, extract text from a PDF file at the path the user provides and save the result to a `.txt` file at the destination path the user specifies.

## Workflow

1. Read the PDF path and destination path from the user's message.
2. Extract text page by page using the standard PDF library available in the runtime.
3. Concatenate the per-page text with a single blank line between pages.
4. Write the concatenated text to the destination path as UTF-8.
5. Report the number of pages processed and the destination path.

See [references/extraction-tips.md](references/extraction-tips.md) for handling scanned PDFs and password-protected files.
