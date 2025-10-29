/**
 * Timestamp Parser Utility
 *
 * Parses {{MM:SS}} and {{HH:MM:SS}} timestamp patterns from AI analysis text
 * and provides utilities for timestamp formatting/parsing.
 */

/**
 * Parsed timestamp information
 */
export interface ParsedTimestamp {
  /** Unique identifier for this timestamp */
  id: string;

  /** Time in seconds */
  timestamp: number;

  /** Formatted display string (e.g., "01:30") */
  displayTime: string;

  /** Character position where timestamp starts in original text */
  startIndex: number;

  /** Character position where timestamp ends in original text */
  endIndex: number;
}

/**
 * Text segment - either plain text or a timestamp
 */
export interface ParsedTextSegment {
  /** Segment type */
  type: 'text' | 'timestamp';

  /** Text content or display time */
  content: string;

  /** Timestamp data if type is 'timestamp' */
  timestamp?: ParsedTimestamp;
}

/**
 * Parse analysis text and extract timestamp segments
 *
 * @param text - Analysis text with {{MM:SS}} or {{HH:MM:SS}} patterns
 * @returns Array of text and timestamp segments for rendering
 *
 * @example
 * Input: "Great intro at {{01:30}} but ending at {{05:45}} needs work"
 * Output: [
 *   { type: 'text', content: 'Great intro at ' },
 *   { type: 'timestamp', content: '01:30', timestamp: {...} },
 *   { type: 'text', content: ' but ending at ' },
 *   { type: 'timestamp', content: '05:45', timestamp: {...} },
 *   { type: 'text', content: ' needs work' }
 * ]
 */
export function parseAnalysisText(text: string): ParsedTextSegment[] {
  if (!text || text.length === 0) {
    return [];
  }

  // Regex pattern: {{MM:SS}} or {{HH:MM:SS}}
  // Captures: {{hours?:minutes:seconds}}
  const timestampRegex = /\{\{(\d{1,2}):(\d{2})(?::(\d{2}))?\}\}/g;

  const segments: ParsedTextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let timestampCounter = 0;

  while ((match = timestampRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // Add text segment before this timestamp (if any)
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, matchStart)
      });
    }

    // Parse the timestamp
    const hasHours = match[3] !== undefined;
    let seconds: number;
    let displayTime: string;

    if (hasHours) {
      // HH:MM:SS format
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const secs = parseInt(match[3], 10);

      // Validation: minutes and seconds should be < 60
      if (minutes >= 60 || secs >= 60) {
        console.warn(`Invalid timestamp format: ${match[0]} - minutes/seconds should be < 60`);
      }

      seconds = hours * 3600 + minutes * 60 + secs;
      displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      // MM:SS format
      const minutes = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);

      // Validation: seconds should be < 60
      if (secs >= 60) {
        console.warn(`Invalid timestamp format: ${match[0]} - seconds should be < 60`);
      }

      seconds = minutes * 60 + secs;
      displayTime = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Create timestamp segment
    const parsedTimestamp: ParsedTimestamp = {
      id: `timestamp-${timestampCounter++}-${seconds}`,
      timestamp: seconds,
      displayTime: displayTime,
      startIndex: matchStart,
      endIndex: matchEnd
    };

    segments.push({
      type: 'timestamp',
      content: displayTime,
      timestamp: parsedTimestamp
    });

    lastIndex = matchEnd;
  }

  // Add remaining text after last timestamp (if any)
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
}

/**
 * Format seconds to MM:SS or HH:MM:SS string
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 *
 * @example
 * formatTimestamp(90) => "01:30"
 * formatTimestamp(3661) => "01:01:01"
 * formatTimestamp(0) => "00:00"
 */
export function formatTimestamp(seconds: number): string {
  // Handle edge cases
  if (seconds < 0) {
    console.warn('formatTimestamp: negative seconds, treating as 0');
    seconds = 0;
  }

  if (!isFinite(seconds) || isNaN(seconds)) {
    console.warn('formatTimestamp: invalid seconds value, treating as 0');
    seconds = 0;
  }

  // Round to nearest second
  seconds = Math.floor(seconds);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    // HH:MM:SS format
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    // MM:SS format
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 *
 * @param timeString - Time string in "MM:SS" or "HH:MM:SS" format
 * @returns Time in seconds, or 0 if malformed
 *
 * @example
 * parseTimestamp("01:30") => 90
 * parseTimestamp("01:01:01") => 3661
 * parseTimestamp("invalid") => 0
 */
export function parseTimestamp(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') {
    console.warn('parseTimestamp: invalid input, returning 0');
    return 0;
  }

  const parts = timeString.split(':');

  if (parts.length === 2) {
    // MM:SS format
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (isNaN(minutes) || isNaN(seconds)) {
      console.warn(`parseTimestamp: invalid MM:SS format "${timeString}", returning 0`);
      return 0;
    }

    if (seconds >= 60) {
      console.warn(`parseTimestamp: seconds >= 60 in "${timeString}"`);
    }

    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      console.warn(`parseTimestamp: invalid HH:MM:SS format "${timeString}", returning 0`);
      return 0;
    }

    if (minutes >= 60 || seconds >= 60) {
      console.warn(`parseTimestamp: minutes or seconds >= 60 in "${timeString}"`);
    }

    return hours * 3600 + minutes * 60 + seconds;
  } else {
    console.warn(`parseTimestamp: unexpected format "${timeString}", returning 0`);
    return 0;
  }
}

/**
 * UNIT TEST EXAMPLES (manual testing, no jest required)
 *
 * Test parseAnalysisText():
 * -----------------------
 * Input: "Great intro at {{01:30}} but the ending at {{05:45}} needs work"
 * Expected: 5 segments
 *   [0]: { type: 'text', content: 'Great intro at ' }
 *   [1]: { type: 'timestamp', content: '01:30', timestamp: { timestamp: 90, ... } }
 *   [2]: { type: 'text', content: ' but the ending at ' }
 *   [3]: { type: 'timestamp', content: '05:45', timestamp: { timestamp: 345, ... } }
 *   [4]: { type: 'text', content: ' needs work' }
 *
 * Input: ""
 * Expected: []
 *
 * Input: "No timestamps here"
 * Expected: [{ type: 'text', content: 'No timestamps here' }]
 *
 * Input: "{{01:00}}{{02:00}}"
 * Expected: 2 timestamp segments
 *   [0]: { type: 'timestamp', content: '01:00', timestamp: { timestamp: 60, ... } }
 *   [1]: { type: 'timestamp', content: '02:00', timestamp: { timestamp: 120, ... } }
 *
 * Input: "Watch at {{01:23:45}} for the best part"
 * Expected: 3 segments with HH:MM:SS format
 *   [0]: { type: 'text', content: 'Watch at ' }
 *   [1]: { type: 'timestamp', content: '01:23:45', timestamp: { timestamp: 5025, ... } }
 *   [2]: { type: 'text', content: ' for the best part' }
 *
 * Test formatTimestamp():
 * ----------------------
 * formatTimestamp(90) => "01:30"
 * formatTimestamp(3661) => "01:01:01"
 * formatTimestamp(0) => "00:00"
 * formatTimestamp(59) => "00:59"
 * formatTimestamp(3600) => "01:00:00"
 * formatTimestamp(-10) => "00:00" (handles negative)
 * formatTimestamp(NaN) => "00:00" (handles NaN)
 *
 * Test parseTimestamp():
 * ---------------------
 * parseTimestamp("01:30") => 90
 * parseTimestamp("01:01:01") => 3661
 * parseTimestamp("00:00") => 0
 * parseTimestamp("invalid") => 0
 * parseTimestamp("") => 0
 * parseTimestamp("1:2:3:4") => 0 (too many parts)
 */
