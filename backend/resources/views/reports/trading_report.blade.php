<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Trading Performance Report</title>
    <style>
        @page {
            margin: 20px 20px 25px 20px;
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
            font-size: 17px;
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
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: bold;
        }
        .badge-ce { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-pe { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }
        .badge-index { font-weight: bold; color: #0f172a; }
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
    @php
        $reportType = $report_type ?? 'trades';
        $cols = !empty($selected_columns) ? $selected_columns : [];
        $isTradeMode = $reportType === 'trades';
        $isDailyMode = $reportType === 'daily';
        $isMonthlyMode = $reportType === 'monthly';
        $isYearlyMode = $reportType === 'yearly';

        // Check column inclusion helper
        $hasCol = function($colId) use ($cols) {
            if (empty($cols)) return true; // default include
            return in_array($colId, $cols);
        };
    @endphp

    <div class="header">
        <div class="title">
            TradeJournal &mdash; 
            @if($isDailyMode) Daily P&amp;L Performance Report
            @elseif($isMonthlyMode) Monthly P&amp;L Performance Report
            @elseif($isYearlyMode) Yearly P&amp;L Performance Report
            @else Performance &amp; Trades Report
            @endif
        </div>
        <div class="meta">
            Trader: <strong>{{ $user->name }}</strong> ({{ $user->email }}) &bull; Generated: {{ $generated_at }}
            &bull; Period: <strong>{{ $data['date_range']['display'] ?? 'All Time' }}</strong>
            &bull; Scope: <strong>{{ strtoupper($reportType) }}</strong>
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

    <!-- =================================================================== -->
    <!-- REPORT TABLE BASED ON REPORT TYPE & CUSTOM COLUMNS                   -->
    <!-- =================================================================== -->

    @if($isDailyMode)
        <!-- DAILY P&L TABLE -->
        <div class="section-title">
            Daily P&amp;L Performance Breakdown
            <span class="section-subtitle">({{ count($aggregated_data ?? []) }} trading days)</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 4%;" class="text-center">#</th>
                    @if($hasCol('date')) <th>Date</th> @endif
                    @if($hasCol('trades_count')) <th class="text-center">Trades</th> @endif
                    @if($hasCol('winning_trades')) <th class="text-center">Wins</th> @endif
                    @if($hasCol('losing_trades')) <th class="text-center">Losses</th> @endif
                    @if($hasCol('gross_profit')) <th class="text-right">Gross Profit</th> @endif
                    @if($hasCol('gross_loss')) <th class="text-right">Gross Loss</th> @endif
                    @if($hasCol('total_charges')) <th class="text-right">Charges</th> @endif
                    @if($hasCol('net_pnl')) <th class="text-right">Net P&amp;L</th> @endif
                    @if($hasCol('win_rate')) <th class="text-center">Win Rate %</th> @endif
                    @if($hasCol('status')) <th class="text-center">Status</th> @endif
                </tr>
            </thead>
            <tbody>
                @forelse($aggregated_data ?? [] as $idx => $d)
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        @if($hasCol('date')) <td>{{ \Carbon\Carbon::parse($d['date'])->format('d M Y') }}</td> @endif
                        @if($hasCol('trades_count')) <td class="text-center">{{ $d['trades_count'] }}</td> @endif
                        @if($hasCol('winning_trades')) <td class="text-center positive">{{ $d['winning_trades'] }}</td> @endif
                        @if($hasCol('losing_trades')) <td class="text-center negative">{{ $d['losing_trades'] }}</td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format($d['gross_profit'], 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format($d['gross_loss'], 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format($d['total_charges'], 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            <td class="text-right {{ $d['net_pnl'] >= 0 ? 'positive' : 'negative' }}" style="font-weight: bold;">
                                {{ $d['net_pnl'] >= 0 ? '+' : '' }}₹{{ number_format($d['net_pnl'], 2) }}
                            </td>
                        @endif
                        @if($hasCol('win_rate')) <td class="text-center">{{ $d['win_rate'] }}%</td> @endif
                        @if($hasCol('status'))
                            <td class="text-center {{ $d['net_pnl'] > 0 ? 'positive' : ($d['net_pnl'] < 0 ? 'negative' : '') }}">
                                {{ $d['status'] }}
                            </td>
                        @endif
                    </tr>
                @empty
                    <tr><td colspan="11" class="text-center" style="color: #94a3b8; padding: 15px;">No daily data recorded.</td></tr>
                @endforelse
            </tbody>
            @if(!empty($aggregated_data) && count($aggregated_data) > 0)
                <tfoot>
                    <tr class="total-row">
                        <td class="text-center">#</td>
                        @if($hasCol('date')) <td>TOTAL ({{ count($aggregated_data) }} Days)</td> @endif
                        @if($hasCol('trades_count')) <td class="text-center">{{ collect($aggregated_data)->sum('trades_count') }}</td> @endif
                        @if($hasCol('winning_trades')) <td class="text-center">{{ collect($aggregated_data)->sum('winning_trades') }}</td> @endif
                        @if($hasCol('losing_trades')) <td class="text-center">{{ collect($aggregated_data)->sum('losing_trades') }}</td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format(collect($aggregated_data)->sum('gross_profit'), 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format(collect($aggregated_data)->sum('gross_loss'), 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format(collect($aggregated_data)->sum('total_charges'), 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            @php $totNet = collect($aggregated_data)->sum('net_pnl'); @endphp
                            <td class="text-right {{ $totNet >= 0 ? 'positive' : 'negative' }}">
                                {{ $totNet >= 0 ? '+' : '' }}₹{{ number_format($totNet, 2) }}
                            </td>
                        @endif
                        @if($hasCol('win_rate')) <td></td> @endif
                        @if($hasCol('status')) <td></td> @endif
                    </tr>
                </tfoot>
            @endif
        </table>

    @elseif($isMonthlyMode)
        <!-- MONTHLY P&L TABLE -->
        <div class="section-title">
            Monthly P&amp;L Performance Breakdown
            <span class="section-subtitle">({{ count($aggregated_data ?? []) }} months)</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 4%;" class="text-center">#</th>
                    @if($hasCol('month')) <th>Month</th> @endif
                    @if($hasCol('trades_count')) <th class="text-center">Trades</th> @endif
                    @if($hasCol('winning_trades')) <th class="text-center">Wins</th> @endif
                    @if($hasCol('losing_trades')) <th class="text-center">Losses</th> @endif
                    @if($hasCol('gross_profit')) <th class="text-right">Gross Profit</th> @endif
                    @if($hasCol('gross_loss')) <th class="text-right">Gross Loss</th> @endif
                    @if($hasCol('total_charges')) <th class="text-right">Charges</th> @endif
                    @if($hasCol('net_pnl')) <th class="text-right">Net P&amp;L</th> @endif
                    @if($hasCol('win_rate')) <th class="text-center">Win Rate %</th> @endif
                    @if($hasCol('status')) <th class="text-center">Status</th> @endif
                </tr>
            </thead>
            <tbody>
                @forelse($aggregated_data ?? [] as $idx => $m)
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        @if($hasCol('month')) <td><strong>{{ $m['month'] }}</strong></td> @endif
                        @if($hasCol('trades_count')) <td class="text-center">{{ $m['trades_count'] }}</td> @endif
                        @if($hasCol('winning_trades')) <td class="text-center positive">{{ $m['winning_trades'] }}</td> @endif
                        @if($hasCol('losing_trades')) <td class="text-center negative">{{ $m['losing_trades'] }}</td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format($m['gross_profit'], 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format($m['gross_loss'], 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format($m['total_charges'], 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            <td class="text-right {{ $m['net_pnl'] >= 0 ? 'positive' : 'negative' }}" style="font-weight: bold;">
                                {{ $m['net_pnl'] >= 0 ? '+' : '' }}₹{{ number_format($m['net_pnl'], 2) }}
                            </td>
                        @endif
                        @if($hasCol('win_rate')) <td class="text-center">{{ $m['win_rate'] }}%</td> @endif
                        @if($hasCol('status'))
                            <td class="text-center {{ $m['net_pnl'] > 0 ? 'positive' : ($m['net_pnl'] < 0 ? 'negative' : '') }}">
                                {{ $m['status'] }}
                            </td>
                        @endif
                    </tr>
                @empty
                    <tr><td colspan="11" class="text-center" style="color: #94a3b8; padding: 15px;">No monthly data recorded.</td></tr>
                @endforelse
            </tbody>
            @if(!empty($aggregated_data) && count($aggregated_data) > 0)
                <tfoot>
                    <tr class="total-row">
                        <td class="text-center">#</td>
                        @if($hasCol('month')) <td>TOTAL ({{ count($aggregated_data) }} Months)</td> @endif
                        @if($hasCol('trades_count')) <td class="text-center">{{ collect($aggregated_data)->sum('trades_count') }}</td> @endif
                        @if($hasCol('winning_trades')) <td class="text-center">{{ collect($aggregated_data)->sum('winning_trades') }}</td> @endif
                        @if($hasCol('losing_trades')) <td class="text-center">{{ collect($aggregated_data)->sum('losing_trades') }}</td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format(collect($aggregated_data)->sum('gross_profit'), 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format(collect($aggregated_data)->sum('gross_loss'), 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format(collect($aggregated_data)->sum('total_charges'), 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            @php $totNet = collect($aggregated_data)->sum('net_pnl'); @endphp
                            <td class="text-right {{ $totNet >= 0 ? 'positive' : 'negative' }}">
                                {{ $totNet >= 0 ? '+' : '' }}₹{{ number_format($totNet, 2) }}
                            </td>
                        @endif
                        @if($hasCol('win_rate')) <td></td> @endif
                        @if($hasCol('status')) <td></td> @endif
                    </tr>
                </tfoot>
            @endif
        </table>

    @elseif($isYearlyMode)
        <!-- YEARLY P&L TABLE -->
        <div class="section-title">
            Yearly P&amp;L Performance Breakdown
            <span class="section-subtitle">({{ count($aggregated_data ?? []) }} years)</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 4%;" class="text-center">#</th>
                    @if($hasCol('year')) <th>Year</th> @endif
                    @if($hasCol('trades_count')) <th class="text-center">Trades</th> @endif
                    @if($hasCol('winning_trades')) <th class="text-center">Wins</th> @endif
                    @if($hasCol('losing_trades')) <th class="text-center">Losses</th> @endif
                    @if($hasCol('gross_profit')) <th class="text-right">Gross Profit</th> @endif
                    @if($hasCol('gross_loss')) <th class="text-right">Gross Loss</th> @endif
                    @if($hasCol('total_charges')) <th class="text-right">Charges</th> @endif
                    @if($hasCol('net_pnl')) <th class="text-right">Net P&amp;L</th> @endif
                    @if($hasCol('win_rate')) <th class="text-center">Win Rate %</th> @endif
                    @if($hasCol('status')) <th class="text-center">Status</th> @endif
                </tr>
            </thead>
            <tbody>
                @forelse($aggregated_data ?? [] as $idx => $y)
                    <tr>
                        <td class="text-center">{{ $idx + 1 }}</td>
                        @if($hasCol('year')) <td><strong>{{ $y['year'] }}</strong></td> @endif
                        @if($hasCol('trades_count')) <td class="text-center">{{ $y['trades_count'] }}</td> @endif
                        @if($hasCol('winning_trades')) <td class="text-center positive">{{ $y['winning_trades'] }}</td> @endif
                        @if($hasCol('losing_trades')) <td class="text-center negative">{{ $y['losing_trades'] }}</td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format($y['gross_profit'], 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format($y['gross_loss'], 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format($y['total_charges'], 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            <td class="text-right {{ $y['net_pnl'] >= 0 ? 'positive' : 'negative' }}" style="font-weight: bold;">
                                {{ $y['net_pnl'] >= 0 ? '+' : '' }}₹{{ number_format($y['net_pnl'], 2) }}
                            </td>
                        @endif
                        @if($hasCol('win_rate')) <td class="text-center">{{ $y['win_rate'] }}%</td> @endif
                        @if($hasCol('status'))
                            <td class="text-center {{ $y['net_pnl'] > 0 ? 'positive' : ($y['net_pnl'] < 0 ? 'negative' : '') }}">
                                {{ $y['status'] }}
                            </td>
                        @endif
                    </tr>
                @empty
                    <tr><td colspan="11" class="text-center" style="color: #94a3b8; padding: 15px;">No yearly data recorded.</td></tr>
                @endforelse
            </tbody>
            @if(!empty($aggregated_data) && count($aggregated_data) > 0)
                <tfoot>
                    <tr class="total-row">
                        <td class="text-center">#</td>
                        @if($hasCol('year')) <td>TOTAL ({{ count($aggregated_data) }} Years)</td> @endif
                        @if($hasCol('trades_count')) <td class="text-center">{{ collect($aggregated_data)->sum('trades_count') }}</td> @endif
                        @if($hasCol('winning_trades')) <td class="text-center">{{ collect($aggregated_data)->sum('winning_trades') }}</td> @endif
                        @if($hasCol('losing_trades')) <td class="text-center">{{ collect($aggregated_data)->sum('losing_trades') }}</td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format(collect($aggregated_data)->sum('gross_profit'), 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format(collect($aggregated_data)->sum('gross_loss'), 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format(collect($aggregated_data)->sum('total_charges'), 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            @php $totNet = collect($aggregated_data)->sum('net_pnl'); @endphp
                            <td class="text-right {{ $totNet >= 0 ? 'positive' : 'negative' }}">
                                {{ $totNet >= 0 ? '+' : '' }}₹{{ number_format($totNet, 2) }}
                            </td>
                        @endif
                        @if($hasCol('win_rate')) <td></td> @endif
                        @if($hasCol('status')) <td></td> @endif
                    </tr>
                </tfoot>
            @endif
        </table>

    @else
        <!-- TRADE-BY-TRADE LOG TABLE (CUSTOM COLUMNS) -->
        <div class="section-title">
            List of Trades
            <span class="section-subtitle">({{ count($trades ?? []) }} trades logged)</span>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 4%;" class="text-center">#</th>
                    @if($hasCol('date')) <th>Date</th> @endif
                    @if($hasCol('index_name')) <th>Index</th> @endif
                    @if($hasCol('trading_type')) <th>Type</th> @endif
                    @if($hasCol('option_type')) <th class="text-center">Option</th> @endif
                    @if($hasCol('strike_price')) <th class="text-right">Strike</th> @endif
                    @if($hasCol('expiry_date')) <th>Expiry</th> @endif
                    @if($hasCol('lots')) <th class="text-center">Lots</th> @endif
                    @if($hasCol('quantity')) <th class="text-center">Qty</th> @endif
                    @if($hasCol('entry_premium')) <th class="text-right">Entry</th> @endif
                    @if($hasCol('exit_premium')) <th class="text-right">Exit</th> @endif
                    @if($hasCol('gross_profit')) <th class="text-right">Gross Profit</th> @endif
                    @if($hasCol('gross_loss')) <th class="text-right">Gross Loss</th> @endif
                    @if($hasCol('brokerage')) <th class="text-right">Brokerage</th> @endif
                    @if($hasCol('total_charges')) <th class="text-right">Charges</th> @endif
                    @if($hasCol('net_pnl')) <th class="text-right">Net P&amp;L</th> @endif
                    @if($hasCol('strategy_name')) <th>Strategy</th> @endif
                    @if($hasCol('entry_reason')) <th>Entry Reason</th> @endif
                    @if($hasCol('exit_reason')) <th>Exit Reason</th> @endif
                    @if($hasCol('notes')) <th>Notes</th> @endif
                </tr>
            </thead>
            <tbody>
                @forelse($trades ?? [] as $index => $t)
                    @php
                        $opt = strtoupper($t->option_type ?? '');
                        $badgeClass = $opt === 'CE' ? 'badge-ce' : ($opt === 'PE' ? 'badge-pe' : '');
                        $netPnl = (float) ($t->net_pnl ?? 0);
                    @endphp
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        @if($hasCol('date')) <td>{{ \Carbon\Carbon::parse($t->trade_date)->format('d M Y') }}</td> @endif
                        @if($hasCol('index_name')) <td class="badge-index">{{ $t->index_name }}</td> @endif
                        @if($hasCol('trading_type')) <td>{{ $t->trading_type ?? 'Intraday' }}</td> @endif
                        @if($hasCol('option_type'))
                            <td class="text-center">
                                @if($opt)
                                    <span class="badge {{ $badgeClass }}">{{ $opt }}</span>
                                @else
                                    -
                                @endif
                            </td>
                        @endif
                        @if($hasCol('strike_price')) <td class="text-right">{{ $t->strike_price ? number_format($t->strike_price, 0) : '-' }}</td> @endif
                        @if($hasCol('expiry_date')) <td>{{ $t->expiry_date ?: '-' }}</td> @endif
                        @if($hasCol('lots')) <td class="text-center">{{ $t->lots ?? 1 }}L</td> @endif
                        @if($hasCol('quantity')) <td class="text-center">{{ $t->quantity ?: '-' }}</td> @endif
                        @if($hasCol('entry_premium')) <td class="text-right">{{ $t->entry_premium ? number_format($t->entry_premium, 2) : '-' }}</td> @endif
                        @if($hasCol('exit_premium')) <td class="text-right">{{ $t->exit_premium ? number_format($t->exit_premium, 2) : '-' }}</td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format($t->gross_profit ?? 0, 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format($t->gross_loss ?? 0, 2) }}</td> @endif
                        @if($hasCol('brokerage')) <td class="text-right">₹{{ number_format($t->brokerage ?? 0, 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format($t->total_charges ?? 0, 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            <td class="text-right {{ $netPnl >= 0 ? 'positive' : 'negative' }}" style="font-weight: bold;">
                                {{ $netPnl >= 0 ? '+' : '' }}₹{{ number_format($netPnl, 2) }}
                            </td>
                        @endif
                        @if($hasCol('strategy_name')) <td>{{ $t->strategy_name ?: '-' }}</td> @endif
                        @if($hasCol('entry_reason')) <td>{{ $t->entry_reason ?: '-' }}</td> @endif
                        @if($hasCol('exit_reason')) <td>{{ $t->exit_reason ?: '-' }}</td> @endif
                        @if($hasCol('notes')) <td>{{ $t->notes ?: '-' }}</td> @endif
                    </tr>
                @empty
                    <tr>
                        <td colspan="20" class="text-center" style="color: #94a3b8; padding: 15px;">
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
                    $totCharges = $trades->sum('total_charges');
                    $totBrokerage = $trades->sum('brokerage');
                    $totNetPnl = $trades->sum('net_pnl');
                @endphp
                <tfoot>
                    <tr class="total-row">
                        <td class="text-center">#</td>
                        @if($hasCol('date')) <td>TOTAL ({{ count($trades) }} Trades)</td> @endif
                        @if($hasCol('index_name')) <td></td> @endif
                        @if($hasCol('trading_type')) <td></td> @endif
                        @if($hasCol('option_type')) <td></td> @endif
                        @if($hasCol('strike_price')) <td></td> @endif
                        @if($hasCol('expiry_date')) <td></td> @endif
                        @if($hasCol('lots')) <td class="text-center">{{ $totLots }}L</td> @endif
                        @if($hasCol('quantity')) <td class="text-center">{{ $totQty > 0 ? $totQty : '-' }}</td> @endif
                        @if($hasCol('entry_premium')) <td></td> @endif
                        @if($hasCol('exit_premium')) <td></td> @endif
                        @if($hasCol('gross_profit')) <td class="text-right positive">₹{{ number_format($totGrossProfit, 2) }}</td> @endif
                        @if($hasCol('gross_loss')) <td class="text-right negative">₹{{ number_format($totGrossLoss, 2) }}</td> @endif
                        @if($hasCol('brokerage')) <td class="text-right">₹{{ number_format($totBrokerage, 2) }}</td> @endif
                        @if($hasCol('total_charges')) <td class="text-right">₹{{ number_format($totCharges, 2) }}</td> @endif
                        @if($hasCol('net_pnl'))
                            <td class="text-right {{ $totNetPnl >= 0 ? 'positive' : 'negative' }}">
                                {{ $totNetPnl >= 0 ? '+' : '' }}₹{{ number_format($totNetPnl, 2) }}
                            </td>
                        @endif
                        @if($hasCol('strategy_name')) <td></td> @endif
                        @if($hasCol('entry_reason')) <td></td> @endif
                        @if($hasCol('exit_reason')) <td></td> @endif
                        @if($hasCol('notes')) <td></td> @endif
                    </tr>
                </tfoot>
            @endif
        </table>
    @endif

    <div class="footer">
        Generated by TradeJournal &mdash; Personal Options Trading P&amp;L Management System &bull; Confidential
    </div>
</body>
</html>