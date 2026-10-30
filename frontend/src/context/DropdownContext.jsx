import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DropdownContext = createContext();

// Module display names and metadata
export const MODULE_METADATA = {
  'add-trade': {
    name: 'Add Trade',
    desc: 'Options used when entering new trades (Index, Trading Type, Strategy, Market Condition, Option Type)',
    icon: 'PlusSquare',
    color: 'blue',
  },
  'trades': {
    name: 'All Trades',
    desc: 'Filter dropdowns used in trade list & exports (Index, Trading Type, Option Type, Strategy Filter)',
    icon: 'ListFilter',
    color: 'emerald',
  },
  'journal': {
    name: 'Trading Journal',
    desc: 'Dropdowns for journal entries, reflections, and emotional states (Mood/Psychology, Type)',
    icon: 'BookOpen',
    color: 'purple',
  },
};

export function DropdownProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [options, setOptions] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all dropdown options from API
  const fetchDropdownOptions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/dropdown-options');
      if (res.data?.success) {
        setOptions(res.data.options || []);
        setGrouped(res.data.grouped || {});
      }
    } catch (err) {
      console.warn('Could not load dropdown options from server, using fallback', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDropdownOptions();
  }, [fetchDropdownOptions]);

  /**
   * Helper: Get active options for a specific module & dropdown.
   * If not yet loaded or not present in DB, provides sensible defaults.
   */
  const getActiveOptions = useCallback(
    (moduleKey, dropdownKey) => {
      const mod = grouped[moduleKey];
      if (mod && mod[dropdownKey]?.options) {
        return mod[dropdownKey].options.filter((o) => o.is_active);
      }

      // Fallback if not loaded
      return options
        .filter((o) => o.module_key === moduleKey && o.dropdown_key === dropdownKey && o.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    [grouped, options]
  );

  /**
   * Helper: Get all options (both active and inactive) for a dropdown.
   */
  const getAllOptions = useCallback(
    (moduleKey, dropdownKey) => {
      const mod = grouped[moduleKey];
      if (mod && mod[dropdownKey]?.options) {
        return mod[dropdownKey].options;
      }
      return options.filter((o) => o.module_key === moduleKey && o.dropdown_key === dropdownKey);
    },
    [grouped, options]
  );

  /**
   * Toggle an option's active / inactive status.
   */
  const toggleOptionStatus = async (id, nextState) => {
    // Optimistic UI update
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, is_active: nextState } : opt))
    );
    setGrouped((prev) => {
      const nextGrouped = { ...prev };
      Object.keys(nextGrouped).forEach((m) => {
        Object.keys(nextGrouped[m]).forEach((d) => {
          nextGrouped[m][d].options = nextGrouped[m][d].options.map((opt) =>
            opt.id === id ? { ...opt, is_active: nextState } : opt
          );
          nextGrouped[m][d].active_count = nextGrouped[m][d].options.filter(
            (o) => o.is_active
          ).length;
        });
      });
      return nextGrouped;
    });

    try {
      const res = await api.put(`/dropdown-options/${id}/status`, { is_active: nextState });
      if (res.data?.success) {
        showToast(
          `✓ "${res.data.option.option_label}" is now ${nextState ? 'Active' : 'Inactive'}!`,
          'success'
        );
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to toggle option status', err);
      showToast('Failed to update status', 'error');
      // Revert on error
      fetchDropdownOptions();
      return { success: false, error: err.message };
    }
  };

  /**
   * Bulk activate or deactivate all options in a dropdown.
   */
  const bulkToggleStatus = async (moduleKey, dropdownKey, isActive) => {
    // Optimistic update
    setOptions((prev) =>
      prev.map((opt) =>
        opt.module_key === moduleKey && opt.dropdown_key === dropdownKey
          ? { ...opt, is_active: isActive }
          : opt
      )
    );
    setGrouped((prev) => {
      const next = { ...prev };
      if (next[moduleKey]?.[dropdownKey]) {
        next[moduleKey][dropdownKey].options = next[moduleKey][dropdownKey].options.map(
          (opt) => ({ ...opt, is_active: isActive })
        );
        next[moduleKey][dropdownKey].active_count = isActive
          ? next[moduleKey][dropdownKey].options.length
          : 0;
      }
      return next;
    });

    try {
      await api.post('/dropdown-options/bulk-status', {
        module_key: moduleKey,
        dropdown_key: dropdownKey,
        is_active: isActive,
      });
      showToast(`✓ All options in dropdown set to ${isActive ? 'Active' : 'Inactive'}`);
      return { success: true };
    } catch (err) {
      showToast('Failed to bulk update options', 'error');
      fetchDropdownOptions();
      return { success: false, error: err.message };
    }
  };

  /**
   * Add a new custom option.
   */
  const addOption = async (payload) => {
    try {
      const res = await api.post('/dropdown-options', payload);
      if (res.data?.success) {
        showToast(`✓ Added "${payload.option_label}" to dropdown options!`);
        await fetchDropdownOptions();
        return { success: true, option: res.data.option };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add option';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  /**
   * Update an existing option.
   */
  const updateOption = async (id, payload) => {
    try {
      const res = await api.put(`/dropdown-options/${id}`, payload);
      if (res.data?.success) {
        showToast(`✓ Updated "${payload.option_label || 'option'}"!`);
        await fetchDropdownOptions();
        return { success: true, option: res.data.option };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update option';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }
  };

  /**
   * Delete a custom option.
   */
  const deleteOption = async (id) => {
    try {
      const res = await api.delete(`/dropdown-options/${id}`);
      if (res.data?.success) {
        showToast('✓ Option deleted successfully');
        await fetchDropdownOptions();
        return { success: true };
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete option', 'error');
      return { success: false };
    }
  };

  /**
   * Reset options to system defaults.
   */
  const resetDefaults = async (moduleKey = null) => {
    try {
      const res = await api.post('/dropdown-options/reset', { module_key: moduleKey });
      if (res.data?.success) {
        setOptions(res.data.options || []);
        setGrouped(res.data.grouped || {});
        showToast(`✓ Reset ${moduleKey ? moduleKey : 'all'} dropdown options to exchange/system defaults!`);
        return { success: true };
      }
    } catch (err) {
      showToast('Failed to reset options', 'error');
      return { success: false };
    }
  };

  return (
    <DropdownContext.Provider
      value={{
        options,
        grouped,
        loading,
        error,
        fetchDropdownOptions,
        getActiveOptions,
        getAllOptions,
        toggleOptionStatus,
        bulkToggleStatus,
        addOption,
        updateOption,
        deleteOption,
        resetDefaults,
      }}
    >
      {children}
    </DropdownContext.Provider>
  );
}

export function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdown must be used within a DropdownProvider');
  }
  return context;
}
