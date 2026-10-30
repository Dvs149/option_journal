import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export const DEFAULT_LOT_SIZES = {
  'NIFTY': 65,
  'BANK NIFTY': 30,
  'BANKNIFTY': 30,
  'FINNIFTY': 60,
  'MIDCPNIFTY': 120,
  'NIFTYNXT50': 25,
  'SENSEX': 20,
  'BANKEX': 30,
  'SENSEX50': 75,
  'STOCK': 1,
};

export const STANDARD_INDICES = [
  { id: 'NIFTY', name: 'NIFTY', defaultSize: 65, exchange: 'NSE', label: 'Nifty 50' },
  { id: 'BANKNIFTY', name: 'BANKNIFTY', defaultSize: 30, exchange: 'NSE', label: 'Nifty Bank' },
  { id: 'FINNIFTY', name: 'FINNIFTY', defaultSize: 60, exchange: 'NSE', label: 'Nifty Financial Services' },
  { id: 'MIDCPNIFTY', name: 'MIDCPNIFTY', defaultSize: 120, exchange: 'NSE', label: 'Nifty Midcap Select' },
  { id: 'NIFTYNXT50', name: 'NIFTYNXT50', defaultSize: 25, exchange: 'NSE', label: 'Nifty Next 50' },
  { id: 'SENSEX', name: 'SENSEX', defaultSize: 20, exchange: 'BSE', label: 'BSE Sensex' },
  { id: 'BANKEX', name: 'BANKEX', defaultSize: 30, exchange: 'BSE', label: 'BSE Bankex' },
  { id: 'SENSEX50', name: 'SENSEX50', defaultSize: 75, exchange: 'BSE', label: 'BSE Sensex 50' },
  { id: 'STOCK', name: 'STOCK', defaultSize: 1, exchange: 'NSE', label: 'Individual Stocks' },
];

const LotSizeContext = createContext(null);

export function LotSizeProvider({ children }) {
  const [lotSizes, setLotSizes] = useState(() => {
    try {
      const saved = localStorage.getItem('tradejournal_lot_sizes');
      if (saved) {
        return { ...DEFAULT_LOT_SIZES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to parse cached lot sizes', e);
    }
    return DEFAULT_LOT_SIZES;
  });

  const [dbRecords, setDbRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDbSynced, setIsDbSynced] = useState(false);

  // Fetch from MySQL Database via API
  const fetchLotSizesFromDB = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setLoading(true);
      const res = await api.get('/lot-sizes');
      if (res.data?.lot_sizes) {
        const merged = {
          ...DEFAULT_LOT_SIZES,
          ...res.data.lot_sizes,
        };
        setLotSizes(merged);
        setDbRecords(res.data.data || []);
        setIsDbSynced(true);
        localStorage.setItem('tradejournal_lot_sizes', JSON.stringify(merged));
      }
    } catch (err) {
      console.warn('Could not fetch lot sizes from DB, using fallback cache:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotSizesFromDB();
  }, [fetchLotSizesFromDB]);

  // Keep localStorage updated as fallback
  useEffect(() => {
    try {
      localStorage.setItem('tradejournal_lot_sizes', JSON.stringify(lotSizes));
    } catch (e) {
      console.error(e);
    }
  }, [lotSizes]);

  // Normalize index lookup key
  const normalizeIndexKey = (indexName) => {
    if (!indexName) return 'NIFTY';
    const clean = indexName.toString().trim().toUpperCase();
    if (clean === 'BANK NIFTY' || clean === 'BANKNIFTY') return 'BANKNIFTY';
    if (clean === 'NIFTY 50' || clean === 'NIFTY') return 'NIFTY';
    return clean;
  };

  // Get dynamic lot size for any index
  const getLotSize = (indexName) => {
    const key = normalizeIndexKey(indexName);
    if (lotSizes[key] !== undefined) {
      return Number(lotSizes[key]) || 50;
    }
    if (key === 'BANKNIFTY' && lotSizes['BANK NIFTY'] !== undefined) {
      return Number(lotSizes['BANK NIFTY']) || 15;
    }
    if (lotSizes[indexName] !== undefined) {
      return Number(lotSizes[indexName]) || 50;
    }
    return 50;
  };

  // Calculate quantity automatically: lots * lotSize
  const calculateQuantity = (indexName, lots) => {
    const lotSize = getLotSize(indexName);
    const numLots = parseInt(lots, 10);
    if (isNaN(numLots) || numLots <= 0) return 0;
    return numLots * lotSize;
  };

  // Calculate lots automatically: quantity / lotSize
  const calculateLots = (indexName, quantity) => {
    const lotSize = getLotSize(indexName);
    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) return 1;
    return Math.max(1, Math.round(numQty / lotSize));
  };

  // Update lot size in DB & state
  const updateLotSize = async (indexName, newSize) => {
    const size = parseInt(newSize, 10) || 1;
    const key = normalizeIndexKey(indexName);

    // Optimistic UI update
    setLotSizes((prev) => {
      const updated = { ...prev, [key]: size };
      if (key === 'BANKNIFTY') updated['BANK NIFTY'] = size;
      return updated;
    });

    // Save directly to MySQL database
    try {
      await api.post('/lot-sizes', {
        index_name: key,
        lot_size: size,
      });
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to save lot size in DB:', err);
    }
  };

  // Batch update all lot sizes in DB
  const updateAllLotSizes = async (newSizes) => {
    setLotSizes((prev) => ({
      ...prev,
      ...newSizes,
    }));

    try {
      const res = await api.put('/lot-sizes/batch', {
        lot_sizes: newSizes,
      });
      if (res.data?.lot_sizes) {
        setLotSizes((prev) => ({ ...prev, ...res.data.lot_sizes }));
        setDbRecords(res.data.data || []);
      }
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to batch save lot sizes in DB:', err);
    }
  };

  // Add custom index in DB & state
  const addCustomIndex = async (indexName, size, exchange = 'NSE') => {
    if (!indexName) return;
    const key = indexName.trim().toUpperCase();
    const parsedSize = parseInt(size, 10) || 1;

    setLotSizes((prev) => ({ ...prev, [key]: parsedSize }));

    try {
      const res = await api.post('/lot-sizes', {
        index_name: key,
        lot_size: parsedSize,
        exchange: exchange,
        display_name: key,
      });
      if (res.data?.data) {
        setDbRecords((prev) => [...prev.filter((r) => r.index_name !== key), res.data.data]);
      }
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to add custom index to DB:', err);
    }
  };

  // Remove custom index from DB & state
  const removeCustomIndex = async (indexName) => {
    const key = normalizeIndexKey(indexName);
    setLotSizes((prev) => {
      const copy = { ...prev };
      delete copy[key];
      if (key === 'BANKNIFTY') delete copy['BANK NIFTY'];
      return copy;
    });
    setDbRecords((prev) => prev.filter((r) => r.index_name !== key));

    try {
      await api.delete(`/lot-sizes/${key}`);
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to remove custom index from DB:', err);
    }
  };

  // Reset to official exchange defaults in DB & state
  const resetToDefaults = async () => {
    setLotSizes(DEFAULT_LOT_SIZES);

    try {
      const res = await api.post('/lot-sizes/reset');
      if (res.data?.lot_sizes) {
        setLotSizes((prev) => ({ ...prev, ...res.data.lot_sizes }));
        setDbRecords(res.data.data || []);
      }
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to reset lot sizes in DB:', err);
    }
  };

  return (
    <LotSizeContext.Provider
      value={{
        lotSizes,
        dbRecords,
        loading,
        isDbSynced,
        getLotSize,
        calculateQuantity,
        calculateLots,
        updateLotSize,
        updateAllLotSizes,
        addCustomIndex,
        removeCustomIndex,
        resetToDefaults,
        refreshFromDB: fetchLotSizesFromDB,
        standardIndices: STANDARD_INDICES,
      }}
    >
      {children}
    </LotSizeContext.Provider>
  );
}

export function useLotSizes() {
  const context = useContext(LotSizeContext);
  if (!context) {
    throw new Error('useLotSizes must be used within a LotSizeProvider');
  }
  return context;
}
