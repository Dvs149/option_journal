/**
 * Sensibull-identical Ready-Made Strategy Presets
 * Categories: Bullish, Bearish, Neutral, Others
 */

export const STRATEGY_CATEGORIES = [
  { id: 'bullish', name: 'Bullish' },
  { id: 'bearish', name: 'Bearish' },
  { id: 'neutral', name: 'Neutral' },
  { id: 'others', name: 'Others' },
];

/**
 * Strategy templates generator
 * Takes:
 * - spot: current underlying price
 * - step: strike step (e.g. 50 for NIFTY, 100 for BANKNIFTY)
 * - expiry: nearest expiry date string
 * - nextExpiry: next week/month expiry date string
 * - lotSize: lot size (e.g. 25)
 */
export const READY_MADE_STRATEGIES = [
  // =================== BULLISH STRATEGIES ===================
  {
    id: 'buy_call',
    name: 'Buy Call',
    category: 'bullish',
    sentiment: 'Strongly Bullish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Unlimited',
    desc: 'Buy 1 ATM Call. High upside potential if underlying rallies rapidly.',
    svgPath: 'M 10 70 L 45 70 L 90 20', // Horizontal flat at loss then sharp diagonal up
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const strike = Math.round(spot / step) * step;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'BUY',
          type: 'CE',
          strike,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.009),
          ltp: Math.round(spot * 0.009),
          iv: 14.5,
        },
      ];
    },
  },
  {
    id: 'sell_put',
    name: 'Sell Put',
    category: 'bullish',
    sentiment: 'Moderately Bullish',
    riskProfile: 'High Risk',
    rewardProfile: 'Limited',
    desc: 'Sell 1 OTM Put. Collect premium if underlying stays above the strike.',
    svgPath: 'M 10 75 L 55 30 L 90 30', // Slanted up from left then flat capped profit
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const strike = Math.round((spot - step * 2) / step) * step;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'PE',
          strike,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.005),
          ltp: Math.round(spot * 0.005),
          iv: 15.2,
        },
      ];
    },
  },
  {
    id: 'bull_call_spread',
    name: 'Bull Call Spread',
    category: 'bullish',
    sentiment: 'Moderately Bullish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Buy 1 ATM Call and Sell 1 OTM Call. Lower cost directional bet.',
    svgPath: 'M 10 70 L 40 70 L 65 30 L 90 30', // Flat loss, slope up, flat profit
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      const otm = atm + step * 2;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'BUY',
          type: 'CE',
          strike: atm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.009),
          ltp: Math.round(spot * 0.009),
          iv: 14.5,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'SELL',
          type: 'CE',
          strike: otm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.0035),
          ltp: Math.round(spot * 0.0035),
          iv: 14.0,
        },
      ];
    },
  },
  {
    id: 'bull_put_spread',
    name: 'Bull Put Spread',
    category: 'bullish',
    sentiment: 'Mildly Bullish / Rangebound',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Sell 1 OTM Put and Buy 1 deeper OTM Put. Net credit spread.',
    svgPath: 'M 10 70 L 35 70 L 60 30 L 90 30',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const otm = Math.round((spot - step) / step) * step;
      const deepOtm = otm - step * 2;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'PE',
          strike: otm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.0065),
          ltp: Math.round(spot * 0.0065),
          iv: 15.0,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'BUY',
          type: 'PE',
          strike: deepOtm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.0025),
          ltp: Math.round(spot * 0.0025),
          iv: 16.0,
        },
      ];
    },
  },
  {
    id: 'call_ratio_back_spread',
    name: 'Call Ratio Back Spread',
    category: 'bullish',
    sentiment: 'Volatile Bullish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Unlimited',
    desc: 'Sell 1 ITM/ATM Call and Buy 2 OTM Calls. Unlimited upside with minimal downside risk.',
    svgPath: 'M 10 40 L 40 40 L 55 75 L 90 15', // Dip in middle then steep surge up
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      const otm = atm + step * 2;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'CE',
          strike: atm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.012),
          ltp: Math.round(spot * 0.012),
          iv: 14.5,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'BUY',
          type: 'CE',
          strike: otm,
          expiry,
          lots: 2,
          lotSize,
          entryPrice: Math.round(spot * 0.0045),
          ltp: Math.round(spot * 0.0045),
          iv: 14.0,
        },
      ];
    },
  },
  {
    id: 'long_calendar_calls',
    name: 'Long Calendar with Calls',
    category: 'bullish',
    sentiment: 'Mildly Bullish / Neutral',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Sell near-expiry Call and Buy far-expiry Call at the same strike.',
    svgPath: 'M 10 70 Q 50 15 90 70', // Curved peak in the center
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const strike = Math.round((spot + step) / step) * step;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'CE',
          strike,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.007),
          ltp: Math.round(spot * 0.007),
          iv: 14.5,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'BUY',
          type: 'CE',
          strike,
          expiry: nextExpiry || expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.013),
          ltp: Math.round(spot * 0.013),
          iv: 14.8,
        },
      ];
    },
  },
  {
    id: 'bull_condor',
    name: 'Bull Condor',
    category: 'bullish',
    sentiment: 'Targeted Bullish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Buy 1 ITM Call, Sell 1 ITM Call, Sell 1 OTM Call, Buy 1 deeper OTM Call.',
    svgPath: 'M 10 70 L 30 70 L 45 30 L 65 30 L 80 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'CE', strike: atm - step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.014), ltp: Math.round(spot * 0.014), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.2 },
        { id: 'leg_3', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 14.0 },
        { id: 'leg_4', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 14.0 },
      ];
    },
  },
  {
    id: 'bull_butterfly',
    name: 'Bull Butterfly',
    category: 'bullish',
    sentiment: 'Targeted Bullish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'High R:R',
    desc: 'Buy 1 lower Call, Sell 2 mid Calls, Buy 1 higher Call. Peak profit at upper target.',
    svgPath: 'M 10 70 L 40 70 L 65 25 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const target = Math.round((spot + step * 2) / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'CE', strike: target - step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.008), ltp: Math.round(spot * 0.008), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'CE', strike: target, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 14.0 },
        { id: 'leg_3', isActive: true, side: 'BUY', type: 'CE', strike: target + step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 14.0 },
      ];
    },
  },
  {
    id: 'risk_reversal_bull',
    name: 'Risk Reversal (Bullish)',
    category: 'bullish',
    sentiment: 'Bullish Outright',
    riskProfile: 'High Risk',
    rewardProfile: 'Unlimited',
    desc: 'Sell 1 OTM Put and Buy 1 OTM Call. Synthesizes upside exposure for zero or low net premium.',
    svgPath: 'M 10 85 L 35 60 L 65 60 L 90 20',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 15.5 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 14.0 },
      ];
    },
  },
  {
    id: 'long_synthetic_future',
    name: 'Long Synthetic Future',
    category: 'bullish',
    sentiment: 'Directional Long',
    riskProfile: 'Unlimited',
    rewardProfile: 'Unlimited',
    desc: 'Buy 1 ATM Call and Sell 1 ATM Put. Perfectly mimics holding a long futures contract.',
    svgPath: 'M 10 85 L 90 15', // Straight 45 degree upward diagonal
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
      ];
    },
  },

  // =================== BEARISH STRATEGIES ===================
  {
    id: 'buy_put',
    name: 'Buy Put',
    category: 'bearish',
    sentiment: 'Strongly Bearish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Substantial',
    desc: 'Buy 1 ATM Put. High profit potential if underlying drops swiftly.',
    svgPath: 'M 10 20 L 55 70 L 90 70', // Diagonal down then flat loss
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const strike = Math.round(spot / step) * step;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'BUY',
          type: 'PE',
          strike,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.009),
          ltp: Math.round(spot * 0.009),
          iv: 15.0,
        },
      ];
    },
  },
  {
    id: 'sell_call',
    name: 'Sell Call',
    category: 'bearish',
    sentiment: 'Moderately Bearish',
    riskProfile: 'High Risk',
    rewardProfile: 'Limited',
    desc: 'Sell 1 OTM Call. Earn premium if underlying remains below the strike.',
    svgPath: 'M 10 30 L 45 30 L 90 75', // Flat profit then steep loss to the right
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const strike = Math.round((spot + step * 2) / step) * step;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'CE',
          strike,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.005),
          ltp: Math.round(spot * 0.005),
          iv: 14.0,
        },
      ];
    },
  },
  {
    id: 'bear_call_spread',
    name: 'Bear Call Spread',
    category: 'bearish',
    sentiment: 'Mildly Bearish / Sideways',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Sell 1 OTM Call and Buy 1 higher OTM Call. Credit spread with capped risk.',
    svgPath: 'M 10 30 L 35 30 L 60 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const otm = Math.round((spot + step) / step) * step;
      const deepOtm = otm + step * 2;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'CE',
          strike: otm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.0065),
          ltp: Math.round(spot * 0.0065),
          iv: 14.2,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'BUY',
          type: 'CE',
          strike: deepOtm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.0025),
          ltp: Math.round(spot * 0.0025),
          iv: 13.8,
        },
      ];
    },
  },
  {
    id: 'bear_put_spread',
    name: 'Bear Put Spread',
    category: 'bearish',
    sentiment: 'Moderately Bearish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Buy 1 ATM Put and Sell 1 OTM Put. Directional debit spread.',
    svgPath: 'M 10 30 L 35 30 L 65 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      const otm = atm - step * 2;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'BUY',
          type: 'PE',
          strike: atm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.009),
          ltp: Math.round(spot * 0.009),
          iv: 15.0,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'SELL',
          type: 'PE',
          strike: otm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.0035),
          ltp: Math.round(spot * 0.0035),
          iv: 15.5,
        },
      ];
    },
  },
  {
    id: 'put_ratio_back_spread',
    name: 'Put Ratio Back Spread',
    category: 'bearish',
    sentiment: 'Volatile Bearish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Unlimited',
    desc: 'Sell 1 ATM Put and Buy 2 OTM Puts. Massive downside profit in market crashes.',
    svgPath: 'M 10 15 L 45 75 L 60 40 L 90 40',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      const otm = atm - step * 2;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'PE',
          strike: atm,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.012),
          ltp: Math.round(spot * 0.012),
          iv: 15.0,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'BUY',
          type: 'PE',
          strike: otm,
          expiry,
          lots: 2,
          lotSize,
          entryPrice: Math.round(spot * 0.0045),
          ltp: Math.round(spot * 0.0045),
          iv: 15.8,
        },
      ];
    },
  },
  {
    id: 'long_calendar_puts',
    name: 'Long Calendar with Puts',
    category: 'bearish',
    sentiment: 'Mildly Bearish / Neutral',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Sell near-expiry Put and Buy far-expiry Put at the same strike.',
    svgPath: 'M 10 70 Q 50 15 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const strike = Math.round((spot - step) / step) * step;
      return [
        {
          id: 'leg_1',
          isActive: true,
          side: 'SELL',
          type: 'PE',
          strike,
          expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.007),
          ltp: Math.round(spot * 0.007),
          iv: 15.2,
        },
        {
          id: 'leg_2',
          isActive: true,
          side: 'BUY',
          type: 'PE',
          strike,
          expiry: nextExpiry || expiry,
          lots: 1,
          lotSize,
          entryPrice: Math.round(spot * 0.013),
          ltp: Math.round(spot * 0.013),
          iv: 15.6,
        },
      ];
    },
  },
  {
    id: 'bear_condor',
    name: 'Bear Condor',
    category: 'bearish',
    sentiment: 'Targeted Bearish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Buy 1 OTM Put, Sell 1 OTM Put, Sell 1 ITM Put, Buy 1 ITM Put.',
    svgPath: 'M 10 70 L 25 70 L 40 30 L 60 30 L 75 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 16.0 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 15.5 },
        { id: 'leg_3', isActive: true, side: 'SELL', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 15.0 },
        { id: 'leg_4', isActive: true, side: 'BUY', type: 'PE', strike: atm + step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.014), ltp: Math.round(spot * 0.014), iv: 14.8 },
      ];
    },
  },
  {
    id: 'bear_butterfly',
    name: 'Bear Butterfly',
    category: 'bearish',
    sentiment: 'Targeted Bearish',
    riskProfile: 'Limited Risk',
    rewardProfile: 'High R:R',
    desc: 'Buy 1 lower Put, Sell 2 mid Puts, Buy 1 higher Put. Peak profit at downward target.',
    svgPath: 'M 10 70 L 35 25 L 60 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const target = Math.round((spot - step * 2) / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: target - step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 16.0 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: target, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 15.5 },
        { id: 'leg_3', isActive: true, side: 'BUY', type: 'PE', strike: target + step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.008), ltp: Math.round(spot * 0.008), iv: 15.0 },
      ];
    },
  },
  {
    id: 'risk_reversal_bear',
    name: 'Risk Reversal (Bearish)',
    category: 'bearish',
    sentiment: 'Bearish Outright',
    riskProfile: 'High Risk',
    rewardProfile: 'Unlimited',
    desc: 'Sell 1 OTM Call and Buy 1 OTM Put. Low-cost downside speculation.',
    svgPath: 'M 10 20 L 35 60 L 65 60 L 90 85',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 15.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.004), ltp: Math.round(spot * 0.004), iv: 14.0 },
      ];
    },
  },
  {
    id: 'short_synthetic_future',
    name: 'Short Synthetic Future',
    category: 'bearish',
    sentiment: 'Directional Short',
    riskProfile: 'Unlimited',
    rewardProfile: 'Unlimited',
    desc: 'Sell 1 ATM Call and Buy 1 ATM Put. Perfectly mimics shorting a futures contract.',
    svgPath: 'M 10 15 L 90 85', // Downward 45 degree diagonal
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
      ];
    },
  },

  // =================== NEUTRAL STRATEGIES ===================
  {
    id: 'short_straddle',
    name: 'Short Straddle',
    category: 'neutral',
    sentiment: 'Strictly Neutral',
    riskProfile: 'Unlimited',
    rewardProfile: 'Limited',
    desc: 'Sell 1 ATM Call and Sell 1 ATM Put. Maximum decay if market does not move.',
    svgPath: 'M 10 80 L 50 20 L 90 80', // Inverted V
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
      ];
    },
  },
  {
    id: 'iron_butterfly',
    name: 'Iron Butterfly',
    category: 'neutral',
    sentiment: 'Neutral / Rangebound',
    riskProfile: 'Limited Risk',
    rewardProfile: 'High R:R',
    desc: 'Sell ATM Straddle and Buy OTM Wings. Capped loss with high central profit.',
    svgPath: 'M 10 70 L 25 70 L 50 20 L 75 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 16.0 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
        { id: 'leg_3', isActive: true, side: 'SELL', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_4', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 14.0 },
      ];
    },
  },
  {
    id: 'short_strangle',
    name: 'Short Strangle',
    category: 'neutral',
    sentiment: 'Rangebound',
    riskProfile: 'Unlimited',
    rewardProfile: 'Limited',
    desc: 'Sell 1 OTM Put and Sell 1 OTM Call. Wide profit corridor with high POP.',
    svgPath: 'M 10 80 L 35 30 L 65 30 L 90 80', // Inverted trapezoid (table)
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 15.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 14.2 },
      ];
    },
  },
  {
    id: 'short_iron_condor',
    name: 'Short Iron Condor',
    category: 'neutral',
    sentiment: 'Rangebound / Low Vol',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Sell OTM Strangle and Buy deeper OTM Wings. Most popular defined-risk theta trade.',
    svgPath: 'M 10 70 L 25 70 L 40 30 L 60 30 L 75 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 4, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0015), ltp: Math.round(spot * 0.0015), iv: 16.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 15.5 },
        { id: 'leg_3', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 14.2 },
        { id: 'leg_4', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 4, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0015), ltp: Math.round(spot * 0.0015), iv: 13.8 },
      ];
    },
  },
  {
    id: 'batman',
    name: 'Batman',
    category: 'neutral',
    sentiment: 'Rangebound Double Peak',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Double-peaked neutral setup with extra wing protection, mimicking Batman ears.',
    svgPath: 'M 10 70 L 25 25 L 45 45 L 65 25 L 80 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 16.0 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm - step, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.0065), ltp: Math.round(spot * 0.0065), iv: 15.2 },
        { id: 'leg_3', isActive: true, side: 'BUY', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 15.0 },
        { id: 'leg_4', isActive: true, side: 'BUY', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_5', isActive: true, side: 'SELL', type: 'CE', strike: atm + step, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.0065), ltp: Math.round(spot * 0.0065), iv: 14.2 },
        { id: 'leg_6', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 14.0 },
      ];
    },
  },
  {
    id: 'double_plateau',
    name: 'Double Plateau',
    category: 'neutral',
    sentiment: 'Broad Neutral',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Multi-strike strangle spread offering a wide, stepped profit zone.',
    svgPath: 'M 10 70 L 25 70 L 35 45 L 55 45 L 65 30 L 80 70 L 90 70',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0025), ltp: Math.round(spot * 0.0025), iv: 15.8 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm - step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.006), ltp: Math.round(spot * 0.006), iv: 15.0 },
        { id: 'leg_3', isActive: true, side: 'SELL', type: 'CE', strike: atm + step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.006), ltp: Math.round(spot * 0.006), iv: 14.2 },
        { id: 'leg_4', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0025), ltp: Math.round(spot * 0.0025), iv: 13.9 },
      ];
    },
  },
  {
    id: 'jade_lizard',
    name: 'Jade Lizard',
    category: 'neutral',
    sentiment: 'Neutral to Mildly Bullish',
    riskProfile: 'Downside Risk Only',
    rewardProfile: 'Limited',
    desc: 'Sell 1 OTM Put and Sell 1 Bear Call Spread. Net credit exceeds spread width, eliminating upside risk completely.',
    svgPath: 'M 10 80 L 40 30 L 90 30',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.005), ltp: Math.round(spot * 0.005), iv: 15.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'CE', strike: atm + step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.006), ltp: Math.round(spot * 0.006), iv: 14.2 },
        { id: 'leg_3', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0035), ltp: Math.round(spot * 0.0035), iv: 14.0 },
      ];
    },
  },
  {
    id: 'reverse_jade_lizard',
    name: 'Reverse Jade Lizard',
    category: 'neutral',
    sentiment: 'Neutral to Mildly Bearish',
    riskProfile: 'Upside Risk Only',
    rewardProfile: 'Limited',
    desc: 'Sell 1 OTM Call and Sell 1 Bull Put Spread. Net credit eliminates downside risk.',
    svgPath: 'M 10 30 L 60 30 L 90 80',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0035), ltp: Math.round(spot * 0.0035), iv: 15.8 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'PE', strike: atm - step, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.006), ltp: Math.round(spot * 0.006), iv: 15.0 },
        { id: 'leg_3', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.005), ltp: Math.round(spot * 0.005), iv: 14.2 },
      ];
    },
  },

  // =================== OTHERS STRATEGIES ===================
  {
    id: 'call_ratio_spread',
    name: 'Call Ratio Spread',
    category: 'others',
    sentiment: 'Mildly Bullish to Rangebound',
    riskProfile: 'Upside Risk',
    rewardProfile: 'High R:R',
    desc: 'Buy 1 ATM Call and Sell 2 OTM Calls. Generates maximum profit at short strike.',
    svgPath: 'M 10 60 L 40 60 L 65 20 L 90 85',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 2, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 14.0 },
      ];
    },
  },
  {
    id: 'put_ratio_spread',
    name: 'Put Ratio Spread',
    category: 'others',
    sentiment: 'Mildly Bearish to Rangebound',
    riskProfile: 'Downside Risk',
    rewardProfile: 'High R:R',
    desc: 'Buy 1 ATM Put and Sell 2 OTM Puts. High return if price lands precisely on short strike.',
    svgPath: 'M 10 85 L 35 20 L 60 60 L 90 60',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 2, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 15.8 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 15.0 },
      ];
    },
  },
  {
    id: 'long_straddle',
    name: 'Long Straddle',
    category: 'others',
    sentiment: 'High Volatility',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Unlimited',
    desc: 'Buy 1 ATM Call and Buy 1 ATM Put. Profitable if market explodes violently in either direction.',
    svgPath: 'M 10 20 L 50 80 L 90 20', // V shape
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
      ];
    },
  },
  {
    id: 'long_iron_butterfly',
    name: 'Long Iron Butterfly',
    category: 'others',
    sentiment: 'High Volatility Breakout',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Sell OTM Wings and Buy ATM Straddle. Limited-risk play on massive impending volatility.',
    svgPath: 'M 10 30 L 25 30 L 50 80 L 75 30 L 90 30',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 16.0 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
        { id: 'leg_3', isActive: true, side: 'BUY', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_4', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 3, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.002), ltp: Math.round(spot * 0.002), iv: 14.0 },
      ];
    },
  },
  {
    id: 'long_strangle',
    name: 'Long Strangle',
    category: 'others',
    sentiment: 'Explosive Volatility',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Unlimited',
    desc: 'Buy 1 OTM Put and Buy 1 OTM Call. Lower cost than Long Straddle, wins on huge moves.',
    svgPath: 'M 10 20 L 35 70 L 65 70 L 90 20', // U/Bucket shape
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 15.5 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 14.2 },
      ];
    },
  },
  {
    id: 'long_iron_condor',
    name: 'Long Iron Condor',
    category: 'others',
    sentiment: 'Volatility Breakout',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Limited',
    desc: 'Sell deep OTM wings and Buy mid OTM Strangle. Defined-risk breakout strategy.',
    svgPath: 'M 10 30 L 25 30 L 40 70 L 60 70 L 75 30 L 90 30',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'SELL', type: 'PE', strike: atm - step * 4, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0015), ltp: Math.round(spot * 0.0015), iv: 16.5 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'PE', strike: atm - step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 15.5 },
        { id: 'leg_3', isActive: true, side: 'BUY', type: 'CE', strike: atm + step * 2, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0045), ltp: Math.round(spot * 0.0045), iv: 14.2 },
        { id: 'leg_4', isActive: true, side: 'SELL', type: 'CE', strike: atm + step * 4, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0015), ltp: Math.round(spot * 0.0015), iv: 13.8 },
      ];
    },
  },
  {
    id: 'strip',
    name: 'Strip',
    category: 'others',
    sentiment: 'Bearish Volatility',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Substantial',
    desc: 'Buy 2 ATM Puts and Buy 1 ATM Call. Strong downside skew with upside hedge.',
    svgPath: 'M 10 15 L 50 80 L 90 35',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'PE', strike: atm, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'CE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
      ];
    },
  },
  {
    id: 'strap',
    name: 'Strap',
    category: 'others',
    sentiment: 'Bullish Volatility',
    riskProfile: 'Limited Risk',
    rewardProfile: 'Substantial',
    desc: 'Buy 2 ATM Calls and Buy 1 ATM Put. Strong upside skew with downside hedge.',
    svgPath: 'M 10 35 L 50 80 L 90 15',
    generateLegs: (spot, step, expiry, nextExpiry, lotSize) => {
      const atm = Math.round(spot / step) * step;
      return [
        { id: 'leg_1', isActive: true, side: 'BUY', type: 'CE', strike: atm, expiry, lots: 2, lotSize, entryPrice: Math.round(spot * 0.009), ltp: Math.round(spot * 0.009), iv: 14.5 },
        { id: 'leg_2', isActive: true, side: 'BUY', type: 'PE', strike: atm, expiry, lots: 1, lotSize, entryPrice: Math.round(spot * 0.0085), ltp: Math.round(spot * 0.0085), iv: 15.0 },
      ];
    },
  },
];
