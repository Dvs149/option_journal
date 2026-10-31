import React, { createContext, useContext, useState, useMemo } from 'react';

const FilterContext = createContext();

export const formatDateISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDisplayDate = (d) => {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
    case 'this_week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
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
        return `${formatDisplayDate(new Date(from))} - ${formatDisplayDate(new Date(to))}`;
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
    case 'this_week': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
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
