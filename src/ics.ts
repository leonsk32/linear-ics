export type Issue = { id: string; identifier: string; title: string; dueDate: string; url: string };

const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
const ymd = (d: string) => d.replaceAll('-', '');

// RFC 5545: lines longer than 75 octets must be folded
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 75) {
      out.push(cur);
      cur = ' ';
    }
    cur += ch;
  }
  return [...out, cur].join('\r\n');
}

export function toIcs(issues: Issue[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//linear-ics//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Linear 期限',
  ];
  for (const i of issues) {
    const end = new Date(`${i.dueDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${i.id}@linear-ics`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(i.dueDate)}`,
      `DTEND;VALUE=DATE:${ymd(end.toISOString().slice(0, 10))}`,
      `SUMMARY:${esc(`[${i.identifier}] ${i.title}`)}`,
      `URL:${i.url}`,
      `DESCRIPTION:${esc(i.url)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
