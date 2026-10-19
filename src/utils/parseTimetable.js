import * as XLSX from 'xlsx';

const DAY_MAP = {
  monday: 'Monday',
  mon: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
};

const TIME_RANGE_REGEX = /(\d{1,2}:\d{2})\s*[-–—to]+\s*(\d{1,2}:\d{2})/i;
const ROOM_TIME_REGEX = /^(.*?)\s*\(([^)]+)\)\s*$/;

/**
 * Normalizes a cell string to a canonical weekday name (Monday-Friday) if it matches.
 * Handles uppercase raw Excel values like "MONDAY", "TUESDAY", etc.
 */
function normalizeDayName(value) {
  if (!value && value !== 0) return null;
  const cleaned = String(value).trim().toLowerCase().replace(/\.$/, '');
  return DAY_MAP[cleaned] || null;
}

/**
 * Extracts startTime and endTime from a time range string like "6:00-7:00" or "3:30-5:30".
 */
function parseTimeRange(rawRange) {
  if (!rawRange) return { startTime: '', endTime: '' };
  const match = String(rawRange).trim().match(TIME_RANGE_REGEX);
  if (match) {
    return {
      startTime: match[1].trim(),
      endTime: match[2].trim(),
    };
  }
  const parts = String(rawRange).split(/[-–—]/).map((s) => s.trim());
  return {
    startTime: parts[0] || '',
    endTime: parts[1] || '',
  };
}

/**
 * Splits a single cell's text into independent class blocks and parses each block.
 * Overlapping divisions in the same cell are separated by `---`:
 *   RP 3A 383
 *   BE METEKU
 *   GE 1  (3:30-4:30)
 *   ---
 *   RP 3B 361
 *   L BREW
 *   LH 8  (3:30-5:30)
 */
export function parseCellBlocks(cellText, fallbackTimeRange) {
  if (!cellText || !String(cellText).trim()) return [];

  // CRITICAL: First split the cell text by `---` (supporting `\n---\n` or any `---` divider)
  const rawSegments = String(cellText)
    .split(/\r?\n?\s*-{3,}\s*\r?\n?/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const parsedEntries = [];

  for (const segment of rawSegments) {
    const lines = segment
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) continue;

    // Also support sub-blocks if multiple classes exist inside a segment without `---`
    const subBlocks = [];
    let currentSubBlock = [];

    for (const line of lines) {
      currentSubBlock.push(line);
      if (ROOM_TIME_REGEX.test(line) && currentSubBlock.length >= 2) {
        subBlocks.push(currentSubBlock);
        currentSubBlock = [];
      }
    }
    if (currentSubBlock.length >= 2) {
      subBlocks.push(currentSubBlock);
    }

    for (const block of subBlocks) {
      const course = block[0]?.trim() || '';
      if (!course) continue;

      // CRITICAL 3B FILTER (applied AFTER splitting by `---`):
      // Discard any block where the course code contains '3B'
      if (course.toUpperCase().includes('3B')) {
        continue;
      }

      let lecturer = '';
      let roomAndTimeLine = '';

      if (block.length === 2) {
        lecturer = 'TBA';
        roomAndTimeLine = block[1];
      } else {
        lecturer = block.slice(1, block.length - 1).join(' / ').trim();
        roomAndTimeLine = block[block.length - 1];
      }

      let room = roomAndTimeLine;
      let startTime = fallbackTimeRange?.startTime || '';
      let endTime = fallbackTimeRange?.endTime || '';

      const roomTimeMatch = roomAndTimeLine.match(ROOM_TIME_REGEX);
      if (roomTimeMatch) {
        room = roomTimeMatch[1].trim();
        const extractedTime = parseTimeRange(roomTimeMatch[2]);
        if (extractedTime.startTime) startTime = extractedTime.startTime;
        if (extractedTime.endTime) endTime = extractedTime.endTime;
      }

      // Determine class type based on room
      const upperRoom = room.toUpperCase();
      let type = 'lecture';
      if (upperRoom === 'VLE' || upperRoom.includes('VLE')) {
        type = 'vle';
      } else if (upperRoom.includes('FIELD')) {
        type = 'fieldwork';
      }

      parsedEntries.push({
        course,
        lecturer,
        room,
        startTime,
        endTime,
        type,
      });
    }
  }

  return parsedEntries;
}

/**
 * Parses an XLSX workbook into a flat array of timetable class objects.
 */
export function parseWorkbook(workbook) {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  // 1. Identify column time headers (e.g., "6:00-7:00" to "6:30-7:30")
  const columnTimes = {};
  for (let r = 0; r < Math.min(grid.length, 6); r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (TIME_RANGE_REGEX.test(cellVal)) {
        columnTimes[c] = parseTimeRange(cellVal);
      }
    }
  }

  // 2. Iterate through the grid rows and columns
  const results = [];
  const seenKeys = new Set();
  let currentDay = null;

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    if (row.length === 0) continue;

    // Check first two columns for a Day label (MONDAY - FRIDAY)
    let dayColumnIndex = -1;
    for (let c = 0; c < Math.min(2, row.length); c++) {
      const detectedDay = normalizeDayName(row[c]);
      if (detectedDay) {
        currentDay = detectedDay;
        dayColumnIndex = c;
        break;
      }
    }

    if (!currentDay) continue;

    const startCol = dayColumnIndex >= 0 ? dayColumnIndex + 1 : 1;

    for (let c = startCol; c < row.length; c++) {
      const cellValue = row[c];
      if (!cellValue || !String(cellValue).trim()) continue;

      // Skip header cells if they appear mid-grid
      if (
        TIME_RANGE_REGEX.test(String(cellValue).trim()) &&
        !String(cellValue).includes('\n')
      ) {
        continue;
      }

      const fallbackTime = columnTimes[c] || { startTime: '', endTime: '' };
      const parsedBlocks = parseCellBlocks(cellValue, fallbackTime);

      for (const item of parsedBlocks) {
        const dedupeKey = `${currentDay}|${item.course}|${item.startTime}|${item.endTime}|${item.room}`;
        if (seenKeys.has(dedupeKey)) continue;
        seenKeys.add(dedupeKey);

        const safeId =
          typeof crypto !== 'undefined' &&
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `cls-${r}-${c}-${results.length}`;

        results.push({
          id: safeId,
          day: currentDay,
          startTime: item.startTime,
          endTime: item.endTime,
          course: item.course,
          lecturer: item.lecturer,
          room: item.room,
          type: item.type,
        });
      }
    }
  }

  return results;
}

/**
 * Reads an uploaded .xlsx File (or ArrayBuffer) and resolves to the parsed timetable array.
 */
export async function parseExcelFile(file) {
  if (!file) {
    throw new Error('No Excel file provided.');
  }

  let dataBuffer;
  if (file instanceof ArrayBuffer || ArrayBuffer.isView(file)) {
    dataBuffer = file;
  } else if (typeof file.arrayBuffer === 'function') {
    dataBuffer = await file.arrayBuffer();
  } else {
    dataBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read Excel file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  const workbook = XLSX.read(dataBuffer, { type: 'array' });
  return parseWorkbook(workbook);
}

export default parseExcelFile;
