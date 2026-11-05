/**
 * Format numbers as Indian Rupees (₹)
 * e.g. 128450 -> ₹1,28,450
 */
export function formatINR(val, includeDecimals = false) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  const isNegative = num < 0;
  const absVal = Math.abs(num);

  let formatted = absVal.toLocaleString('en-IN', {
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

export function formatCompactINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  const isNegative = num < 0;
  const abs = Math.abs(num);

  if (abs >= 10000000) {
    const cr = parseFloat((abs / 10000000).toFixed(2));
    return `${isNegative ? '-' : ''}₹${cr}Cr`;
  }
  if (abs >= 100000) {
    const l = parseFloat((abs / 100000).toFixed(2));
    return `${isNegative ? '-' : ''}₹${l}L`;
  }
  if (abs >= 1000) {
    const k = parseFloat((abs / 1000).toFixed(1));
    return `${isNegative ? '-' : ''}₹${k}K`;
  }
  return `${isNegative ? '-' : ''}₹${abs.toFixed(0)}`;
}

export function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  const num = Number(val);
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // 1. Matches YYYY-MM-DD or YYYY/MM/DD (with optional time or ISO suffix)
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const day = String(d).padStart(2, '0');
      return `${day} ${months[monthNum - 1]} ${y}`;
    }
  }

  // 2. Matches DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = parseInt(m, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const day = String(d).padStart(2, '0');
      return `${day} ${months[monthNum - 1]} ${y}`;
    }
  }

  // 3. Matches e.g. "3 November 2026" or "03 Nov 2026" or "31 Nov 2026"
  const namedMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (namedMatch) {
    const [, d, monStr, y] = namedMatch;
    const day = String(d).padStart(2, '0');
    const shortMon = monStr.slice(0, 3);
    const capitalizedMon = shortMon.charAt(0).toUpperCase() + shortMon.slice(1).toLowerCase();
    return `${day} ${capitalizedMon} ${y}`;
  }

  // 4. Fallback: Parse with Date object
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a time string (e.g. "19:42:00", "19:42", "07:42", "09:30") to 12-hour format with AM/PM (e.g. "07:42 PM", "09:30 AM")
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const str = String(timeStr).trim();

  // If already contains AM/PM
  if (/am|pm/i.test(str)) {
    return str.toUpperCase();
  }

  // Matches HH:MM or HH:MM:SS
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const strHours = String(hours).padStart(2, '0');
    return `${strHours}:${minutes} ${ampm}`;
  }

  // Attempt parse as Date/timestamp
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  return str;
}

/**
 * Format Date and Time combined into "DD MMM YYYY hh:mm A"
 * e.g. ("2026-11-04", "19:42:00") -> "04 Nov 2026 07:42 PM"
 */
export function formatDateTime(dateStr, timeStr) {
  if (!dateStr && !timeStr) return '';

  if (timeStr) {
    const d = formatDate(dateStr);
    const t = formatTime(timeStr);
    if (d && t) return `${d} ${t}`;
    return d || t || '';
  }

  const str = String(dateStr).trim();
  const hasTime = /(?:T|\s+)(\d{1,2}:\d{2})/.test(str);
  if (hasTime) {
    const timePart = str.match(/(?:T|\s+)(\d{1,2}:\d{2}(?::\d{2})?)/)?.[1];
    const datePart = str.split(/[T\s]/)[0];
    const d = formatDate(datePart);
    const t = formatTime(timePart);
    return `${d} ${t}`.trim();
  }

  return formatDate(str);
}

