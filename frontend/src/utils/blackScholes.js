/**
 * Black-Scholes Options Pricing & Greeks Calculation Engine
 * Designed for Indian Stock & Index Options (NIFTY, BANKNIFTY, SENSEX, etc.)
 */

// Abramowitz & Stegun approximation for Cumulative Normal Distribution (CND)
export function standardNormalCdf(x) {
  if (isNaN(x)) return 0.5;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

// Standard Normal Probability Density Function (PDF)
export function standardNormalPdf(x) {
  if (isNaN(x)) return 0;
  return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculate Black-Scholes option price and Greeks
 * 
 * @param {boolean} isCall - True for CE, False for PE
 * @param {number} S - Current Underlying / Spot Price
 * @param {number} K - Strike Price
 * @param {number} T - Time to Expiry in Years (e.g. 5 days = 5/365)
 * @param {number} r - Risk-free interest rate (e.g. 0.068 for 6.8%)
 * @param {number} sigma - Implied Volatility as a decimal (e.g. 0.14 for 14%)
 * @returns {object} { price, delta, gamma, theta, vega, rho, intrinsic, timeValue }
 */
export function calculateBlackScholes(isCall, S, K, T, r = 0.068, sigma = 0.14) {
  S = Math.max(0.01, Number(S) || 0);
  K = Math.max(0.01, Number(K) || 0);
  sigma = Math.max(0.001, Number(sigma) || 0.14);
  T = Math.max(0.00001, Number(T) || 0.00001); // avoid division by zero

  const intrinsic = isCall ? Math.max(0, S - K) : Math.max(0, K - S);

  // If time is essentially zero (at expiry)
  if (T <= 0.0001) {
    return {
      price: intrinsic,
      delta: isCall ? (S > K ? 1 : S === K ? 0.5 : 0) : (S < K ? -1 : S === K ? -0.5 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      intrinsic: intrinsic,
      timeValue: 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = standardNormalCdf(d1);
  const Nd2 = standardNormalCdf(d2);
  const N_neg_d1 = standardNormalCdf(-d1);
  const N_neg_d2 = standardNormalCdf(-d2);
  const pdf_d1 = standardNormalPdf(d1);

  let price = 0;
  let delta = 0;
  let rho = 0;

  if (isCall) {
    price = S * Nd1 - K * Math.exp(-r * T) * Nd2;
    delta = Nd1;
    rho = (K * T * Math.exp(-r * T) * Nd2) / 100;
  } else {
    price = K * Math.exp(-r * T) * N_neg_d2 - S * N_neg_d1;
    delta = Nd1 - 1.0;
    rho = (-K * T * Math.exp(-r * T) * N_neg_d2) / 100;
  }

  // Ensure price is at least intrinsic value
  price = Math.max(intrinsic, price);

  const gamma = pdf_d1 / (S * sigma * sqrtT);
  // Theta per 1 calendar day decay:
  const thetaAnnual = -(S * pdf_d1 * sigma) / (2 * sqrtT)
    - (isCall ? r * K * Math.exp(-r * T) * Nd2 : -r * K * Math.exp(-r * T) * N_neg_d2);
  const theta = thetaAnnual / 365.0;

  // Vega per 1% change in IV:
  const vega = (S * sqrtT * pdf_d1) / 100.0;

  const timeValue = Math.max(0, price - intrinsic);

  return {
    price: Number(price.toFixed(2)),
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(6)),
    theta: Number(theta.toFixed(2)),
    vega: Number(vega.toFixed(2)),
    rho: Number(rho.toFixed(2)),
    intrinsic: Number(intrinsic.toFixed(2)),
    timeValue: Number(timeValue.toFixed(2)),
  };
}

/**
 * Solve for Implied Volatility given market price using Newton-Raphson
 */
export function impliedVolatility(isCall, S, K, T, targetPrice, r = 0.068) {
  if (targetPrice <= 0 || T <= 0.0001) return 0.14;
  
  let sigma = 0.20; // initial guess 20%
  const maxIterations = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIterations; i++) {
    const bs = calculateBlackScholes(isCall, S, K, T, r, sigma);
    const diff = bs.price - targetPrice;
    if (Math.abs(diff) < tolerance) return sigma;

    const vega = bs.vega * 100; // vega per unit volatility
    if (Math.abs(vega) < 1e-4) break;

    const newSigma = sigma - diff / vega;
    if (newSigma <= 0.001 || isNaN(newSigma)) {
      sigma = 0.5 * sigma;
    } else {
      sigma = newSigma;
    }
    if (sigma > 3.0) return 3.0; // cap at 300%
  }

  return Math.max(0.05, Math.min(2.0, sigma));
}

/**
 * Calculates Payoff Points across a price range for given Strategy Legs
 * 
 * @param {Array} legs - Array of active option/future legs
 * @param {number} spotPrice - Current underlying price
 * @param {number} daysToExpiry - Days remaining until contract expiry
 * @param {number} targetDaysFromNow - Days offset to target evaluation date (e.g. 0 for today/T+0)
 * @param {number} ivAdjustment - Percentage point shift in IV (e.g. 0 for no change, +2 for +2% IV)
 * @param {number} rangePercent - Range around spot price to compute (+/- 10%)
 * @param {number} steps - Number of evaluation points (e.g. 100)
 */
export function generatePayoffCurve({
  legs = [],
  spotPrice = 25000,
  daysToExpiry = 4,
  targetDaysFromNow = 0,
  ivAdjustment = 0,
  rangePercent = 0.10,
  steps = 120,
  r = 0.068,
}) {
  if (!legs || legs.length === 0 || !spotPrice) {
    return {
      points: [],
      breakevensExpiry: [],
      breakevensTarget: [],
      maxProfitExpiry: 0,
      maxLossExpiry: 0,
      maxProfitTarget: 0,
      maxLossTarget: 0,
      currentPnL: 0,
      targetPnLAtSpot: 0,
      netGreeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
      isUnlimitedProfit: false,
      isUnlimitedLoss: false,
      pop: 50,
      intrinsicTotal: 0,
      timeValueTotal: 0,
    };
  }

  const activeLegs = legs.filter(l => l.isActive !== false);
  if (activeLegs.length === 0) {
    return {
      points: [],
      breakevensExpiry: [],
      breakevensTarget: [],
      maxProfitExpiry: 0,
      maxLossExpiry: 0,
      maxProfitTarget: 0,
      maxLossTarget: 0,
      currentPnL: 0,
      targetPnLAtSpot: 0,
      netGreeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
      isUnlimitedProfit: false,
      isUnlimitedLoss: false,
      pop: 50,
      intrinsicTotal: 0,
      timeValueTotal: 0,
    };
  }

  // Determine price bounds
  const strikes = activeLegs.map(l => Number(l.strike || spotPrice)).filter(Boolean);
  const minStrike = Math.min(...strikes, spotPrice);
  const maxStrike = Math.max(...strikes, spotPrice);

  const span = Math.max(spotPrice * rangePercent, (maxStrike - minStrike) * 1.3);
  const minPrice = Math.max(10, Math.floor((spotPrice - span) / 50) * 50);
  const maxPrice = Math.ceil((spotPrice + span) / 50) * 50;
  const stepSize = Math.max(1, (maxPrice - minPrice) / steps);

  // Time to expiry on target date:
  // If expiry is in 4 days and target is today (targetDaysFromNow = 0), remaining DTE on target date is 4.
  // If target is in 2 days, remaining DTE is max(0, 4 - 2) = 2 days.
  const targetRemainingDte = Math.max(0.001, daysToExpiry - targetDaysFromNow);
  const targetRemainingT = targetRemainingDte / 365.0;

  const points = [];
  let maxProfitExpiry = -Infinity;
  let maxLossExpiry = Infinity;
  let maxProfitTarget = -Infinity;
  let maxLossTarget = Infinity;

  // Track Greeks sum at current spot
  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;
  let totalIntrinsic = 0;
  let totalTimeValue = 0;

  // Compute spot-level Greeks & Values
  activeLegs.forEach(leg => {
    const isCall = String(leg.type).toUpperCase() === 'CE';
    const isFut = String(leg.type).toUpperCase() === 'FUT';
    const isBuy = String(leg.side).toUpperCase() === 'BUY';
    const qty = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 25);
    const sign = isBuy ? 1 : -1;
    const strike = Number(leg.strike) || spotPrice;
    const baseIv = (Number(leg.iv) || 15) / 100.0;
    const legIv = Math.max(0.01, baseIv + (ivAdjustment / 100.0));
    const currentT = Math.max(0.001, daysToExpiry / 365.0);

    if (isFut) {
      netDelta += sign * 1.0 * qty;
    } else {
      const bs = calculateBlackScholes(isCall, spotPrice, strike, currentT, r, legIv);
      netDelta += sign * bs.delta * qty;
      netGamma += sign * bs.gamma * qty;
      netTheta += sign * bs.theta * qty;
      netVega += sign * bs.vega * qty;
      totalIntrinsic += sign * bs.intrinsic * qty;
      totalTimeValue += sign * bs.timeValue * qty;
    }
  });

  // Check asymptotic directional slope at high and low extremes
  let slopeLow = 0;
  let slopeHigh = 0;
  activeLegs.forEach(leg => {
    const isCall = String(leg.type).toUpperCase() === 'CE';
    const isFut = String(leg.type).toUpperCase() === 'FUT';
    const isBuy = String(leg.side).toUpperCase() === 'BUY';
    const qty = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 25);
    const sign = isBuy ? 1 : -1;

    if (isFut) {
      slopeLow += sign * qty;
      slopeHigh += sign * qty;
    } else if (isCall) {
      slopeHigh += sign * qty;
    } else { // PE
      slopeLow += -sign * qty;
    }
  });

  const isUnlimitedProfit = slopeHigh > 0 || slopeLow > 0;
  const isUnlimitedLoss = slopeHigh < 0 || slopeLow < 0;

  // Generate price grid
  for (let price = minPrice; price <= maxPrice; price += stepSize) {
    const p = Math.round(price);
    let expiryPnL = 0;
    let targetPnL = 0;

    activeLegs.forEach(leg => {
      const isCall = String(leg.type).toUpperCase() === 'CE';
      const isFut = String(leg.type).toUpperCase() === 'FUT';
      const isBuy = String(leg.side).toUpperCase() === 'BUY';
      const qty = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 25);
      const entryPrice = Number(leg.entryPrice || leg.ltp || 0);
      const strike = Number(leg.strike) || p;
      const baseIv = (Number(leg.iv) || 15) / 100.0;
      const legIv = Math.max(0.01, baseIv + (ivAdjustment / 100.0));

      if (isFut) {
        // Futures payoff
        const diff = p - entryPrice;
        const pnl = isBuy ? diff * qty : -diff * qty;
        expiryPnL += pnl;
        targetPnL += pnl;
      } else {
        // Options payoff on Expiry
        const payoffAtExpiry = isCall ? Math.max(0, p - strike) : Math.max(0, strike - p);
        const legExpiryPnL = isBuy
          ? (payoffAtExpiry - entryPrice) * qty
          : (entryPrice - payoffAtExpiry) * qty;
        expiryPnL += legExpiryPnL;

        // Options payoff on Target Date using Black-Scholes
        const bsTarget = calculateBlackScholes(isCall, p, strike, targetRemainingT, r, legIv);
        const legTargetPnL = isBuy
          ? (bsTarget.price - entryPrice) * qty
          : (entryPrice - bsTarget.price) * qty;
        targetPnL += legTargetPnL;
      }
    });

    expiryPnL = Math.round(expiryPnL);
    targetPnL = Math.round(targetPnL);

    if (expiryPnL > maxProfitExpiry) maxProfitExpiry = expiryPnL;
    if (expiryPnL < maxLossExpiry) maxLossExpiry = expiryPnL;
    if (targetPnL > maxProfitTarget) maxProfitTarget = targetPnL;
    if (targetPnL < maxLossTarget) maxLossTarget = targetPnL;

    points.push({
      spot: p,
      expiryPnL,
      targetPnL,
      isProfitExpiry: expiryPnL >= 0,
      isProfitTarget: targetPnL >= 0,
    });
  }

  // Find Breakevens (points where PnL crosses zero)
  const breakevensExpiry = [];
  const breakevensTarget = [];

  for (let i = 0; i < points.length - 1; i++) {
    const cur = points[i];
    const nxt = points[i + 1];

    // Expiry crossing
    if ((cur.expiryPnL <= 0 && nxt.expiryPnL >= 0) || (cur.expiryPnL >= 0 && nxt.expiryPnL <= 0)) {
      if (nxt.expiryPnL !== cur.expiryPnL) {
        const zeroSpot = Math.round(cur.spot + (-cur.expiryPnL * (nxt.spot - cur.spot)) / (nxt.expiryPnL - cur.expiryPnL));
        if (!breakevensExpiry.includes(zeroSpot)) {
          breakevensExpiry.push(zeroSpot);
        }
      }
    }

    // Target crossing
    if ((cur.targetPnL <= 0 && nxt.targetPnL >= 0) || (cur.targetPnL >= 0 && nxt.targetPnL <= 0)) {
      if (nxt.targetPnL !== cur.targetPnL) {
        const zeroSpot = Math.round(cur.spot + (-cur.targetPnL * (nxt.spot - cur.spot)) / (nxt.targetPnL - cur.targetPnL));
        if (!breakevensTarget.includes(zeroSpot)) {
          breakevensTarget.push(zeroSpot);
        }
      }
    }
  }

  // Insert exact breakeven points into points array so zero crossing has 0.0 value
  breakevensExpiry.forEach(be => {
    if (be >= minPrice && be <= maxPrice && !points.some(p => p.spot === be)) {
      let beTargetPnL = 0;
      activeLegs.forEach(leg => {
        const isCall = String(leg.type).toUpperCase() === 'CE';
        const isFut = String(leg.type).toUpperCase() === 'FUT';
        const isBuy = String(leg.side).toUpperCase() === 'BUY';
        const qty = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 25);
        const entryPrice = Number(leg.entryPrice || leg.ltp || 0);
        const strike = Number(leg.strike) || be;
        const baseIv = (Number(leg.iv) || 15) / 100.0;
        const legIv = Math.max(0.01, baseIv + (ivAdjustment / 100.0));

        if (isFut) {
          const diff = be - entryPrice;
          beTargetPnL += isBuy ? diff * qty : -diff * qty;
        } else {
          const bsTarget = calculateBlackScholes(isCall, be, strike, targetRemainingT, r, legIv);
          beTargetPnL += isBuy ? (bsTarget.price - entryPrice) * qty : (entryPrice - bsTarget.price) * qty;
        }
      });

      points.push({
        spot: be,
        expiryPnL: 0,
        targetPnL: Math.round(beTargetPnL),
        isProfitExpiry: true,
        isProfitTarget: beTargetPnL >= 0,
      });
    }
  });

  points.sort((a, b) => a.spot - b.spot);

  // Current P&L at spot price
  let currentPnL = 0;
  activeLegs.forEach(leg => {
    const isBuy = String(leg.side).toUpperCase() === 'BUY';
    const qty = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 25);
    const entryPrice = Number(leg.entryPrice || 0);
    const ltp = Number(leg.ltp || entryPrice);
    currentPnL += isBuy ? (ltp - entryPrice) * qty : (entryPrice - ltp) * qty;
  });

  // Probability of Profit (POP) estimation using Breakevens and normal distribution
  let pop = 50;
  const avgIv = activeLegs.reduce((sum, l) => sum + (Number(l.iv) || 15), 0) / (activeLegs.length || 1) / 100.0;
  const tTotal = Math.max(0.001, daysToExpiry / 365.0);
  const sdMove = spotPrice * avgIv * Math.sqrt(tTotal);

  if (breakevensExpiry.length === 2) {
    const b1 = Math.min(breakevensExpiry[0], breakevensExpiry[1]);
    const b2 = Math.max(breakevensExpiry[0], breakevensExpiry[1]);
    const d1 = (b1 - spotPrice) / sdMove;
    const d2 = (b2 - spotPrice) / sdMove;
    const pBetween = Math.abs(standardNormalCdf(d2) - standardNormalCdf(d1)) * 100;
    
    // Check if middle is profit (e.g. Iron Condor / Short Straddle) or wings are profit (e.g. Long Straddle)
    const midPoint = points.find(p => p.spot >= (b1 + b2) / 2) || points[Math.floor(points.length / 2)];
    if (midPoint && midPoint.expiryPnL > 0) {
      pop = Math.min(99, Math.max(1, Math.round(pBetween)));
    } else {
      pop = Math.min(99, Math.max(1, Math.round(100 - pBetween)));
    }
  } else if (breakevensExpiry.length === 1) {
    const b = breakevensExpiry[0];
    const d = (b - spotPrice) / sdMove;
    if (slopeHigh > 0) {
      // Bullish strategy (Call buy, etc.)
      pop = Math.min(99, Math.max(1, Math.round((1 - standardNormalCdf(d)) * 100)));
    } else {
      // Bearish strategy (Put buy, etc.)
      pop = Math.min(99, Math.max(1, Math.round(standardNormalCdf(d) * 100)));
    }
  } else {
    // If no breakeven, either all profit or all loss
    if (points[0]?.expiryPnL > 0) pop = 95;
    else pop = 5;
  }

  // Target PnL at current spot
  const spotPoint = points.find(p => Math.abs(p.spot - spotPrice) < stepSize) || points[Math.floor(points.length / 2)];
  const targetPnLAtSpot = spotPoint ? spotPoint.targetPnL : 0;

  return {
    points,
    breakevensExpiry,
    breakevensTarget,
    maxProfitExpiry: isUnlimitedProfit ? 'Unlimited' : maxProfitExpiry,
    maxLossExpiry: isUnlimitedLoss ? 'Unlimited' : maxLossExpiry,
    maxProfitTarget,
    maxLossTarget,
    currentPnL: Math.round(currentPnL),
    targetPnLAtSpot,
    netGreeks: {
      delta: Number(netDelta.toFixed(2)),
      gamma: Number(netGamma.toFixed(4)),
      theta: Number(netTheta.toFixed(2)),
      vega: Number(netVega.toFixed(2)),
    },
    isUnlimitedProfit,
    isUnlimitedLoss,
    pop,
    intrinsicTotal: Math.round(totalIntrinsic),
    timeValueTotal: Math.round(totalTimeValue),
    sd1: Math.round(sdMove),
    sd2: Math.round(sdMove * 2),
    minPrice,
    maxPrice,
  };
}
