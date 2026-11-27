import React, { createContext, useContext, useState, useMemo } from 'react';
import { formatDate } from '../utils/formatters';
import { isMarketHoliday } from '../utils/holidays';

const FilterContext = createContext();

export const formatDateISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns tomorrow or the next working day, automatically skipping
 * both weekends (Saturday & Sunday) and official Indian stock market holidays.
 */
export const getNextWorkingDay = (from = new Date()) => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + 1);
  // Loop until we find a weekday that is not a market holiday
  while (d.getDay() === 0 || d.getDay() === 6 || isMarketHoliday(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
};

export const formatDisplayDate = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return formatDate(d);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Returns current month week definitions:
 * - 1st Week: 1st - 7th
 * - 2nd Week: 8th - 14th
 * - 3rd Week: 15th - 21st
 * - 4th Week: 22nd - 28th
 * - 5th Week: 29th - End of month (if month has > 28 days)
 */
export const getMonthWeekRanges = (refDate = new Date()) => {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthShort = refDate.toLocaleString('en-US', { month: 'short' });
  const currentDay = refDate.getDate();

  const definitions = [
    { key: 'week_1', alias: '1st_week', label: '1st Week', startDay: 1, endDay: 7 },
    { key: 'week_2', alias: '2nd_week', label: '2nd Week', startDay: 8, endDay: 14 },
    { key: 'week_3', alias: '3rd_week', label: '3rd Week', startDay: 15, endDay: 21 },
    { key: 'week_4', alias: '4th_week', label: '4th Week', startDay: 22, endDay: 28 },
    { key: 'week_5', alias: '5th_week', label: '5th Week', startDay: 29, endDay: daysInMonth },
  ];

  return definitions
    .filter((def) => def.startDay <= daysInMonth)
    .map((def) => {
      const actualEnd = Math.min(def.endDay, daysInMonth);
      const startObj = new Date(y, m, def.startDay);
      const endObj = new Date(y, m, actualEnd);
      return {
        key: def.key,
        alias: def.alias,
        label: def.label,
        startDay: def.startDay,
        endDay: actualEnd,
        fromISO: formatDateISO(startObj),
        toISO: formatDateISO(endObj),
        dateHint: `${String(def.startDay).padStart(2, '0')} - ${String(actualEnd).padStart(2, '0')} ${monthShort}`,
        displayRange: `${formatDisplayDate(startObj)} - ${formatDisplayDate(endObj)}`,
        isCurrent: currentDay >= def.startDay && currentDay <= actualEnd,
      };
    });
};

export const getDisplayDateRangeForFilter = (filterType, from, to) => {
  const now = new Date();
  switch (filterType) {
    case 'today':
      return formatDisplayDate(now);
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return formatDisplayDate(y);
    }
    case 'tomorrow':
    case 'next_working_day': {
      const nextDay = getNextWorkingDay(now);
      return formatDisplayDate(nextDay);
    }
    case 'this_week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'week_1':
    case '1st_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(7, daysInMonth));
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'week_2':
    case '2nd_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 8);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(14, daysInMonth));
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'week_3':
    case '3rd_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 15);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(21, daysInMonth));
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'week_4':
    case '4th_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 22);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(28, daysInMonth));
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'week_5':
    case '5th_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 29);
      const end = new Date(now.getFullYear(), now.getMonth(), daysInMonth);
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    }
    case 'all':
      return 'All Time';
    case 'custom':
      if (from && to) {
        return `${formatDisplayDate(from)} - ${formatDisplayDate(to)}`;
      }
      return 'Custom Range';
    default:
      return 'All Time';
  }
};

export const getISODateRangeForFilter = (filterType, customFrom, customTo) => {
  const now = new Date();
  switch (filterType) {
    case 'today':
      return [formatDateISO(now), formatDateISO(now)];
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return [formatDateISO(y), formatDateISO(y)];
    }
    case 'tomorrow':
    case 'next_working_day': {
      const nextDay = getNextWorkingDay(now);
      return [formatDateISO(nextDay), formatDateISO(nextDay)];
    }
    case 'this_week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'week_1':
    case '1st_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(7, daysInMonth));
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'week_2':
    case '2nd_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 8);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(14, daysInMonth));
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'week_3':
    case '3rd_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 15);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(21, daysInMonth));
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'week_4':
    case '4th_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 22);
      const end = new Date(now.getFullYear(), now.getMonth(), Math.min(28, daysInMonth));
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'week_5':
    case '5th_week': {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 29);
      const end = new Date(now.getFullYear(), now.getMonth(), daysInMonth);
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return [formatDateISO(start), formatDateISO(end)];
    }
    case 'custom':
      return [customFrom || null, customTo || null];
    case 'all':
    default:
      return [null, null];
  }
};

export function FilterProvider({ children }) {
  const now = new Date();
  const initialStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const initialEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [filter, setFilter] = useState('this_month');
  const [customFrom, setCustomFrom] = useState(formatDateISO(initialStart));
  const [customTo, setCustomTo] = useState(formatDateISO(initialEnd));
  const [dateRangeDisplay, setDateRangeDisplay] = useState(
    `${formatDisplayDate(initialStart)} - ${formatDisplayDate(initialEnd)}`
  );

  const [fromDate, toDate] = useMemo(() => {
    return getISODateRangeForFilter(filter, customFrom, customTo);
  }, [filter, customFrom, customTo]);

  const updateFilter = (newFilter) => {
    setFilter(newFilter);
    if (newFilter !== 'custom') {
      setDateRangeDisplay(getDisplayDateRangeForFilter(newFilter, customFrom, customTo));
    }
  };

  const updateCustomDates = (from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    setFilter('custom');
    setDateRangeDisplay(getDisplayDateRangeForFilter('custom', from, to));
  };

  return (
    <FilterContext.Provider
      value={{
        filter,
        updateFilter,
        fromDate,
        toDate,
        customFrom,
        customTo,
        updateCustomDates,
        dateRangeDisplay,
        setDateRangeDisplay,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export const useFilter = () => useContext(FilterContext);
