import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Filter,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  BROKER_OPTIONS,
  parseTradesSpreadsheet,
  downloadCustomSampleTemplate,
} from '../../utils/bulkTradeParser';
import { useLotSizes } from '../../context/LotSizeContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

export default function BulkImportModal({ isOpen, onClose, onImportSuccess }) {
  const { getLotSize } = useLotSizes();
  const { showToast } = useToast();

  const [selectedBroker, setSelectedBroker] = useState('zerodha');
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [rowFilter, setRowFilter] = useState('ALL'); // 'ALL' | 'VALID' | 'ERRORS'
  const [skipErrors, setSkipErrors] = useState(true);

  const fileInputRef = useRef(null);

  // Summary counts
  const totalRows = parsedRows.length;
  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const errorRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);
  const validCount = validRows.length;
  const errorCount = errorRows.length;

  // Aggregate Net P&L of valid rows
  const totalValidNetPnl = useMemo(() => {
    return validRows.reduce((sum, r) => sum + (r.trade?.net_pnl || 0), 0);
  }, [validRows]);

  // Rows to display based on tab filter
  const displayedRows = useMemo(() => {
    if (rowFilter === 'VALID') return validRows;
    if (rowFilter === 'ERRORS') return errorRows;
    return parsedRows;
  }, [rowFilter, parsedRows, validRows, errorRows]);

  if (!isOpen) return null;

  const currentBroker = BROKER_OPTIONS.find((b) => b.id === selectedBroker) || BROKER_OPTIONS[0];

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    await processFile(dropped);
  };

  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    setParsing(true);
    setParsedRows([]);

    try {
      const rows = await parseTradesSpreadsheet(selectedFile, selectedBroker, getLotSize);
      setParsedRows(rows);

      // Auto-switch filter to errors if there are errors, otherwise ALL
      const hasErrors = rows.some((r) => !r.isValid);
      if (hasErrors) {
        setRowFilter('ALL');
        showToast(`Parsed ${rows.length} rows with ${rows.filter((r) => !r.isValid).length} error(s). Please review.`, 'warning');
      } else {
        setRowFilter('ALL');
        showToast(`✓ Successfully parsed ${rows.length} valid trade rows!`, 'success');
      }
    } catch (err) {
      console.error('Error parsing spreadsheet:', err);
      showToast(`Failed to parse file: ${err.message || 'Invalid format'}`, 'error');
      setParsedRows([
        {
          rowNumber: 1,
          isValid: false,
          errorMessage: `Spreadsheet reading error: ${err.message}`,
          trade: null,
        },
      ]);
    } finally {
      setParsing(false);
    }
  };

  const handleBrokerChange = async (newBrokerId) => {
    setSelectedBroker(newBrokerId);
    // If a file is already loaded, re-parse with the newly selected broker
    if (file) {
      setParsing(true);
      try {
        const rows = await parseTradesSpreadsheet(file, newBrokerId, getLotSize);
        setParsedRows(rows);
      } catch (err) {
        console.error('Reparsing error:', err);
      } finally {
        setParsing(false);
      }
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setParsedRows([]);
    setRowFilter('ALL');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteImport = async () => {
    const tradesToImport = skipErrors ? validRows : parsedRows;
    if (tradesToImport.length === 0) {
      showToast('No valid trades available to import.', 'error');
      return;
    }

    if (!skipErrors && errorCount > 0) {
      showToast('Please fix or skip the rows with errors before importing.', 'error');
      return;
    }

    setImporting(true);
    try {
      const payload = {
        trades: tradesToImport.map((r) => r.trade),
        source_broker: currentBroker.name,
      };

      const res = await api.post('/trades/bulk-import', payload);

      if (res.data?.success) {
        showToast(`✓ ${res.data.message || `Successfully imported ${res.data.imported_count} trades!`}`, 'success');
        onClose();
        if (onImportSuccess) {
          onImportSuccess(res.data);
        }
      } else {
        showToast(res.data?.message || 'Failed to import trades', 'error');
      }
    } catch (err) {
      console.error('Bulk import API error:', err);
      showToast(err.response?.data?.message || err.message || 'Error executing bulk import', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 light:text-slate-900">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-[#1e293b] light:border-slate-200 flex items-center justify-between shrink-0 bg-[#0e1626]/80 light:bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white light:text-slate-900">
                  Bulk Import Trades
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  Excel & CSV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload your P&L statements from Zerodha, Kotak Neo, or Custom templates with instant error validation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#162033] light:bg-slate-200 text-slate-400 hover:text-white light:hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Controls: Broker Selector + Sample Download Button */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Broker Dropdown (Dynamic) */}
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 light:text-slate-700 block">
                Select Broker / File Format *
              </label>
              <div className="relative">
                <select
                  value={selectedBroker}
                  onChange={(e) => handleBrokerChange(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-2xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-500 pr-10 cursor-pointer shadow-inner"
                >
                  {BROKER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.fullName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400">
                {currentBroker.description}
              </p>
            </div>

            {/* Sample Download Button */}
            <div className="md:col-span-5 flex md:justify-end items-center gap-2 pt-1 md:pt-4">
              <button
                type="button"
                onClick={downloadCustomSampleTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#162033] hover:bg-[#1f2d48] light:bg-slate-100 light:hover:bg-slate-200 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all shadow-sm"
                title="Download standard template with sample trades"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Download Sample Excel</span>
              </button>
            </div>
          </div>

          {/* Upload Area / Dropzone */}
          {!file && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#1e293b] light:border-slate-300 hover:border-blue-500 light:hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer bg-[#0e1626]/40 light:bg-slate-50/50 hover:bg-[#0e1626]/80 transition-all space-y-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-md">
                <Upload className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <span className="text-sm font-bold text-white light:text-slate-900 block">
                  Click to browse or drag & drop your Excel / CSV file
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Supports .xlsx, .xls, and .csv for <strong>{currentBroker.name}</strong>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#162033] light:bg-slate-200 text-[11px] text-slate-400">
                <span>Auto-calculates entry, exit, P&L, lots, and broker charges</span>
              </div>
            </div>
          )}

          {/* Parsing State */}
          {parsing && (
            <div className="p-8 text-center space-y-3 bg-[#0e1626]/60 rounded-3xl border border-[#1e293b]">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                Parsing spreadsheet rows and validating each trade...
              </p>
            </div>
          )}

          {/* Parsed Preview Table & Statistics */}
          {file && !parsing && (
            <div className="space-y-4">
              
              {/* Header Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Total Rows</span>
                  <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers">
                    {totalRows}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-[10px] text-emerald-400 font-medium block">Valid Rows</span>
                  <span className="text-base font-bold text-emerald-400 font-mono-numbers">
                    {validCount}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-[10px] text-rose-400 font-medium block">Error Rows</span>
                  <span className={`text-base font-bold font-mono-numbers ${errorCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {errorCount}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Estimated Net P&L</span>
                  <span className={`text-base font-bold font-mono-numbers ${totalValidNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalValidNetPnl >= 0 ? `+₹${totalValidNetPnl.toLocaleString('en-IN')}` : `-₹${Math.abs(totalValidNetPnl).toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              {/* Active File Banner with Re-upload */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0e1626]/80 light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-white light:text-slate-900 truncate">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
                    {currentBroker.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="px-3 py-1 rounded-xl bg-[#162033] hover:bg-[#1e2c46] light:bg-slate-200 light:hover:bg-slate-300 text-[11px] font-semibold text-slate-300 light:text-slate-700 transition-colors"
                  >
                    Upload Different File
                  </button>
                </div>
              </div>

              {/* Error Notice Warning (if any) */}
              {errorCount > 0 && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Found <strong>{errorCount} row(s) with errors</strong>. Specific errors are highlighted in red directly next to each affected row.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRowFilter('ERRORS')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[10px] shrink-0 transition-colors"
                  >
                    View Errors Only
                  </button>
                </div>
              )}

              {/* Filter Tabs for Preview */}
              <div className="flex items-center gap-1.5 border-b border-[#1e293b] light:border-slate-200 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRowFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    rowFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  All Rows ({totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setRowFilter('VALID')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    rowFilter === 'VALID'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  Valid Ready to Import ({validCount})
                </button>
                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setRowFilter('ERRORS')}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                      rowFilter === 'ERRORS'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    Rows with Errors ({errorCount})
                  </button>
                )}
              </div>

              {/* Interactive Preview Table with Row-Level Error Display */}
              <div className="border border-[#1e293b] light:border-slate-200 rounded-2xl overflow-hidden bg-[#0a0f1d] light:bg-white shadow-inner max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-[#0e1626] light:bg-slate-100 border-b border-[#1e293b] light:border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold w-12 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold min-w-[200px]">Validation Status / Error</th>
                      <th className="py-2.5 px-3 font-semibold">Trade Date</th>
                      <th className="py-2.5 px-3 font-semibold">Index / Symbol</th>
                      <th className="py-2.5 px-3 font-semibold">CE / PE</th>
                      <th className="py-2.5 px-3 font-semibold">Strike</th>
                      <th className="py-2.5 px-3 font-semibold">Qty (Lots)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Entry</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Exit</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Charges</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Net P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-200">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500 text-xs">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((r, idx) => {
                        const tr = r.trade;
                        return (
                          <tr
                            key={r.rowNumber || idx}
                            className={`transition-colors ${
                              !r.isValid
                                ? 'bg-rose-500/10 hover:bg-rose-500/15'
                                : idx % 2 === 0
                                ? 'bg-transparent hover:bg-[#121b2d]/60 light:hover:bg-slate-50'
                                : 'bg-[#0e1626]/40 hover:bg-[#121b2d]/60 light:bg-slate-50/50 light:hover:bg-slate-100/60'
                            }`}
                          >
                            {/* Row Number */}
                            <td className="py-2 px-3 text-center font-mono-numbers text-slate-400 text-[11px]">
                              {r.rowNumber}
                            </td>

                            {/* Validation Status / Error Message right near this particular row */}
                            <td className="py-2 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/25">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Ready to Import</span>
                                </span>
                              ) : (
                                <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] flex items-start gap-1.5 leading-snug">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-rose-400">Error:</strong> {r.errorMessage}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Trade Date */}
                            <td className="py-2 px-3 text-slate-300 light:text-slate-700 whitespace-nowrap text-[11px]">
                              {tr?.trade_date || '-'}
                            </td>

                            {/* Index Name */}
                            <td className="py-2 px-3 font-semibold text-white light:text-slate-900 whitespace-nowrap">
                              {tr?.index_name || r.scriptName || '-'}
                            </td>

                            {/* Option Type CE/PE */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              {tr?.option_type ? (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                    tr.option_type === 'CE'
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : tr.option_type === 'PE'
                                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                  }`}
                                >
                                  {tr.option_type}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>

                            {/* Strike Price */}
                            <td className="py-2 px-3 font-mono-numbers text-slate-300 light:text-slate-700 whitespace-nowrap">
                              {tr?.strike_price ? tr.strike_price : '-'}
                            </td>

                            {/* Qty & Lots */}
                            <td className="py-2 px-3 font-mono-numbers text-slate-300 light:text-slate-700 whitespace-nowrap text-[11px]">
                              {tr?.quantity ? `${tr.quantity} (${tr.lots || 1}L)` : '-'}
                            </td>

                            {/* Entry Premium */}
                            <td className="py-2 px-3 text-right font-mono-numbers text-slate-300 light:text-slate-700 whitespace-nowrap">
                              {tr?.entry_premium !== undefined ? `₹${tr.entry_premium}` : '-'}
                            </td>

                            {/* Exit Premium */}
                            <td className="py-2 px-3 text-right font-mono-numbers text-slate-300 light:text-slate-700 whitespace-nowrap">
                              {tr?.exit_premium !== undefined ? `₹${tr.exit_premium}` : '-'}
                            </td>

                            {/* Total Charges */}
                            <td className="py-2 px-3 text-right font-mono-numbers text-slate-400 whitespace-nowrap">
                              {tr?.total_charges !== undefined ? `₹${tr.total_charges}` : '-'}
                            </td>

                            {/* Net P&L */}
                            <td className="py-2 px-3 text-right font-mono-numbers font-bold whitespace-nowrap">
                              {tr?.net_pnl !== undefined ? (
                                <span className={tr.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {tr.net_pnl >= 0 ? `+₹${tr.net_pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(tr.net_pnl).toLocaleString('en-IN')}`}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-[#1e293b] light:border-slate-200 bg-[#0e1626]/80 light:bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {errorCount > 0 && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 bg-[#121b2d]"
                />
                <span className="text-slate-300 light:text-slate-700">
                  Skip invalid rows and import only the <strong>{validCount} valid trades</strong>
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={importing || validCount === 0 || (!skipErrors && errorCount > 0)}
              onClick={handleExecuteImport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Trades...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    Import {validCount} Trade{validCount === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
