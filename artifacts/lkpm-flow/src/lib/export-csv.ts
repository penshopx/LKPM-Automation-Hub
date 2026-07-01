function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCell(value: string, delimiter: string): string {
  const safe = neutralizeFormula(value);
  const needsQuotes =
    safe.includes(delimiter) ||
    safe.includes('"') ||
    safe.includes("\n") ||
    safe.includes("\r");
  const escaped = safe.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  delimiter = ";",
): string {
  const lines = [headers, ...rows].map((row) =>
    row
      .map((cell) => escapeCell(cell == null ? "" : String(cell), delimiter))
      .join(delimiter),
  );
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
