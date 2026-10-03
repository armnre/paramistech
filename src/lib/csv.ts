export function toCsv(rows: Array<Record<string, string | number | boolean | null>>) {
  if (rows.length === 0) return '\uFEFF';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [headers.map(escape).join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))];
  return `\uFEFF${lines.join('\r\n')}`;
}
