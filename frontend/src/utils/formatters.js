/**
 * Format numbers as Indian Rupees (₹)
 * e.g. 128450 -> ₹1,28,450
 */
export function formatINR(val, includeDecimals = false) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  const isNegative = num < 0;
  const absVal = Math.abs(num);

  let formatted = absVal.toLocaleString('en-IN', {
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

export function formatCompactINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  const isNegative = num < 0;
  const abs = Math.abs(num);

  if (abs >= 10000000) {
    return `${isNegative ? '-' : ''}₹${(abs / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${isNegative ? '-' : ''}₹${(abs / 100000).toFixed(2)}L`;
  }
  if (abs >= 1000) {
    return `${isNegative ? '-' : ''}₹${(abs / 1000).toFixed(1)}K`;
  }
  return `${isNegative ? '-' : ''}₹${abs.toFixed(0)}`;
}

export function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  const num = Number(val);
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
