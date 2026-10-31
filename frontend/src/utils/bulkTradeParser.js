import * as XLSX from 'xlsx';

// Dynamic Broker Definitions - easily extensible for future brokers
export const BROKER_OPTIONS = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    fullName: 'Zerodha (F&O P&L Statement)',
    description: 'Excel/CSV file downloaded from Zerodha Console > Reports > P&L (e.g. pnl-NQ2990.xlsx)',
    badgeColor: 'blue',
    sampleDownloadable: false,
    fileTypes: '.xlsx, .xls, .csv',
  },
  {
    id: 'kotakneo',
    name: 'Kotak Neo',
    fullName: 'Kotak Neo (Gain & Loss Report)',
    description: 'Excel/CSV file downloaded from Kotak Neo Statements > Gain/Loss (e.g. Gain_Loss_*.xlsx)',
    badgeColor: 'rose',
    sampleDownloadable: false,
    fileTypes: '.xlsx, .xls, .csv',
  },
  {
    id: 'custom',
    name: 'Custom Template',
    fullName: 'Custom Excel / CSV Template',
    description: 'Standard customizable format with trade date, index, type, strike, prices, qty',
    badgeColor: 'emerald',
    sampleDownloadable: true,
    fileTypes: '.xlsx, .xls, .csv',
  },
];

// Standard Indian lot sizes fallback
const DEFAULT_LOT_SIZES = {
  NIFTY: 65,
  BANKNIFTY: 30,
  FINNIFTY: 60,
  MIDCPNIFTY: 120,
  NIFTYNXT50: 25,
  SENSEX: 20,
  BANKEX: 30,
  SENSEX50: 75,
  CRUDEOIL: 100,
  GOLD: 1,
  SILVER: 1,
};

/**
 * Clean numeric value from spreadsheet (handles string numbers with commas, currency symbols, parentheses)
 */
function cleanNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const str = String(val).replace(/[₹,$,\s]/g, '').trim();
  if (str.startsWith('(') && str.endsWith(')')) {
    const num = parseFloat(str.slice(1, -1));
    return isNaN(num) ? defaultVal : -num;
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Format Excel date (serial number or string) to YYYY-MM-DD
 */
function formatExcelDate(rawDate) {
  if (!rawDate) return new Date().toISOString().split('T')[0];

  // If already in YYYY-MM-DD format
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return rawDate.trim();
  }

  // If Excel numeric serial date (e.g. 45500)
  if (typeof rawDate === 'number') {
    const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
    return jsDate.toISOString().split('T')[0];
  }

  const str = String(rawDate).trim();

  // If DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // If DD-Mon-YY or DD-Mon-YYYY (e.g. 02-Jul-26 or 02-Jul-2026)
  const ddmon = str.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{2,4})$/);
  if (ddmon) {
    const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
    const day = ddmon[1].padStart(2, '0');
    const month = months[ddmon[2].toUpperCase()] || '01';
    const year = ddmon[3].length === 2 ? '20' + ddmon[3] : ddmon[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback to JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Parse Kotak Neo Script Name:
 * Examples:
 *  "SENSEX 02Jul26 CE 77200"
 *  "BANKNIFTY 25Aug26 CE 56900"
 *  "NIFTY 04Aug26 CE 24300"
 *  "CRUDEOIL 16Jul26 CE 6600"
 */
export function parseKotakNeoScript(script) {
  if (!script || typeof script !== 'string') return null;
  const cleaned = script.trim();

  // Pattern: [SYMBOL] [DDMonYY] [CE|PE] [STRIKE]
  const m = cleaned.match(/^([A-Z]+)\s+([0-9]{1,2})([A-Za-z]{3})([0-9]{2})\s+(CE|PE)\s+([0-9.]+)/i);
  if (m) {
    const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
    const month = months[m[3].toUpperCase()] || '01';
    const day = m[2].padStart(2, '0');
    const year = '20' + m[4];
    return {
      index_name: m[1].toUpperCase(),
      expiry_date: `${year}-${month}-${day}`,
      option_type: m[5].toUpperCase(),
      strike_price: parseFloat(m[6]),
    };
  }

  // Optional match for Futures: [SYMBOL] [DDMonYY] FUT
  const mFut = cleaned.match(/^([A-Z]+)\s+([0-9]{1,2})([A-Za-z]{3})([0-9]{2})\s+FUT/i);
  if (mFut) {
    const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
    const month = months[mFut[3].toUpperCase()] || '01';
    const day = mFut[2].padStart(2, '0');
    const year = '20' + mFut[4];
    return {
      index_name: mFut[1].toUpperCase(),
      expiry_date: `${year}-${month}-${day}`,
      option_type: 'CE',
      strike_price: 0,
      trading_type: 'Futures',
    };
  }

  return null;
}

/**
 * Parse Zerodha Symbol:
 * Examples:
 *  "BANKNIFTY26JUN47000PE" (Monthly)
 *  "NIFTY2651923050PE" (Weekly numeric month: 26, 5=May, 19th, 23050, PE)
 *  "NIFTY26N0322700CE" (Weekly letter month: 26, N=Nov, 03rd, 22700, CE)
 *  "SENSEX26O1572700CE" (Weekly: 26, O=Oct, 15th, 72700, CE)
 *  "NIFTY26JUNFUT" (Futures)
 */
export function parseZerodhaSymbol(sym) {
  if (!sym || typeof sym !== 'string') return null;
  const cleaned = sym.trim();

  // 1. Weekly with letter month (O=Oct, N=Nov, D=Dec)
  let m = cleaned.match(/^([A-Z]+)(\d{2})([OND])(\d{2})(\d+)(CE|PE)$/i);
  if (m) {
    const monthMap = { O: '10', N: '11', D: '12' };
    const month = monthMap[m[3].toUpperCase()];
    const year = '20' + m[2];
    const day = m[4];
    return {
      index_name: m[1].toUpperCase(),
      expiry_date: `${year}-${month}-${day}`,
      strike_price: parseFloat(m[5]),
      option_type: m[6].toUpperCase(),
    };
  }

  // 2. Weekly with 1-digit numeric month (1=Jan .. 9=Sep)
  m = cleaned.match(/^([A-Z]+)(\d{2})([1-9])(\d{2})(\d+)(CE|PE)$/i);
  if (m) {
    const month = m[3].padStart(2, '0');
    const year = '20' + m[2];
    const day = m[4];
    return {
      index_name: m[1].toUpperCase(),
      expiry_date: `${year}-${month}-${day}`,
      strike_price: parseFloat(m[5]),
      option_type: m[6].toUpperCase(),
    };
  }

  // 3. Monthly 3-letter month (JAN..DEC)
  m = cleaned.match(/^([A-Z]+)(\d{2})([A-Z]{3})(\d+)(CE|PE)$/i);
  if (m) {
    const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
    const month = months[m[3].toUpperCase()] || '01';
    const year = '20' + m[2];
    return {
      index_name: m[1].toUpperCase(),
      expiry_date: `${year}-${month}-28`,
      strike_price: parseFloat(m[4]),
      option_type: m[5].toUpperCase(),
    };
  }

  // 4. Futures
  m = cleaned.match(/^([A-Z]+)(\d{2})([A-Z]{3})FUT$/i);
  if (m) {
    const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
    const month = months[m[3].toUpperCase()] || '01';
    const year = '20' + m[2];
    return {
      index_name: m[1].toUpperCase(),
      expiry_date: `${year}-${month}-28`,
      strike_price: 0,
      option_type: 'CE',
      trading_type: 'Futures',
    };
  }

  return null;
}

/**
 * Main parse entry point: converts spreadsheet buffer/array into validated rows
 */
export async function parseTradesSpreadsheet(file, brokerId = 'zerodha', getLotSizeFn = null) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  // Select the appropriate sheet
  let sheetName = workbook.SheetNames[0];
  // In Kotak Neo, if sheet 2 exists or sheet contains 'Derivatives', inspect sheets
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const str = JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, blankrows: false }).slice(0, 15));
    if (str.includes('Script Name') || str.includes('Symbol') || str.includes('Trade Date')) {
      sheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (brokerId === 'kotakneo') {
    return parseKotakNeoRows(rawRows, getLotSizeFn);
  } else if (brokerId === 'zerodha') {
    return parseZerodhaRows(rawRows, getLotSizeFn);
  } else {
    return parseCustomRows(rawRows, getLotSizeFn);
  }
}

/**
 * Parser for Kotak Neo Gain/Loss Sheets
 */
function parseKotakNeoRows(rows, getLotSizeFn) {
  let headerRowIdx = -1;
  let colMap = {};

  // Find header row (can update dynamically if multiple sections exist)
  const isHeaderRow = (row) => {
    const scriptIdx = row.findIndex((c) => c.includes('script name') || c === 'symbol');
    const qtyIdx = row.findIndex((c) => c === 'qty' || c === 'qty.' || c.includes('quantity'));
    return scriptIdx !== -1 && qtyIdx !== -1;
  };

  const updateColMap = (row) => {
    const newMap = {};
    row.forEach((col, idx) => {
      if (col.includes('script name') || col === 'symbol') newMap.script = idx;
      if (col === 'qty' || col === 'qty.' || (col.includes('quantity') && !col.includes('open'))) newMap.qty = idx;
      if ((col.includes('buy amt') || col.includes('buy value')) && !col.includes('tax')) newMap.buyAmt = idx;
      if ((col.includes('sell amt') || col.includes('sell value')) && !col.includes('tax')) newMap.sellAmt = idx;
      if (col.includes('buy price')) newMap.buyPrice = idx;
      if (col.includes('sell price')) newMap.sellPrice = idx;
      if (col.includes('buy date')) newMap.buyDate = idx;
      if (col.includes('sell date')) newMap.sellDate = idx;
      if (col.includes('total charges')) newMap.totalCharges = idx;
      if ((col.includes('net p&l') || col.includes('net pnl')) && !col.includes('tax')) newMap.netPnl = idx;
      if (col.includes('gross p&l') || col.includes('gross pnl')) newMap.grossPnl = idx;
      if (col.includes('buy brokerage')) newMap.buyBrokerage = idx;
      if (col.includes('sell brokerage')) newMap.sellBrokerage = idx;
      if (col.includes('buy gst')) newMap.buyGst = idx;
      if (col.includes('sell gst')) newMap.sellGst = idx;
      if (col.includes('buy stt')) newMap.buyStt = idx;
      if (col.includes('sell stt')) newMap.sellStt = idx;
      if (col.includes('buy misc')) newMap.buyMisc = idx;
      if (col.includes('sell misc')) newMap.sellMisc = idx;
    });
    return newMap;
  };

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r].map((c) => String(c).toLowerCase().trim());
    if (isHeaderRow(row)) {
      headerRowIdx = r;
      colMap = updateColMap(row);
      break;
    }
  }

  if (headerRowIdx === -1) {
    return [
      {
        rowNumber: 1,
        isValid: false,
        errorMessage: 'Invalid Kotak Neo file structure: Header with "Script Name" and "Qty" not found.',
        trade: null,
      },
    ];
  }

  const results = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const rawRow = rows[r].map((c) => String(c).toLowerCase().trim());
    if (isHeaderRow(rawRow)) {
      colMap = updateColMap(rawRow);
      continue;
    }

    const row = rows[r];
    const scriptVal = String(row[colMap.script] || '').trim();

    // Skip empty or summary rows
    if (!scriptVal) continue;
    if (
      scriptVal.toLowerCase().includes('total') ||
      scriptVal.toLowerCase().includes('disclaimer') ||
      scriptVal.toLowerCase().includes('client') ||
      scriptVal.toLowerCase().startsWith('derivatives') ||
      scriptVal.toLowerCase().startsWith('commodity')
    ) {
      continue;
    }

    const rowNum = r + 1;
    const errors = [];

    // Parse script name
    const scriptMeta = parseKotakNeoScript(scriptVal);
    if (!scriptMeta) {
      errors.push(`Unable to parse script name: "${scriptVal}"`);
    }

    const qty = cleanNumber(row[colMap.qty], 0);
    if (qty <= 0) {
      errors.push(`Invalid quantity (${qty}), must be greater than 0.`);
    }

    const buyAmt = cleanNumber(row[colMap.buyAmt], 0);
    const sellAmt = cleanNumber(row[colMap.sellAmt], 0);

    const buyPrice = colMap.buyPrice !== undefined && row[colMap.buyPrice] !== ''
      ? cleanNumber(row[colMap.buyPrice])
      : qty > 0 ? cleanNumber(buyAmt / qty) : 0;

    const sellPrice = colMap.sellPrice !== undefined && row[colMap.sellPrice] !== ''
      ? cleanNumber(row[colMap.sellPrice])
      : qty > 0 ? cleanNumber(sellAmt / qty) : 0;

    const buyBrokerage = cleanNumber(row[colMap.buyBrokerage], 0);
    const sellBrokerage = cleanNumber(row[colMap.sellBrokerage], 0);
    const brokerage = +(buyBrokerage + sellBrokerage).toFixed(2);

    const buyGst = cleanNumber(row[colMap.buyGst], 0);
    const sellGst = cleanNumber(row[colMap.sellGst], 0);
    const gst = +(buyGst + sellGst).toFixed(2);

    const buyStt = cleanNumber(row[colMap.buyStt], 0);
    const sellStt = cleanNumber(row[colMap.sellStt], 0);
    const stt = +(buyStt + sellStt).toFixed(2);

    const buyMisc = cleanNumber(row[colMap.buyMisc], 0);
    const sellMisc = cleanNumber(row[colMap.sellMisc], 0);
    const exchangeCharges = +(buyMisc + sellMisc).toFixed(2);

    const totalCharges = colMap.totalCharges !== undefined && row[colMap.totalCharges] !== ''
      ? cleanNumber(row[colMap.totalCharges])
      : +(brokerage + gst + stt + exchangeCharges).toFixed(2);

    const rawGross = colMap.grossPnl !== undefined && row[colMap.grossPnl] !== ''
      ? cleanNumber(row[colMap.grossPnl])
      : +(sellAmt - buyAmt).toFixed(2);

    const grossProfit = rawGross >= 0 ? rawGross : 0;
    const grossLoss = rawGross < 0 ? Math.abs(rawGross) : 0;

    const netPnl = colMap.netPnl !== undefined && row[colMap.netPnl] !== ''
      ? cleanNumber(row[colMap.netPnl])
      : +(grossProfit - grossLoss - totalCharges).toFixed(2);

    // Trade Date determination
    let tradeDate = null;
    if (colMap.sellDate && row[colMap.sellDate]) {
      tradeDate = formatExcelDate(row[colMap.sellDate]);
    } else if (colMap.buyDate && row[colMap.buyDate]) {
      tradeDate = formatExcelDate(row[colMap.buyDate]);
    } else if (scriptMeta?.expiry_date) {
      tradeDate = scriptMeta.expiry_date;
    } else {
      tradeDate = new Date().toISOString().split('T')[0];
    }

    const indexName = scriptMeta?.index_name || 'NIFTY';
    const lotSize = getLotSizeFn ? getLotSizeFn(indexName) : (DEFAULT_LOT_SIZES[indexName] || 65);
    const lots = Math.max(1, Math.round(qty / lotSize));

    const isValid = errors.length === 0;

    results.push({
      rowNumber: rowNum,
      raw: row,
      scriptName: scriptVal,
      isValid,
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
      trade: {
        trade_date: tradeDate,
        index_name: indexName,
        trading_type: scriptMeta?.trading_type || 'Intraday',
        strategy_name: 'Long Straddle',
        option_type: scriptMeta?.option_type || 'CE',
        strike_price: scriptMeta?.strike_price || 0,
        expiry_date: scriptMeta?.expiry_date || tradeDate,
        entry_premium: +(buyPrice).toFixed(2),
        exit_premium: +(sellPrice).toFixed(2),
        quantity: qty,
        lots,
        gross_profit: grossProfit,
        gross_loss: grossLoss,
        brokerage,
        stt,
        exchange_charges: exchangeCharges,
        gst,
        sebi_charges: 0,
        stamp_duty: 0,
        other_charges: 0,
        total_charges: totalCharges,
        net_pnl: netPnl,
        source_broker: 'Kotak Neo',
        notes: `Imported from Kotak Neo: ${scriptVal}`,
      },
    });
  }

  return results;
}

/**
 * Parser for Zerodha F&O P&L Sheets
 */
function parseZerodhaRows(rows, getLotSizeFn) {
  let headerRowIdx = -1;
  let colMap = {};
  let statementDate = null;

  // Extract statement period if present
  for (let r = 0; r < Math.min(20, rows.length); r++) {
    const line = rows[r].map((c) => String(c)).join(' ');
    const periodMatch = line.match(/to\s+(\d{4}-\d{2}-\d{2})/i) || line.match(/from\s+.*?to\s+(\d{4}-\d{2}-\d{2})/i);
    if (periodMatch) {
      statementDate = periodMatch[1];
    }
  }

  // Find header row with Symbol & Quantity
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r].map((c) => String(c).toLowerCase().trim());
    const symbolIdx = row.findIndex((c) => c === 'symbol' || c.includes('symbol'));
    const qtyIdx = row.findIndex((c) => (c === 'quantity' || c === 'qty' || c.includes('quantity')) && !c.includes('open'));

    if (symbolIdx !== -1 && qtyIdx !== -1) {
      headerRowIdx = r;
      row.forEach((col, idx) => {
        if (col === 'symbol' || col.includes('symbol')) {
          if (colMap.symbol === undefined) colMap.symbol = idx;
        }
        if ((col === 'quantity' || col === 'qty' || col.includes('quantity')) && !col.includes('open')) {
          if (colMap.qty === undefined) colMap.qty = idx;
        }
        if ((col.includes('buy value') || col === 'buy amt') && colMap.buyVal === undefined) colMap.buyVal = idx;
        if ((col.includes('sell value') || col === 'sell amt') && colMap.sellVal === undefined) colMap.sellVal = idx;
        if ((col.includes('realized p&l') || col.includes('realised p&l')) && !col.includes('pct') && !col.includes('%') && colMap.realizedPnl === undefined) {
          colMap.realizedPnl = idx;
        }
      });
      break;
    }
  }

  if (headerRowIdx === -1) {
    return [
      {
        rowNumber: 1,
        isValid: false,
        errorMessage: 'Invalid Zerodha file structure: Header with "Symbol" and "Quantity" not found.',
        trade: null,
      },
    ];
  }

  const results = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const symbolVal = String(row[colMap.symbol] || '').trim();

    // Skip empty or summary rows
    if (!symbolVal) continue;
    if (
      symbolVal.toLowerCase().includes('total') ||
      symbolVal.toLowerCase().includes('summary') ||
      symbolVal.toLowerCase().includes('client') ||
      symbolVal.toLowerCase().startsWith('charges')
    ) {
      continue;
    }

    const rowNum = r + 1;
    const errors = [];

    // Parse symbol
    const meta = parseZerodhaSymbol(symbolVal);
    if (!meta) {
      errors.push(`Unable to parse Zerodha symbol format: "${symbolVal}"`);
    }

    const qty = cleanNumber(row[colMap.qty], 0);
    if (qty <= 0) {
      errors.push(`Invalid quantity (${qty}), must be greater than 0.`);
    }

    const buyVal = cleanNumber(row[colMap.buyVal], 0);
    const sellVal = cleanNumber(row[colMap.sellVal], 0);

    const entryPremium = qty > 0 ? +(buyVal / qty).toFixed(2) : 0;
    const exitPremium = qty > 0 ? +(sellVal / qty).toFixed(2) : 0;

    const realizedPnl = colMap.realizedPnl !== undefined && row[colMap.realizedPnl] !== ''
      ? cleanNumber(row[colMap.realizedPnl])
      : +(sellVal - buyVal).toFixed(2);

    const grossProfit = realizedPnl >= 0 ? realizedPnl : 0;
    const grossLoss = realizedPnl < 0 ? Math.abs(realizedPnl) : 0;

    // Standard Zerodha option charges estimate
    const isBse = meta?.index_name === 'SENSEX' || meta?.index_name === 'BANKEX';
    const txnRate = isBse ? 0.000325 : 0.0003553;
    const turnoverBuy = entryPremium * qty;
    const turnoverSell = exitPremium * qty;
    const totalTurnover = turnoverBuy + turnoverSell;

    const brokerage = 40.0; // ₹20 buy + ₹20 sell
    const stt = +(turnoverSell * 0.0015).toFixed(2);
    const exchangeCharges = +(totalTurnover * txnRate).toFixed(2);
    const sebiCharges = +(totalTurnover * (10 / 10000000)).toFixed(2);
    const stampDuty = +(turnoverBuy * 0.00003).toFixed(2);
    const gst = +((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2);
    const totalCharges = +(brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2);

    const netPnl = +(grossProfit - grossLoss - totalCharges).toFixed(2);

    const tradeDate = meta?.expiry_date || statementDate || new Date().toISOString().split('T')[0];
    const indexName = meta?.index_name || 'NIFTY';
    const lotSize = getLotSizeFn ? getLotSizeFn(indexName) : (DEFAULT_LOT_SIZES[indexName] || 65);
    const lots = Math.max(1, Math.round(qty / lotSize));

    const isValid = errors.length === 0;

    results.push({
      rowNumber: rowNum,
      raw: row,
      scriptName: symbolVal,
      isValid,
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
      trade: {
        trade_date: tradeDate,
        index_name: indexName,
        trading_type: meta?.trading_type || 'Intraday',
        strategy_name: 'Long Straddle',
        option_type: meta?.option_type || 'CE',
        strike_price: meta?.strike_price || 0,
        expiry_date: meta?.expiry_date || tradeDate,
        entry_premium: entryPremium,
        exit_premium: exitPremium,
        quantity: qty,
        lots,
        gross_profit: grossProfit,
        gross_loss: grossLoss,
        brokerage,
        stt,
        exchange_charges: exchangeCharges,
        gst,
        sebi_charges: sebiCharges,
        stamp_duty: stampDuty,
        other_charges: 0,
        total_charges: totalCharges,
        net_pnl: netPnl,
        source_broker: 'Zerodha',
        notes: `Imported from Zerodha: ${symbolVal}`,
      },
    });
  }

  return results;
}

/**
 * Parser for Custom User Template
 */
function parseCustomRows(rows, getLotSizeFn) {
  if (!rows || rows.length < 2) {
    return [
      {
        rowNumber: 1,
        isValid: false,
        errorMessage: 'Custom file is empty or does not contain data rows.',
        trade: null,
      },
    ];
  }

  // Header matching
  const headers = rows[0].map((c) => String(c).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  const findIdx = (keywords) => headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const dateIdx = findIdx(['tradedate', 'date', 'entrydate']);
  const indexIdx = findIdx(['index', 'symbol', 'underlying']);
  const typeIdx = findIdx(['optiontype', 'type', 'cepe']);
  const strikeIdx = findIdx(['strikeprice', 'strike']);
  const qtyIdx = findIdx(['quantity', 'qty', 'shares']);
  const entryIdx = findIdx(['entrypremium', 'entryprice', 'buyprice', 'entry']);
  const exitIdx = findIdx(['exitpremium', 'exitprice', 'sellprice', 'exit']);
  const expiryIdx = findIdx(['expirydate', 'expiry']);
  const strategyIdx = findIdx(['strategy', 'strategyname']);
  const tradingTypeIdx = findIdx(['tradingtype']);
  const chargesIdx = findIdx(['totalcharges', 'charges']);
  const notesIdx = findIdx(['notes', 'reason', 'remarks']);

  const results = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === '')) continue;

    const rowNum = r + 1;
    const errors = [];

    // Date
    const rawDate = dateIdx !== -1 ? row[dateIdx] : null;
    const tradeDate = formatExcelDate(rawDate);
    if (!rawDate) {
      errors.push('Missing Trade Date');
    }

    // Index
    const rawIndex = indexIdx !== -1 ? String(row[indexIdx]).toUpperCase().trim() : '';
    if (!rawIndex) {
      errors.push('Missing Index/Symbol');
    }

    // Option Type
    let optType = typeIdx !== -1 ? String(row[typeIdx]).toUpperCase().trim() : 'CE';
    if (!['CE', 'PE', 'BOTH'].includes(optType)) {
      errors.push(`Invalid Option Type "${optType}" (must be CE, PE, or Both)`);
      optType = 'CE';
    }

    // Strike Price
    const strike = strikeIdx !== -1 ? cleanNumber(row[strikeIdx]) : 0;
    if (strike <= 0 && optType !== 'BOTH') {
      errors.push(`Invalid Strike Price (${strike})`);
    }

    // Quantity
    const qty = qtyIdx !== -1 ? cleanNumber(row[qtyIdx]) : 0;
    if (qty <= 0) {
      errors.push(`Invalid Quantity (${qty}), must be > 0`);
    }

    // Premiums
    const entryPremium = entryIdx !== -1 ? cleanNumber(row[entryIdx]) : 0;
    const exitPremium = exitIdx !== -1 ? cleanNumber(row[exitIdx]) : 0;
    if (entryPremium < 0) errors.push('Entry premium cannot be negative');
    if (exitPremium < 0) errors.push('Exit premium cannot be negative');

    const indexName = rawIndex || 'NIFTY';
    const lotSize = getLotSizeFn ? getLotSizeFn(indexName) : (DEFAULT_LOT_SIZES[indexName] || 65);
    const lots = Math.max(1, Math.round(qty / lotSize));

    const diff = (exitPremium - entryPremium) * qty;
    const grossProfit = diff >= 0 ? +diff.toFixed(2) : 0;
    const grossLoss = diff < 0 ? +Math.abs(diff).toFixed(2) : 0;

    const totalCharges = chargesIdx !== -1 && row[chargesIdx] !== '' ? cleanNumber(row[chargesIdx]) : 65.0;
    const netPnl = +(grossProfit - grossLoss - totalCharges).toFixed(2);

    const isValid = errors.length === 0;

    results.push({
      rowNumber: rowNum,
      raw: row,
      scriptName: `${indexName} ${strike} ${optType}`,
      isValid,
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
      trade: {
        trade_date: tradeDate,
        index_name: indexName,
        trading_type: tradingTypeIdx !== -1 && row[tradingTypeIdx] ? String(row[tradingTypeIdx]).trim() : 'Intraday',
        strategy_name: strategyIdx !== -1 && row[strategyIdx] ? String(row[strategyIdx]).trim() : 'Long Straddle',
        option_type: optType,
        strike_price: strike,
        expiry_date: expiryIdx !== -1 && row[expiryIdx] ? formatExcelDate(row[expiryIdx]) : tradeDate,
        entry_premium: entryPremium,
        exit_premium: exitPremium,
        quantity: qty,
        lots,
        gross_profit: grossProfit,
        gross_loss: grossLoss,
        brokerage: 40.0,
        stt: 0,
        exchange_charges: 0,
        gst: 0,
        sebi_charges: 0,
        stamp_duty: 0,
        other_charges: 0,
        total_charges: totalCharges,
        net_pnl: netPnl,
        source_broker: 'Custom Template',
        notes: notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : 'Custom Bulk Import',
      },
    });
  }

  return results;
}

/**
 * Generate and download a standard Custom Excel template (.xlsx)
 */
export function downloadCustomSampleTemplate() {
  const sampleData = [
    {
      'Trade Date': '2026-10-31',
      'Index': 'NIFTY',
      'Trading Type': 'Intraday',
      'Option Type': 'CE',
      'Strike Price': 25000,
      'Expiry Date': '2026-11-06',
      'Quantity': 65,
      'Lots': 1,
      'Entry Premium': 124.50,
      'Exit Premium': 156.00,
      'Strategy Name': 'Long Straddle',
      'Market Condition': 'Bullish Trending',
      'Notes': 'Morning breakout above VWAP',
    },
    {
      'Trade Date': '2026-10-31',
      'Index': 'BANKNIFTY',
      'Trading Type': 'Intraday',
      'Option Type': 'PE',
      'Strike Price': 51500,
      'Expiry Date': '2026-11-06',
      'Quantity': 30,
      'Lots': 1,
      'Entry Premium': 210.00,
      'Exit Premium': 185.00,
      'Strategy Name': 'Buy Put',
      'Market Condition': 'Rangebound',
      'Notes': 'Exit at trailing stop loss',
    },
    {
      'Trade Date': '2026-10-30',
      'Index': 'SENSEX',
      'Trading Type': 'Positional',
      'Option Type': 'CE',
      'Strike Price': 77000,
      'Expiry Date': '2026-11-06',
      'Quantity': 40,
      'Lots': 2,
      'Entry Premium': 145.25,
      'Exit Premium': 220.00,
      'Strategy Name': 'Bull Call Spread',
      'Market Condition': 'Bullish Trending',
      'Notes': 'Target reached on RBI rate announcement',
    },
    {
      'Trade Date': '2026-10-29',
      'Index': 'FINNIFTY',
      'Trading Type': 'Intraday',
      'Option Type': 'Both',
      'Strike Price': 24000,
      'Expiry Date': '2026-11-04',
      'Quantity': 60,
      'Lots': 1,
      'Entry Premium': 180.00,
      'Exit Premium': 140.00,
      'Strategy Name': 'Short Straddle',
      'Market Condition': 'Low Volatility',
      'Notes': 'Theta decay strategy on expiry day',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Trade Date
    { wch: 14 }, // Index
    { wch: 14 }, // Trading Type
    { wch: 12 }, // Option Type
    { wch: 14 }, // Strike Price
    { wch: 14 }, // Expiry Date
    { wch: 10 }, // Quantity
    { wch: 8 },  // Lots
    { wch: 14 }, // Entry Premium
    { wch: 14 }, // Exit Premium
    { wch: 18 }, // Strategy Name
    { wch: 18 }, // Market Condition
    { wch: 35 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sample Trades');

  XLSX.writeFile(wb, 'trade_journal_custom_import_sample.xlsx');
}
