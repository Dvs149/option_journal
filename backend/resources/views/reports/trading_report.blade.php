<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Trading Performance Report</title>
    <style>
        @page {
            margin: 22px 20px 25px 20px;
        }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #1e293b;
            font-size: 9px;
            line-height: 1.3;
            margin: 0;
            padding: 0;
        }
        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
        }
        .meta {
            color: #64748b;
            font-size: 8.5px;
            margin-top: 3px;
        }
        .grid {
            display: table;
            width: 100%;
            margin-bottom: 8px;
        }
        .col {
            display: table-cell;
            width: 25%;
            padding: 7px 9px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        .stat-label {
            font-size: 7.5px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .stat-value {
            font-size: 13px;
            font-weight: bold;
            margin-top: 2px;
        }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }

        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 14px;
            margin-bottom: 6px;
            padding-bottom: 3px;
            border-bottom: 1px solid #cbd5e1;
        }
        .section-subtitle {
            font-size: 8.5px;
            color: #64748b;
            font-weight: normal;
            margin-left: 5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            page-break-inside: auto;
        }
        thead {
            display: table-header-group;
        }
        tfoot {
            display: table-footer-group;
        }
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        th {
            background: #f1f5f9;
            color: #334155;
            font-weight: bold;
            padding: 4.5px 5px;
            text-align: left;
            border: 1px solid #cbd5e1;
            font-size: 8px;
            white-space: nowrap;
        }
        td {
            padding: 4px 5px;
            border: 1px solid #e2e8f0;
            font-size: 8px;
        }
        tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .badge {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: bold;
        }
        .badge-ce {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
        }
        .badge-pe {
            background: #ffe4e6;
            color: #be123c;
            border: 1px solid #fecdd3;
        }
        .badge-index {
            font-weight: bold;
            color: #0f172a;
        }
        .total-row td {
            font-weight: bold;
            background: #e2e8f0;
            border-top: 2px solid #94a3b8;
            font-size: 8.5px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">TradeJournal &mdash; Performance &amp; Trades Report</div>
        <div class="meta">
            Trader: <strong>{{ $user->name }}</strong> ({{ $user->email }}) &bull; Generated: {{ $generated_at }}
            &bull; Period: <strong>{{ $data['date_range']['display'] ?? 'All Time' }}</strong>
            &bull; Trades: <strong>{{ count($trades ?? []) }}</strong>
        </div>
    </div>

    <!-- Overall Performance Cards -->
    <div class="grid">
        <div class="col">
            <div class="stat-label">Net P&amp;L</div>
            <div class="stat-value {{ ($data['stats']['total_net_profit'] ?? 0) >= 0 ? 'positive' : 'negative' }}">
                {{ ($data['stats']['total_net_profit'] ?? 0) >= 0 ? '+' : '' }}₹{{ number_format($data['stats']['total_net_profit'] ?? 0, 2) }}
            </div>
        </div>
        <div class="col">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value">{{ $data['stats']['win_rate'] ?? 0 }}%</div>
        </div>
        <div class="col">
            <div class="stat-label">Total Trades</div>
            <div class="stat-value">{{ $data['stats']['total_trades'] ?? count($trades ?? []) }}</div>
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

    @if(!empty($data['strategy_performance']) && count($data['strategy_performance']) > 0)
        <div class="section-title">
            Strategy Performance Summary
            <span class="section-subtitle">({{ count($data['strategy_performance']) }} strategies recorded)</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 30%;">Strategy</th>
                    <th style="width: 12%;" class="text-center">Trades</th>
                    <th style="width: 14%;" class="text-center">Win Rate</th>
                    <th style="width: 16%;" class="text-right">Net P&amp;L</th>
                    <th style="width: 14%;" class="text-right">Avg Profit</th>
                    <th style="width: 14%;" class="text-right">Avg Loss</th>
                </tr>
            </thead>
            <tbody>
                @foreach($data['strategy_performance'] as $st)
                    <tr>
                        <td><strong>{{ $st['strategy'] }}</strong></td>
                        <td class="text-center">{{ $st['total_trades'] }}</td>
                        <td class="text-center">{{ $st['win_rate'] }}%</td>
                        <td class="text-right {{ $st['net_pnl'] >= 0 ? 'positive' : 'negative' }}" style="font-weight: bold;">
                            {{ $st['net_pnl'] >= 0 ? '+' : '' }}₹{{ number_format($st['net_pnl'], 2) }}
                        </td>
                        <td class="text-right positive">₹{{ number_format($st['avg_profit'], 2) }}</td>
                        <td class="text-right negative">₹{{ number_format($st['avg_loss'], 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <!-- All Trades Detailed Table -->
    <div class="section-title">
        List of Trades
        <span class="section-subtitle">({{ count($trades ?? []) }} trades logged)</span>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 3%;" class="text-center">#</th>
                <th style="width: 10%;">Date</th>
                <th style="width: 11%;">Index</th>
                <th style="width: 8%;">Type</th>
                <th style="width: 5%;" class="text-center">Option</th>
                <th style="width: 7%;" class="text-right">Strike</th>
                <th style="width: 8%;" class="text-center">Lots (Qty)</th>
                <th style="width: 7%;" class="text-right">Entry</th>
                <th style="width: 7%;" class="text-right">Exit</th>
                <th style="width: 9%;" class="text-right">Gross P&amp;L</th>
                <th style="width: 7%;" class="text-right">Charges</th>
                <th style="width: 10%;" class="text-right">Net P&amp;L</th>
                <th style="width: 8%;">Strategy</th>
            </tr>
        </thead>
        <tbody>
            @forelse($trades ?? [] as $index => $t)
                @php
                    $grossPnl = ($t->gross_profit ?? 0) - ($t->gross_loss ?? 0);
                    $netPnl = (float) ($t->net_pnl ?? 0);
                    $opt = strtoupper($t->option_type ?? '');
                    $badgeClass = $opt === 'CE' ? 'badge-ce' : ($opt === 'PE' ? 'badge-pe' : '');
                @endphp
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ \Carbon\Carbon::parse($t->trade_date)->format('d M Y') }}</td>
                    <td class="badge-index">{{ $t->index_name }}</td>
                    <td>{{ $t->trading_type ?? 'Intraday' }}</td>
                    <td class="text-center">
                        @if($opt)
                            <span class="badge {{ $badgeClass }}">{{ $opt }}</span>
                        @else
                            -
                        @endif
                    </td>
                    <td class="text-right">{{ $t->strike_price ? number_format($t->strike_price, 0) : '-' }}</td>
                    <td class="text-center">
                        {{ $t->lots ?? 1 }}L
                        @if(!empty($t->quantity))
                            <span style="color: #64748b; font-size: 7px;">({{ $t->quantity }})</span>
                        @endif
                    </td>
                    <td class="text-right">{{ $t->entry_premium ? number_format($t->entry_premium, 2) : '-' }}</td>
                    <td class="text-right">{{ $t->exit_premium ? number_format($t->exit_premium, 2) : '-' }}</td>
                    <td class="text-right {{ $grossPnl >= 0 ? 'positive' : 'negative' }}">
                        {{ $grossPnl >= 0 ? '+' : '' }}₹{{ number_format($grossPnl, 2) }}
                    </td>
                    <td class="text-right">₹{{ number_format($t->total_charges ?? 0, 2) }}</td>
                    <td class="text-right {{ $netPnl >= 0 ? 'positive' : 'negative' }}" style="font-weight: bold;">
                        {{ $netPnl >= 0 ? '+' : '' }}₹{{ number_format($netPnl, 2) }}
                    </td>
                    <td>{{ $t->strategy_name ?: '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="13" class="text-center" style="color: #94a3b8; padding: 15px;">
                        No trades found for this period / filter.
                    </td>
                </tr>
            @endforelse
        </tbody>
        @if(!empty($trades) && count($trades) > 0)
            @php
                $totLots = $trades->sum('lots');
                $totQty = $trades->sum('quantity');
                $totGrossProfit = $trades->sum('gross_profit');
                $totGrossLoss = $trades->sum('gross_loss');
                $totGrossPnl = $totGrossProfit - $totGrossLoss;
                $totCharges = $trades->sum('total_charges');
                $totNetPnl = $trades->sum('net_pnl');
            @endphp
            <tfoot>
                <tr class="total-row">
                    <td colspan="6" style="text-align: right; padding-right: 6px;">TOTAL ({{ count($trades) }} Trades):</td>
                    <td class="text-center">
                        {{ $totLots }}L
                        @if($totQty > 0)
                            <span style="font-size: 7px;">({{ $totQty }})</span>
                        @endif
                    </td>
                    <td colspan="2"></td>
                    <td class="text-right {{ $totGrossPnl >= 0 ? 'positive' : 'negative' }}">
                        {{ $totGrossPnl >= 0 ? '+' : '' }}₹{{ number_format($totGrossPnl, 2) }}
                    </td>
                    <td class="text-right">₹{{ number_format($totCharges, 2) }}</td>
                    <td class="text-right {{ $totNetPnl >= 0 ? 'positive' : 'negative' }}">
                        {{ $totNetPnl >= 0 ? '+' : '' }}₹{{ number_format($totNetPnl, 2) }}
                    </td>
                    <td></td>
                </tr>
            </tfoot>
        @endif
    </table>

    <div class="footer">
        Generated by TradeJournal &mdash; Personal Options Trading P&amp;L Management System &bull; Confidential
    </div>
</body>
</html>