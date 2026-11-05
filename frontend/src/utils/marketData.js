/**
 * Realistic default market configuration for Indian indices
 */
export const DEFAULT_INDEX_CONFIG = {
  NIFTY: {
    symbol: 'NIFTY',
    name: 'NIFTY 50',
    exchange: 'NSE',
    atm_strike: 24350,
    strike_step: 50,
    lot_size: 65,
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    name: 'NIFTY BANK',
    exchange: 'NSE',
    atm_strike: 57000,
    strike_step: 100,
    lot_size: 30,
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    name: 'NIFTY FIN SERVICE',
    exchange: 'NSE',
    atm_strike: 26250,
    strike_step: 50,
    lot_size: 60,
  },
  MIDCPNIFTY: {
    symbol: 'MIDCPNIFTY',
    name: 'NIFTY MIDCAP SELECT',
    exchange: 'NSE',
    atm_strike: 13925,
    strike_step: 25,
    lot_size: 120,
  },
  SENSEX: {
    symbol: 'SENSEX',
    name: 'BSE SENSEX',
    exchange: 'BSE',
    atm_strike: 78700,
    strike_step: 100,
    lot_size: 20,
  },
  BANKEX: {
    symbol: 'BANKEX',
    name: 'BSE BANKEX',
    exchange: 'BSE',
    atm_strike: 64300,
    strike_step: 100,
    lot_size: 30,
  },
};

/**
 * Normalizes index symbol (e.g., 'BANK NIFTY' -> 'BANKNIFTY')
 */
export function normalizeIndexSymbol(symbol) {
  if (!symbol) return 'NIFTY';
  const clean = String(symbol).toUpperCase().replace(/\s+/g, '').replace(/[^A-Z]/g, '');
  if (clean.includes('BANKNIFTY')) return 'BANKNIFTY';
  if (clean.includes('FINNIFTY')) return 'FINNIFTY';
  if (clean.includes('MIDCP') || clean.includes('MIDCAP')) return 'MIDCPNIFTY';
  if (clean.includes('BANKEX')) return 'BANKEX';
  if (clean.includes('SENSEX')) return 'SENSEX';
  if (clean.includes('NIFTY')) return 'NIFTY';
  return clean || 'NIFTY';
}

/**
 * Resolves ATM strike price for a given index symbol
 */
export function getIndexAtmStrike(symbol, atmStrikesMap = {}) {
  const norm = normalizeIndexSymbol(symbol);
  if (atmStrikesMap && atmStrikesMap[norm]?.atm_strike) {
    return atmStrikesMap[norm].atm_strike;
  }
  return DEFAULT_INDEX_CONFIG[norm]?.atm_strike || 24350;
}

/**
 * Resolves strike step (tick) for an index (e.g. 50 for NIFTY, 100 for BANKNIFTY)
 */
export function getIndexStrikeStep(symbol, atmStrikesMap = {}) {
  const norm = normalizeIndexSymbol(symbol);
  if (atmStrikesMap && atmStrikesMap[norm]?.strike_step) {
    return atmStrikesMap[norm].strike_step;
  }
  return DEFAULT_INDEX_CONFIG[norm]?.strike_step || 50;
}

/**
 * Resolves nearest upcoming expiry date for an index
 */
export function getIndexNearestExpiry(symbol, atmStrikesMap = {}) {
  const norm = normalizeIndexSymbol(symbol);
  if (atmStrikesMap && atmStrikesMap[norm]?.nearest_expiry) {
    return atmStrikesMap[norm].nearest_expiry;
  }
  return '';
}
