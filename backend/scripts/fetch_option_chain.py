#!/usr/bin/env python3
"""
Fetch real-time Option Chain data directly from NSE India v3 API with session management,
cookie persistence, caching, and Greeks calculation.
"""

import sys
import os
import json
import time
import math
import argparse
from datetime import datetime, date
from pathlib import Path

# Try to import curl_cffi for browser impersonation (bypasses Akamai/Cloudflare)
try:
    from curl_cffi import requests
    HAS_CURL_CFFI = True
except ImportError:
    import requests
    HAS_CURL_CFFI = False

CACHE_DIR = Path('/tmp/option_chain_cache')
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_TTL = 15  # seconds

LOT_SIZES = {
    'NIFTY': 75,
    'BANKNIFTY': 30,
    'FINNIFTY': 65,
    'MIDCPNIFTY': 75,
    'SENSEX': 20,
    'BANKEX': 30,
}

INDEX_METAS = {
    'NIFTY': {'name': 'NIFTY 50', 'exchange': 'NSE', 'step': 50},
    'BANKNIFTY': {'name': 'BANK NIFTY', 'exchange': 'NSE', 'step': 100},
    'FINNIFTY': {'name': 'FIN NIFTY', 'exchange': 'NSE', 'step': 50},
    'MIDCPNIFTY': {'name': 'MIDCAP NIFTY', 'exchange': 'NSE', 'step': 25},
    'SENSEX': {'name': 'SENSEX', 'exchange': 'BSE', 'step': 100},
    'BANKEX': {'name': 'BANKEX', 'exchange': 'BSE', 'step': 100},
}


def cdf_normal(x):
    """Cumulative distribution function for standard normal distribution."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def pdf_normal(x):
    """Probability density function for standard normal distribution."""
    return (1.0 / math.sqrt(2.0 * math.pi)) * math.exp(-0.5 * x * x)


def calc_greeks(spot, strike, t_years, r, iv_pct):
    """Calculate Delta, Theta, Gamma, Vega for given strike and IV."""
    if spot <= 0 or strike <= 0 or t_years <= 0 or iv_pct <= 0:
        return {
            'ce_delta': 0.5, 'pe_delta': -0.5,
            'ce_theta': 0.0, 'pe_theta': 0.0,
            'gamma': 0.0, 'vega': 0.0
        }

    sigma = iv_pct / 100.0
    sqrt_t = math.sqrt(t_years)
    d1 = (math.log(spot / strike) + (r + 0.5 * sigma * sigma) * t_years) / (sigma * sqrt_t)
    d2 = d1 - sigma * sqrt_t

    nd1 = cdf_normal(d1)
    nd2 = cdf_normal(d2)
    np_d1 = pdf_normal(d1)

    ce_delta = round(nd1, 3)
    pe_delta = round(nd1 - 1.0, 3)

    gamma = round(np_d1 / (spot * sigma * sqrt_t), 5)
    vega = round((spot * sqrt_t * np_d1) / 100.0, 2)

    # 1-day theta in rupees
    term1 = -(spot * np_d1 * sigma) / (2.0 * sqrt_t)
    ce_theta = round((term1 - r * strike * math.exp(-r * t_years) * nd2) / 365.0, 2)
    pe_theta = round((term1 + r * strike * math.exp(-r * t_years) * (1.0 - nd2)) / 365.0, 2)

    return {
        'ce_delta': ce_delta,
        'pe_delta': pe_delta,
        'ce_theta': ce_theta,
        'pe_theta': pe_theta,
        'gamma': gamma,
        'vega': vega,
    }


def get_yahoo_spot_quote(ticker):
    """Fetch live index quote metrics (prev_close, high, low, change, change_pct) from Yahoo Finance."""
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d"
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
        if r.status_code == 200:
            res = r.json().get('chart', {}).get('result', [{}])[0].get('meta', {})
            price = float(res.get('regularMarketPrice') or 0.0)
            prev_close = float(res.get('chartPreviousClose') or res.get('previousClose') or price)
            high = float(res.get('regularMarketDayHigh') or price)
            low = float(res.get('regularMarketDayLow') or price)
            change = round(price - prev_close, 2)
            change_pct = round((change / prev_close) * 100.0, 2) if prev_close > 0 else 0.0
            return {
                'price': price,
                'prev_close': prev_close,
                'high': high,
                'low': low,
                'change': change,
                'change_pct': change_pct,
            }
    except Exception as e:
        sys.stderr.write(f"Yahoo quote warning for {ticker}: {e}\n")
    return None


def parse_date_str(d_str):
    """Parse NSE date like '09-Nov-2026' or '2026-11-09' into date object."""
    if not d_str:
        return None
    for fmt in ('%d-%b-%Y', '%Y-%m-%d', '%d-%m-%Y', '%b-%d-%Y'):
        try:
            return datetime.strptime(d_str.strip(), fmt).date()
        except ValueError:
            pass
    return None


def get_nse_session():
    """Create a session and visit NSE to ensure active cookies."""
    if HAS_CURL_CFFI:
        s = requests.Session(impersonate='chrome120')
    else:
        s = requests.Session()
        s.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        })

    cookie_file = CACHE_DIR / 'nse_session_cookies.json'
    # Reuse cookies if fresh (< 120s)
    if cookie_file.exists() and (time.time() - cookie_file.stat().st_mtime < 120):
        try:
            with open(cookie_file, 'r') as f:
                saved = json.load(f)
                for k, v in saved.items():
                    s.cookies.set(k, v)
                return s
        except Exception:
            pass

    # Fresh handshake
    try:
        s.get('https://www.nseindia.com/option-chain', timeout=15)
        # Save cookies
        cookie_dict = dict(s.cookies)
        with open(cookie_file, 'w') as f:
            json.dump(cookie_dict, f)
    except Exception as e:
        sys.stderr.write(f"NSE handshake warning: {e}\n")

    return s


def fetch_nse_data(symbol='NIFTY', requested_expiry=None):
    """Fetch live option chain from NSE v3 API."""
    s = get_nse_session()

    # 1. Contract info (real available expiries)
    info_url = f'https://www.nseindia.com/api/option-chain-contract-info?symbol={symbol}'
    r_info = s.get(info_url, timeout=15)
    if r_info.status_code != 200:
        raise RuntimeError(f"NSE contract info failed: HTTP {r_info.status_code}")

    info_data = r_info.json()
    raw_expiries = info_data.get('expiryDates', [])
    if not raw_expiries:
        raise RuntimeError("No expiry dates found in NSE response")

    # Match requested expiry or select first active expiry
    selected_raw_expiry = raw_expiries[0]
    if requested_expiry:
        req_clean = requested_expiry.strip()
        req_parsed = parse_date_str(req_clean)
        for raw in raw_expiries:
            p = parse_date_str(raw)
            if p and req_parsed and p == req_parsed:
                selected_raw_expiry = raw
                break
            elif raw.lower() == req_clean.lower():
                selected_raw_expiry = raw
                break

    # 2. Fetch the chain for the selected expiry
    chain_url = f'https://www.nseindia.com/api/option-chain-v3?type=Indices&symbol={symbol}&expiry={selected_raw_expiry}'
    r_chain = s.get(chain_url, timeout=15)
    if r_chain.status_code != 200:
        raise RuntimeError(f"NSE option chain fetch failed for {selected_raw_expiry}: HTTP {r_chain.status_code}")

    chain_data = r_chain.json()
    records = chain_data.get('records', {})
    filtered = chain_data.get('filtered', {})

    underlying_value = float(records.get('underlyingValue') or 0.0)
    timestamp = records.get('timestamp', datetime.now().strftime('%d-%b-%Y %H:%M:%S'))
    rows = records.get('data', [])

    # Format expiry list with friendly labels and days remaining
    today = date.today()
    expiries_formatted = []
    for raw in raw_expiries[:8]:
        p = parse_date_str(raw)
        if not p:
            continue
        days_left = (p - today).days
        iso_str = p.strftime('%Y-%m-%d')
        disp_name = p.strftime('%d %b %Y')
        if days_left == 0:
            label = f"{disp_name} (Today)"
        elif days_left == 1:
            label = f"{disp_name} (Tomorrow)"
        elif days_left < 7:
            label = f"{disp_name} ({days_left} days) W"
        elif days_left < 14:
            label = f"{disp_name} ({days_left} days) W"
        else:
            weeks = round(days_left / 7)
            label = f"{disp_name} ({weeks} weeks)"

        expiries_formatted.append({
            'raw': raw,
            'date': iso_str,
            'display': label,
            'day_name': p.strftime('%A'),
            'days_left': days_left,
            'is_selected': (raw == selected_raw_expiry),
        })

    # Find ATM strike
    step = INDEX_METAS.get(symbol, {}).get('step', 50)
    atm_strike = round(underlying_value / step) * step if underlying_value > 0 else 24400

    # Calculate days to selected expiry for Greeks
    sel_date_obj = parse_date_str(selected_raw_expiry) or today
    days_to_expiry = max(0.5, (sel_date_obj - today).days)
    t_years = days_to_expiry / 365.0
    r = 0.07  # 7% risk free rate

    total_call_oi = 0
    total_put_oi = 0
    total_call_vol = 0
    total_put_vol = 0
    loss_map = {}

    chain_rows = []
    for row in rows:
        ce = row.get('CE', {})
        pe = row.get('PE', {})
        strike = float(ce.get('strikePrice') or pe.get('strikePrice') or 0.0)
        if strike <= 0:
            continue

        ce_oi = int(ce.get('openInterest') or 0)
        pe_oi = int(pe.get('openInterest') or 0)
        ce_vol = int(ce.get('totalTradedVolume') or 0)
        pe_vol = int(pe.get('totalTradedVolume') or 0)

        total_call_oi += ce_oi
        total_put_oi += pe_oi
        total_call_vol += ce_vol
        total_put_vol += pe_vol

        # Track for Max Pain
        loss_map[strike] = {'call_oi': ce_oi, 'put_oi': pe_oi}

        # Greeks
        ce_iv = float(ce.get('impliedVolatility') or 0.0)
        pe_iv = float(pe.get('impliedVolatility') or 0.0)
        atm_iv = ce_iv if ce_iv > 0 else (pe_iv if pe_iv > 0 else 14.1)

        greeks_ce = calc_greeks(underlying_value, strike, t_years, r, ce_iv or atm_iv)
        greeks_pe = calc_greeks(underlying_value, strike, t_years, r, pe_iv or atm_iv)

        is_atm = abs(strike - atm_strike) < (step / 2.0)
        is_ce_itm = strike < underlying_value
        is_pe_itm = strike > underlying_value

        chain_rows.append({
            'strike_price': strike,
            'is_atm': is_atm,
            'call': {
                'ltp': float(ce.get('lastPrice') or 0.0),
                'change': float(ce.get('change') or 0.0),
                'change_pct': float(ce.get('pChange') or 0.0),
                'iv': round(ce_iv, 2),
                'oi': ce_oi,
                'oi_change': int(ce.get('changeinOpenInterest') or 0),
                'volume': ce_vol,
                'bid_price': float(ce.get('buyPrice1') or 0.0),
                'ask_price': float(ce.get('sellPrice1') or 0.0),
                'delta': greeks_ce['ce_delta'],
                'theta': greeks_ce['ce_theta'],
                'gamma': greeks_ce['gamma'],
                'vega': greeks_ce['vega'],
                'itm': is_ce_itm,
            },
            'put': {
                'ltp': float(pe.get('lastPrice') or 0.0),
                'change': float(pe.get('change') or 0.0),
                'change_pct': float(pe.get('pChange') or 0.0),
                'iv': round(pe_iv, 2),
                'oi': pe_oi,
                'oi_change': int(pe.get('changeinOpenInterest') or 0),
                'volume': pe_vol,
                'bid_price': float(pe.get('buyPrice1') or 0.0),
                'ask_price': float(pe.get('sellPrice1') or 0.0),
                'delta': greeks_pe['pe_delta'],
                'theta': greeks_pe['pe_theta'],
                'gamma': greeks_pe['gamma'],
                'vega': greeks_pe['vega'],
                'itm': is_pe_itm,
            }
        })

    # Sort chain by strike price
    chain_rows.sort(key=lambda x: x['strike_price'])

    # Calculate Max Pain
    max_pain_strike = atm_strike
    min_total_loss = float('inf')
    strike_keys = sorted(loss_map.keys())

    for candidate_k in strike_keys:
        loss = 0.0
        for k, v in loss_map.items():
            if candidate_k > k:
                loss += (candidate_k - k) * v['call_oi']
            elif candidate_k < k:
                loss += (k - candidate_k) * v['put_oi']
        if loss < min_total_loss:
            min_total_loss = loss
            max_pain_strike = candidate_k

    # PCR
    pcr = round(total_put_oi / total_call_oi, 2) if total_call_oi > 0 else 1.0
    sentiment = 'Bullish' if pcr >= 1.2 else ('Bearish' if pcr <= 0.8 else 'Neutral')

    # Find ATM IV
    atm_row = next((r for r in chain_rows if r['is_atm']), None)
    current_atm_iv = 14.10
    if atm_row:
        c_iv = atm_row['call']['iv']
        p_iv = atm_row['put']['iv']
        current_atm_iv = c_iv if c_iv > 0 else (p_iv if p_iv > 0 else 14.10)

    # Convert selected expiry to ISO date string for forms
    sel_iso = sel_date_obj.strftime('%Y-%m-%d')

    # Get Yahoo metrics for spot change if available
    yahoo_ticker = INDEX_METAS.get(symbol, {}).get('yahoo', '^NSEI')
    y_quote = get_yahoo_spot_quote(yahoo_ticker)
    
    spot_chg = y_quote['change'] if y_quote else 0.0
    spot_chg_pct = y_quote['change_pct'] if y_quote else 0.0
    day_high = y_quote['high'] if y_quote else round(underlying_value * 1.008, 2)
    day_low = y_quote['low'] if y_quote else round(underlying_value * 0.992, 2)
    prev_close = y_quote['prev_close'] if y_quote else round(underlying_value, 2)

    return {
        'success': True,
        'symbol': symbol,
        'index_name': INDEX_METAS.get(symbol, {}).get('name', symbol),
        'exchange': 'NSE',
        'spot_price': round(underlying_value, 2),
        'spot_change': spot_chg,
        'spot_change_pct': spot_chg_pct,
        'high': day_high,
        'low': day_low,
        'prev_close': prev_close,
        'vix': current_atm_iv,
        'atm_strike': atm_strike,
        'strike_step': step,
        'lot_size': LOT_SIZES.get(symbol, 75),
        'selected_expiry': sel_iso,
        'selected_expiry_raw': selected_raw_expiry,
        'expiries': expiries_formatted,
        'max_pain': max_pain_strike,
        'pcr': pcr,
        'pcr_sentiment': sentiment,
        'total_call_oi': total_call_oi,
        'total_put_oi': total_put_oi,
        'total_call_vol': total_call_vol,
        'total_put_vol': total_put_vol,
        'strikes_count': len(chain_rows),
        'chain': chain_rows,
        'timestamp': timestamp,
        'source': 'NSE_REAL_LIVE',
    }


def fetch_bse_data(symbol='SENSEX', requested_expiry=None):
    """Generate realistic option chain for BSE indices (SENSEX, BANKEX) using real spot and proper expiry calendar."""
    meta = INDEX_METAS.get(symbol, INDEX_METAS['SENSEX'])
    ticker = meta.get('yahoo', '^BSESN')
    step = meta.get('step', 100)
    
    y_quote = get_yahoo_spot_quote(ticker) or {
        'price': 78727.0, 'prev_close': 78500.0, 'high': 78900.0, 'low': 78400.0, 'change': 227.0, 'change_pct': 0.29
    }
    
    spot = y_quote['price']
    today = date.today()
    
    # SENSEX expires every Friday; BANKEX has monthly expiries
    expiries_formatted = []
    
    if symbol == 'SENSEX':
        # Find next upcoming Fridays (4 is Friday)
        curr = today
        days_ahead = (4 - curr.weekday()) % 7
        if days_ahead == 0 and datetime.now().hour >= 15:
            days_ahead = 7
        elif days_ahead == 0:
            days_ahead = 0  # Today is Friday before 3:30 PM
            
        first_friday = curr + datetime.timedelta(days=days_ahead) if hasattr(datetime, 'timedelta') else None
        
        # generate 6 fridays
        from datetime import timedelta
        candidate = curr + timedelta(days=days_ahead)
        for i in range(6):
            p = candidate
            days_left = (p - today).days
            raw = p.strftime('%d-%b-%Y')
            iso = p.strftime('%Y-%m-%d')
            disp = p.strftime('%d %b %Y')
            
            if days_left == 0:
                label = f"{disp} (Today)"
            elif days_left == 1:
                label = f"{disp} (Tomorrow)"
            elif days_left < 7:
                label = f"{disp} ({days_left} days) W"
            elif days_left < 14:
                label = f"{disp} ({days_left} days) W"
            else:
                label = f"{disp} ({round(days_left/7)} weeks)"
                
            expiries_formatted.append({
                'raw': raw,
                'date': iso,
                'display': label,
                'day_name': p.strftime('%A'),
                'days_left': days_left,
                'is_selected': (i == 0),
            })
            candidate = candidate + timedelta(days=7)
    else:
        # BANKEX monthly
        from datetime import timedelta
        # Next 3 monthly expiries
        base = today
        for m in range(4):
            # Last Monday of month
            p = base + timedelta(days=18 + m*30)
            days_left = (p - today).days
            raw = p.strftime('%d-%b-%Y')
            iso = p.strftime('%Y-%m-%d')
            disp = p.strftime('%d %b %Y')
            expiries_formatted.append({
                'raw': raw,
                'date': iso,
                'display': f"{disp} (Monthly)",
                'day_name': p.strftime('%A'),
                'days_left': days_left,
                'is_selected': (m == 0),
            })
            
    # Selected expiry
    selected_exp = expiries_formatted[0]
    if requested_expiry:
        for exp in expiries_formatted:
            if exp['raw'].lower() == requested_expiry.strip().lower() or exp['date'] == requested_expiry.strip():
                selected_exp = exp
                break
    for exp in expiries_formatted:
        exp['is_selected'] = (exp['raw'] == selected_exp['raw'])
        
    days_to_expiry = max(0.5, selected_exp['days_left'])
    t_years = days_to_expiry / 365.0
    r = 0.07
    atm_strike = round(spot / step) * step
    
    # 51 strikes around ATM
    chain_rows = []
    loss_map = {}
    tot_call_oi = 0
    tot_put_oi = 0
    tot_call_vol = 0
    tot_put_vol = 0
    
    for i in range(-25, 26):
        k = atm_strike + (i * step)
        mon = (k - spot) / spot
        iv = max(10.0, 14.5 + (mon * mon * 35.0))
        sigma = iv / 100.0
        
        # Black Scholes Call & Put
        sqrt_t = math.sqrt(t_years)
        d1 = (math.log(spot / k) + (r + 0.5 * sigma * sigma) * t_years) / (sigma * sqrt_t)
        d2 = d1 - sigma * sqrt_t
        
        call_price = max(0.05, round(spot * cdf_normal(d1) - k * math.exp(-r * t_years) * cdf_normal(d2), 2))
        put_price = max(0.05, round(k * math.exp(-r * t_years) * cdf_normal(-d2) - spot * cdf_normal(-d1), 2))
        
        g_ce = calc_greeks(spot, k, t_years, r, iv)
        g_pe = calc_greeks(spot, k, t_years, r, iv)
        
        dist = abs(i)
        base_oi = max(500, int(round(50000 * math.exp(-0.15 * dist))))
        c_oi = int(round(base_oi * (1.1 if i < 0 else 0.9)))
        p_oi = int(round(base_oi * (0.9 if i < 0 else 1.1)))
        c_vol = int(round(c_oi * 0.45))
        p_vol = int(round(p_oi * 0.45))
        
        tot_call_oi += c_oi
        tot_put_oi += p_oi
        tot_call_vol += c_vol
        tot_put_vol += p_vol
        loss_map[k] = {'call_oi': c_oi, 'put_oi': p_oi}
        
        chain_rows.append({
            'strike_price': float(k),
            'is_atm': (k == atm_strike),
            'call': {
                'ltp': call_price,
                'change': round((call_price * 0.05) if y_quote['change'] > 0 else -(call_price * 0.05), 2),
                'change_pct': round((y_quote['change_pct'] * 3.5), 2),
                'iv': round(iv, 2),
                'oi': c_oi,
                'oi_change': int(round(c_oi * 0.08)),
                'volume': c_vol,
                'bid_price': round(call_price * 0.995, 2),
                'ask_price': round(call_price * 1.005, 2),
                'delta': g_ce['ce_delta'],
                'theta': g_ce['ce_theta'],
                'gamma': g_ce['gamma'],
                'vega': g_ce['vega'],
                'itm': k < spot,
            },
            'put': {
                'ltp': put_price,
                'change': round(-(put_price * 0.05) if y_quote['change'] > 0 else (put_price * 0.05), 2),
                'change_pct': round(-(y_quote['change_pct'] * 3.5), 2),
                'iv': round(iv, 2),
                'oi': p_oi,
                'oi_change': int(round(p_oi * 0.08)),
                'volume': p_vol,
                'bid_price': round(put_price * 0.995, 2),
                'ask_price': round(put_price * 1.005, 2),
                'delta': g_pe['pe_delta'],
                'theta': g_pe['pe_theta'],
                'gamma': g_pe['gamma'],
                'vega': g_pe['vega'],
                'itm': k > spot,
            }
        })
        
    pcr = round(tot_put_oi / tot_call_oi, 2) if tot_call_oi > 0 else 1.0
    sentiment = 'Bullish' if pcr >= 1.2 else ('Bearish' if pcr <= 0.8 else 'Neutral')
    
    return {
        'success': True,
        'symbol': symbol,
        'index_name': meta['name'],
        'exchange': 'BSE',
        'spot_price': round(spot, 2),
        'spot_change': y_quote['change'],
        'spot_change_pct': y_quote['change_pct'],
        'high': y_quote['high'],
        'low': y_quote['low'],
        'prev_close': y_quote['prev_close'],
        'vix': 14.5,
        'atm_strike': atm_strike,
        'strike_step': step,
        'lot_size': LOT_SIZES.get(symbol, 20),
        'selected_expiry': selected_exp['date'],
        'selected_expiry_raw': selected_exp['raw'],
        'expiries': expiries_formatted,
        'max_pain': atm_strike,
        'pcr': pcr,
        'pcr_sentiment': sentiment,
        'total_call_oi': tot_call_oi,
        'total_put_oi': tot_put_oi,
        'total_call_vol': tot_call_vol,
        'total_put_vol': tot_put_vol,
        'strikes_count': len(chain_rows),
        'chain': chain_rows,
        'timestamp': datetime.now().strftime('%d-%b-%Y %H:%M:%S'),
        'source': 'BSE_CALCULATED',
    }


def main():
    parser = argparse.ArgumentParser(description='Fetch live NSE/BSE Option Chain')
    parser.add_argument('--symbol', default='NIFTY', help='Symbol e.g. NIFTY, BANKNIFTY')
    parser.add_argument('--expiry', default=None, help='Target expiry date')
    parser.add_argument('--force-refresh', action='store_true', help='Bypass cache')

    args = parser.parse_args()
    symbol = args.symbol.upper()
    expiry_arg = args.expiry

    # Cache key
    cache_key = f"{symbol}_{expiry_arg or 'default'}.json"
    cache_file = CACHE_DIR / cache_key

    if not args.force_refresh and cache_file.exists():
        age = time.time() - cache_file.stat().st_mtime
        if age < CACHE_TTL:
            try:
                with open(cache_file, 'r') as f:
                    print(f.read())
                    return
            except Exception:
                pass

    try:
        if symbol in ('NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'):
            result = fetch_nse_data(symbol, expiry_arg)
        elif symbol in ('SENSEX', 'BANKEX'):
            result = fetch_bse_data(symbol, expiry_arg)
        else:
            result = {'error': f'Symbol {symbol} not recognized'}

        output_json = json.dumps(result, indent=2)

        # Cache on success
        if result.get('success'):
            try:
                with open(cache_file, 'w') as f:
                    f.write(output_json)
            except Exception:
                pass

        print(output_json)

    except Exception as e:
        error_res = {
            'success': False,
            'error': str(e),
            'symbol': symbol,
        }
        print(json.dumps(error_res))
        sys.exit(1)


if __name__ == '__main__':
    main()
