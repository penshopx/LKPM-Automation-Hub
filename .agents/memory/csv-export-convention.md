---
name: CSV export convention
description: How client-side CSV/spreadsheet exports should be produced in LKPM-Flow
---

# CSV export convention

Client-side CSV exports (e.g. reports recap) go through `artifacts/lkpm-flow/src/lib/export-csv.ts`
(`toCsv` + `downloadCsv`). Follow these rules for any new export:

- **Delimiter `;` (semicolon), not `,`.** Indonesian-locale Excel uses `;` as its list separator, so a comma-delimited file lands all columns in one cell when double-clicked.
- **Prepend a UTF-8 BOM (`\uFEFF`) to the blob** so Excel reads Indonesian characters correctly.
- **Neutralize formula injection**: any cell whose first char is `= + - @` (or leading tab/CR) is prefixed with a `'`. User-influenced fields (project/maker/checker names, OSS receipt) would otherwise execute as formulas in Excel.
- Quote cells containing the delimiter, `"`, or newlines; double embedded quotes; rows joined with `\r\n`.

**Why:** first CSV export shipped comma-delimited/no-BOM and would have broken for the target (Indonesian Excel) users; formula injection was flagged in code review as a real risk on user-entered text.

**How to apply:** reuse `toCsv`/`downloadCsv` rather than hand-rolling CSV; map enum-like fields through the `labelOf` label maps in `@/lib/labels` for human-readable Indonesian values.
