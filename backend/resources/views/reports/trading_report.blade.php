<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Trading Performance Report</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            font-size: 12px;
            margin: 0;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
        }
        .meta {
            color: #64748b;
            font-size: 11px;
            margin-top: 4px;
        }
        .grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .col {
            display: table-cell;
            width: 25%;
            padding: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        .stat-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
        }
        .stat-value {
            font-size: 16px;
            font-weight: bold;
            margin-top: 4px;
        }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #cbd5e1;
            font-size: 11px;
        }
        td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            font-size: 11px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">TradeJournal &mdash; Performance Report</div>
        <div class="meta">
            Trader: {{ $user->name }} ({{ $user->email }}) &bull; Generated: {{ $generated_at }}
            &bull; Period: {{ $data['date_range']['display'] ?? 'All Time' }}
        </div>
    </div>

    <div class="grid">
        <div class="col">
            <div class="stat-label">Net P&L</div>
            <div class="stat-value {{ ($data['stats']['total_net_profit'] ?? 0) >= 0 ? 'positive' : 'negative' }}">
                ₹{{ number_format($data['stats']['total_net_profit'] ?? 0, 2) }}
            </div>
        </div>
        <div class="col">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value">{{ $data['stats']['win_rate'] ?? 0 }}%</div>
        </div>
        <div class="col">
            <div class="stat-label">Total Trades</div>
            <div class="stat-value">{{ $data['stats']['total_trades'] ?? 0 }}</div>
        </div>
        <div class="col">
            <div class="stat-label">Profit Factor</div>
            <div class="stat-value">{{ $data['stats']['profit_factor'] ?? 0 }}</div>
        </div>
    </div>

    <div class="grid">
        <div class="col">
            <div class="stat-label">Gross Profit</div>
            <div class="stat-value positive">₹{{ number_format($data['stats']['total_gross_profit'] ?? 0, 2) }}</div>
        </div>
        <div class="col">
            <div class="stat-label">Gross Loss</div>
            <div class="stat-value negative">₹{{ number_format($data['stats']['total_gross_loss'] ?? 0, 2) }}</div>
        </div>
        <div class="col">
            <div class="stat-label">Total Charges</div>
            <div class="stat-value">₹{{ number_format($data['stats']['total_charges'] ?? 0, 2) }}</div>
        </div>
        <div class="col">
            <div class="stat-label">Current Capital</div>
            <div class="stat-value">₹{{ number_format($data['stats']['current_capital'] ?? 0, 2) }}</div>
        </div>
    </div>

    <h3>Strategy Performance Summary</h3>
    <table>
        <thead>
            <tr>
                <th>Strategy</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Net P&L</th>
                <th>Avg Profit</th>
                <th>Avg Loss</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['strategy_performance'] ?? [] as $st)
                <tr>
                    <td><strong>{{ $st['strategy'] }}</strong></td>
                    <td>{{ $st['total_trades'] }}</td>
                    <td>{{ $st['win_rate'] }}%</td>
                    <td class="{{ $st['net_pnl'] >= 0 ? 'positive' : 'negative' }}">
                        {{ $st['net_pnl'] >= 0 ? '+' : '' }}₹{{ number_format($st['net_pnl'], 2) }}
                    </td>
                    <td>₹{{ number_format($st['avg_profit'], 2) }}</td>
                    <td>₹{{ number_format($st['avg_loss'], 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8;">No strategy data recorded</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Generated by TradeJournal &mdash; Personal Options Trading P&L Management System
    </div>
</body>
</html>
