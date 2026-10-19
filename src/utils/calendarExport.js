const DAY_INDEX_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Formats a JavaScript Date object into an ICS local/UTC timestamp: YYYYMMDDTHHMMSS
 */
function formatICSDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escapes special characters for RFC 5545 ICS text fields.
 */
function escapeICSText(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Resolves a class's day name + minutes-since-midnight into a concrete Date object
 * for the current/next occurrence of that weekday.
 */
export function resolveClassDateTime(dayName, totalMinutes) {
  const now = new Date();
  const targetDayIndex =
    DAY_INDEX_MAP[String(dayName || '').trim().toLowerCase()] ?? now.getDay();
  const currentDayIndex = now.getDay();

  let daysUntil = (targetDayIndex - currentDayIndex + 7) % 7;
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  result.setHours(hours, minutes, 0, 0);

  // If the event is today and already ended, schedule it for next week's occurrence
  if (daysUntil === 0 && result.getTime() < now.getTime() - 2 * 60 * 60 * 1000) {
    result.setDate(result.getDate() + 7);
  }

  return result;
}

/**
 * Generates and downloads a standard .ics calendar event file purely client-side.
 * Prompts iOS / macOS / Android Calendar to add the event with a 15-minute native alert.
 *
 * @param {{ title: string, start: Date | string, end: Date | string, location?: string, description?: string }} event
 */
export function downloadICS(event) {
  if (!event) return;

  const {
    title = 'University Class',
    start,
    end,
    location = '',
    description = '',
  } = event;

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  const dtStamp = formatICSDate(new Date());
  const dtStart = formatICSDate(startDate);
  const dtEnd = formatICSDate(endDate);
  const uid = `${crypto.randomUUID()}@emefa.companion`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Haven//Warm Glass PWA//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICSText(title)}`,
    `LOCATION:${escapeICSText(location)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    'RRULE:FREQ=WEEKLY',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSText(`Reminder: ${title} starts in 15 minutes, babe ✨`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const icsContent = icsLines.join('\r\n');
  const blob = new Blob([icsContent], {
    type: 'text/calendar;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeFilename = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  link.href = url;
  link.setAttribute('download', `${safeFilename || 'class'}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default downloadICS;
