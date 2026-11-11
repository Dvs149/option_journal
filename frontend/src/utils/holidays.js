/**
 * Indian Stock Market (NSE & BSE) Trading Holidays
 * Sourced directly from official exchange schedules for 2026.
 */

export const MARKET_HOLIDAYS_2026 = [
  { date: '2026-01-26', name: 'Republic Day', weekday: 'Monday' },
  { date: '2026-03-03', name: 'Holi', weekday: 'Tuesday' },
  { date: '2026-03-26', name: 'Shri Ram Navami', weekday: 'Thursday' },
  { date: '2026-03-31', name: 'Shri Mahavir Jayanti', weekday: 'Tuesday' },
  { date: '2026-04-03', name: 'Good Friday', weekday: 'Friday' },
  { date: '2026-04-14', name: 'Dr. Baba Saheb Ambedkar Jayanti', weekday: 'Tuesday' },
  { date: '2026-05-01', name: 'Maharashtra Day', weekday: 'Friday' },
  { date: '2026-05-28', name: 'Bakri Id', weekday: 'Thursday' },
  { date: '2026-06-26', name: 'Muharram', weekday: 'Friday' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', weekday: 'Monday' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', weekday: 'Friday' },
  { date: '2026-10-20', name: 'Dussehra', weekday: 'Tuesday' },
  { date: '2026-11-10', name: 'Diwali-Balipratipada', weekday: 'Tuesday' },
  { date: '2026-11-24', name: 'Prakash Gurpurb Sri Guru Nanak Dev', weekday: 'Tuesday' },
  { date: '2026-12-25', name: 'Christmas', weekday: 'Friday' },
];

// Fixed national Indian market holidays applicable across years
export const ANNUAL_NATIONAL_HOLIDAYS = [
  { month: 1, day: 26, name: 'Republic Day' },
  { month: 5, day: 1, name: 'Maharashtra Day' },
  { month: 8, day: 15, name: 'Independence Day' },
  { month: 10, day: 2, name: 'Mahatma Gandhi Jayanti' },
  { month: 12, day: 25, name: 'Christmas' },
];

/**
 * Format a Date object or date-like to YYYY-MM-DD string
 */
export const toISODateString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.split('T')[0].split(' ')[0];
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

/**
 * Check if a date is a designated Indian stock market holiday.
 * Returns the holiday object { date, name, weekday, isHoliday: true } or null.
 */
export const getMarketHoliday = (dateInput) => {
  const dateStr = toISODateString(dateInput);
  if (!dateStr) return null;

  // 1. Direct match for 2026 official holiday schedule
  const exact2026 = MARKET_HOLIDAYS_2026.find((h) => h.date === dateStr);
  if (exact2026) {
    return {
      ...exact2026,
      isHoliday: true,
      day: parseInt(dateStr.split('-')[2], 10),
      month: parseInt(dateStr.split('-')[1], 10),
      year: parseInt(dateStr.split('-')[0], 10),
    };
  }

  // 2. Annual national holidays for any year
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  const annualMatch = ANNUAL_NATIONAL_HOLIDAYS.find((h) => h.month === m && h.day === d);
  if (annualMatch) {
    const dayDate = new Date(y, m - 1, d);
    const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    return {
      date: dateStr,
      name: annualMatch.name,
      weekday,
      isHoliday: true,
      day: d,
      month: m,
      year: y,
    };
  }

  return null;
};

/**
 * Check boolean if date is holiday
 */
export const isMarketHoliday = (dateInput) => {
  return Boolean(getMarketHoliday(dateInput));
};

/**
 * Returns a map of day number to holiday object for a given year & month.
 * e.g. for November 2026: { 10: { name: 'Diwali-Balipratipada', ... }, 24: { ... } }
 */
export const getHolidayMapForMonth = (year, month) => {
  const map = {};
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const monthStr = `${y}-${String(m).padStart(2, '0')}`;

  // Check 2026 list
  MARKET_HOLIDAYS_2026.forEach((h) => {
    if (h.date.startsWith(monthStr)) {
      const d = parseInt(h.date.split('-')[2], 10);
      map[d] = {
        ...h,
        isHoliday: true,
        day: d,
        month: m,
        year: y,
      };
    }
  });

  // Check annual holidays if not already set
  ANNUAL_NATIONAL_HOLIDAYS.forEach((h) => {
    if (h.month === m && !map[h.day]) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
      const dayDate = new Date(y, m - 1, h.day);
      const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      map[h.day] = {
        date: dateStr,
        name: h.name,
        weekday,
        isHoliday: true,
        day: h.day,
        month: m,
        year: y,
      };
    }
  });

  return map;
};
