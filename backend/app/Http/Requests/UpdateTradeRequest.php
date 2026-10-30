<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'trade_date' => ['sometimes', 'required', 'date'],
            'index_name' => ['sometimes', 'required', 'string', 'max:50'],
            'trading_type' => ['sometimes', 'required', 'string', 'in:Intraday,BTST,Overnight'],
            'strategy_name' => ['sometimes', 'required', 'string', 'max:100'],
            'option_type' => ['sometimes', 'required', 'string', 'in:CE,PE,Both'],
            'strike_price' => ['nullable', 'numeric', 'min:0'],
            'expiry_date' => ['nullable', 'date'],
            'ce_entry_price' => ['nullable', 'numeric', 'min:0'],
            'pe_entry_price' => ['nullable', 'numeric', 'min:0'],
            'entry_premium' => ['nullable', 'numeric', 'min:0'],
            'ce_exit_price' => ['nullable', 'numeric', 'min:0'],
            'pe_exit_price' => ['nullable', 'numeric', 'min:0'],
            'exit_premium' => ['nullable', 'numeric', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'lots' => ['nullable', 'integer', 'min:1'],
            'gross_profit' => ['nullable', 'numeric', 'min:0'],
            'gross_loss' => ['nullable', 'numeric', 'min:0'],
            'brokerage' => ['nullable', 'numeric', 'min:0'],
            'stt' => ['nullable', 'numeric', 'min:0'],
            'exchange_charges' => ['nullable', 'numeric', 'min:0'],
            'gst' => ['nullable', 'numeric', 'min:0'],
            'sebi_charges' => ['nullable', 'numeric', 'min:0'],
            'stamp_duty' => ['nullable', 'numeric', 'min:0'],
            'other_charges' => ['nullable', 'numeric', 'min:0'],
            'net_pnl_manual' => ['nullable', 'numeric'],
            'entry_reason' => ['nullable', 'string'],
            'exit_reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'screenshot' => ['nullable', 'file', 'image', 'max:10240'],
            'screenshot_path' => ['nullable', 'string'],
            'remove_screenshot' => ['nullable', 'boolean'],
            'screenshots' => ['nullable', 'array'],
            'screenshots.*' => ['file', 'image', 'max:10240'],
            'captions' => ['nullable', 'array'],
            'deleted_screenshot_ids' => ['nullable', 'array'],
            // Journal fields
            'market_conditions' => ['nullable', 'string'],
            'trade_setup' => ['nullable', 'string'],
            'what_went_right' => ['nullable', 'string'],
            'what_went_wrong' => ['nullable', 'string'],
            'mistakes_made' => ['nullable', 'string'],
            'lessons_learned' => ['nullable', 'string'],
            'personal_notes' => ['nullable', 'string'],
        ];
    }
}
