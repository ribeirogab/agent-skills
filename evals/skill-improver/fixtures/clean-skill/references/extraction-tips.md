# Extraction tips

## Contents

- Scanned PDFs (OCR fallback)
- Password-protected files
- Tables and columns

## Scanned PDFs

When the standard text extractor returns empty pages, the PDF is likely a scanned image. Switch to an OCR pipeline before retrying.

## Password-protected files

Prompt the user for the password. Do not attempt to bypass protection.

## Tables and columns

Standard extraction loses table structure. When the user explicitly asks for tabular output, use a table-aware extractor instead.
