import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export function FilterProvider({ children }) {
  const [filter, setFilter] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('2025-08-01');
  const [customTo, setCustomTo] = useState('2025-08-31');
  const [dateRangeDisplay, setDateRangeDisplay] = useState('01 Aug 2025 - 31 Aug 2025');

  const updateFilter = (newFilter) => {
    setFilter(newFilter);
  };

  const updateCustomDates = (from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    setFilter('custom');
  };

  return (
    <FilterContext.Provider
      value={{
        filter,
        updateFilter,
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
