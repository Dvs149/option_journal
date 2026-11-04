<?php

namespace App\Services;

use App\Models\Trade;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportService
{
    /**
     * Generate CSV export stream for user's trades.
     */
    public function exportCsv(User $user, ?int $accountId = null, array $filters = []): StreamedResponse
    {
        $fileName = 'trades_' . date('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($user, $accountId, $filters) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM for Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // Header row
            fputcsv($handle, [
                'ID',
                'Date',
                'Index',
                'Type',
                'Strategy',
                'CE/PE',
                'Strike Price',
                'Expiry Date',
                'Entry Premium',
                'Exit Premium',
                'Quantity',
                'Lots',
                'Gross Profit',
                'Gross Loss',
                'Brokerage',
                'STT',
                'Exchange Charges',
                'GST',
                'SEBI Charges',
                'Stamp Duty',
                'Other Charges',
                'Total Charges',
                'Net P&L',
                'Entry Reason',
                'Exit Reason',
                'Notes',
            ]);

            Trade::where('user_id', $user->id)
                ->when($accountId, fn($q) => $q->where('trading_account_id', $accountId))
                ->when(!empty($filters['from_date']), fn($q) => $q->where('trade_date', '>=', $filters['from_date']))
                ->when(!empty($filters['to_date']), fn($q) => $q->where('trade_date', '<=', $filters['to_date']))
                ->when(!empty($filters['index_name']) && $filters['index_name'] !== 'ALL', fn($q) => $q->where('index_name', $filters['index_name']))
                ->when(!empty($filters['strategy_name']) && $filters['strategy_name'] !== 'ALL', fn($q) => $q->where('strategy_name', $filters['strategy_name']))
                ->when(!empty($filters['option_type']) && $filters['option_type'] !== 'ALL', fn($q) => $q->where('option_type', $filters['option_type']))
                ->when(!empty($filters['trading_type']) && $filters['trading_type'] !== 'ALL', fn($q) => $q->where('trading_type', $filters['trading_type']))
                ->orderBy('trade_date', 'desc')
                ->orderBy('id', 'desc')
                ->chunk(200, function ($trades) use ($handle) {
                    foreach ($trades as $trade) {
                        fputcsv($handle, [
                            $trade->id,
                            $trade->trade_date ? \Carbon\Carbon::parse($trade->trade_date)->format('d M Y') : '',
                            $trade->index_name,
                            $trade->trading_type,
                            $trade->strategy_name,
                            $trade->option_type,
                            $trade->strike_price,
                            $trade->expiry_date ? \Carbon\Carbon::parse($trade->expiry_date)->format('d M Y') : '',
                            $trade->entry_premium,
                            $trade->exit_premium,
                            $trade->quantity,
                            $trade->lots,
                            $trade->gross_profit,
                            $trade->gross_loss,
                            $trade->brokerage,
                            $trade->stt,
                            $trade->exchange_charges,
                            $trade->gst,
                            $trade->sebi_charges,
                            $trade->stamp_duty,
                            $trade->other_charges,
                            $trade->total_charges,
                            $trade->net_pnl,
                            $trade->entry_reason,
                            $trade->exit_reason,
                            $trade->notes,
                        ]);
                    }
                });

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Generate Excel-compatible XML/TSV export stream.
     */
    public function exportExcel(User $user, ?int $accountId = null): StreamedResponse
    {
        return $this->exportCsv($user, $accountId);
    }

    /**
     * Generate PDF trading report with optional aggregation and custom columns.
     */
    public function exportPdf(
        User $user,
        array $analyticsData,
        $trades = null,
        string $reportType = 'trades',
        array $selectedColumns = [],
        $aggregatedData = null
    ) {
        @ini_set('memory_limit', '1024M');
        @ini_set('max_execution_time', '300');

        $pdf = Pdf::loadView('reports.trading_report', [
            'user' => $user,
            'data' => $analyticsData,
            'trades' => $trades ?? collect([]),
            'report_type' => $reportType,
            'selected_columns' => $selectedColumns,
            'aggregated_data' => $aggregatedData ?? collect([]),
            'generated_at' => now('Asia/Kolkata')->format('d M Y, h:i A'),
        ]);

        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('TradeJournal_' . strtoupper($reportType) . '_Report_' . date('Y-m-d') . '.pdf');
    }
}
