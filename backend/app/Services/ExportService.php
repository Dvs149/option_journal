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
    public function exportCsv(User $user, ?int $accountId = null): StreamedResponse
    {
        $fileName = 'trades_' . date('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($user, $accountId) {
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
                ->orderBy('trade_date', 'desc')
                ->chunk(200, function ($trades) use ($handle) {
                    foreach ($trades as $trade) {
                        fputcsv($handle, [
                            $trade->id,
                            $trade->trade_date,
                            $trade->index_name,
                            $trade->trading_type,
                            $trade->strategy_name,
                            $trade->option_type,
                            $trade->strike_price,
                            $trade->expiry_date,
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
     * Generate PDF trading report.
     */
    public function exportPdf(User $user, array $analyticsData)
    {
        $pdf = Pdf::loadView('reports.trading_report', [
            'user' => $user,
            'data' => $analyticsData,
            'generated_at' => now('Asia/Kolkata')->format('d M Y, h:i A'),
        ]);

        return $pdf->download('TradeJournal_Report_' . date('Y-m-d') . '.pdf');
    }
}
