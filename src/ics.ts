export type Issue = { id: string; identifier: string; title: string; dueDate: string; url: string; priority: number };

// Linear priority: 0 none, 1 urgent, 2 high, 3 medium, 4 low
const PRIORITY = ['', '🔴 ', '🟠 ', '🟡 ', '🔵 '];

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
  // ponytail: "today" is fixed to JST, make it configurable if anyone outside Japan uses this
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD
  for (const i of issues) {
    // Overdue issues are pinned to today so they can't be missed
    const overdue = i.dueDate < today;
    const day = overdue ? today : i.dueDate;
    const end = new Date(`${day}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${i.id}@linear-ics`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(day)}`,
      `DTEND;VALUE=DATE:${ymd(end.toISOString().slice(0, 10))}`,
      `SUMMARY:${esc(`${overdue ? `⚠️期限超過(${i.dueDate.slice(5).replace('-', '/')}) ` : ''}${PRIORITY[i.priority] ?? ''}[${i.identifier}] ${i.title}`)}`,
      `URL:${i.url}`,
      `DESCRIPTION:${esc(i.url)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
