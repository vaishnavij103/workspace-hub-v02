import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useLocation } from '../LocationContext';
import { getInvoices, processInvoiceOcr, createInvoice, deleteInvoice } from '../api';
import {
  FileText, UploadCloud, PieChart as PieChartIcon, BarChart3, Trash2, CheckCircle2, Clock, RefreshCw, DollarSign, Tag, Building, Eye, ChevronDown, ChevronUp, FileCode
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export default function InvoicesPage() {
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const { location: defaultLocation } = useLocation();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'upload' | 'reports'

  // Upload & OCR State
  const [file, setFile] = useState(null);
  const [uploadLocation, setUploadLocation] = useState(defaultLocation || 'Pune');
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoices({
        location: selectedLocation
      });
      setInvoices(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run OCR on file select / trigger
  const handleRunOcr = async (selectedFile) => {
    const fileToProcess = selectedFile || file;
    if (!fileToProcess) {
      setError('Please select an invoice image, PDF, or document file first.');
      return;
    }

    setOcrProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', fileToProcess);

      const result = await processInvoiceOcr(formData);
      if (result && result.data) {
        setExtractedData(result.data);
      }
    } catch (err) {
      setError(err.message || 'OCR document processing failed');
    } finally {
      setOcrProcessing(false);
    }
  };

  // Handle saving extracted invoice to repository
  const handleSaveInvoice = async () => {
    if (!extractedData) return;
    try {
      await createInvoice({
        ...extractedData,
        location: uploadLocation,
        file_name: file ? file.name : 'document.png',
        uploaded_by: user?.name || 'Admin',
      });
      setExtractedData(null);
      setFile(null);
      setActiveTab('invoices');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to save invoice');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice record?')) return;
    try {
      await deleteInvoice(id);
      loadData();
    } catch {
      setError('Failed to delete invoice');
    }
  };

  // Item field editing helper for extracted preview
  const handleUpdateItem = (index, field, value) => {
    if (!extractedData) return;
    const updatedItems = [...extractedData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' || field === 'unit_price' || field === 'amount' ? Number(value) : value,
    };
    // Recalculate item amount if quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const p = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].amount = q * p;
    }
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const newTotal = newSubtotal + (extractedData.tax || 0);

    setExtractedData({
      ...extractedData,
      items: updatedItems,
      subtotal: newSubtotal,
      total_amount: newTotal,
    });
  };

  const handleAddItem = () => {
    if (!extractedData) return;
    const newItem = {
      description: 'New Service Line Item',
      type_of_service: 'General Service',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      quantity: 1,
      unit_price: 100,
      amount: 100,
    };
    const updatedItems = [...extractedData.items, newItem];
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const newTotal = newSubtotal + (extractedData.tax || 0);

    setExtractedData({
      ...extractedData,
      items: updatedItems,
      subtotal: newSubtotal,
      total_amount: newTotal,
    });
  };

  // Aggregated Expense Metrics
  const totalSpend = useMemo(() => invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0), [invoices]);
  const locationData = useMemo(() => {
    const map = {};
    invoices.forEach(i => {
      const loc = i.location || 'Pune';
      map[loc] = (map[loc] || 0) + (i.total_amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden ${theme === 'dark'
        ? 'bg-gradient-to-r from-purple-950/40 via-[#0a0f24] to-[#0d1530] border-purple-500/20 shadow-2xl'
        : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-indigo shadow-xl'
        }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 backdrop-blur-md border border-white/20 text-purple-200">
              Procurement & Intelligent OCR Parsing
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-300" />
              Invoice & Expense Management
            </h1>
            <p className="text-sm opacity-90 max-w-2xl font-light">
              Upload vendor invoices (PNG, JPG, PDF) to automatically extract document details, line items, service dates, taxes, and vendor addresses using multimodal AI OCR.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('upload')}
              className="px-4 py-2.5 rounded-xl bg-white text-purple-900 font-bold text-xs hover:bg-purple-50 transition shadow-md flex items-center gap-2"
            >
              <UploadCloud size={16} />
              <span>Upload & Scan Invoice</span>
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-indigo font-semibold text-xs border border-white/20 transition backdrop-blur-md flex items-center gap-2"
            >
              <FileCode size={16} />
              <span>Repository ({invoices.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-4">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'invoices'
            ? theme === 'dark' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-300'
            : 'text-slate-400 hover:text-indigo'
            }`}
        >
          <FileText size={16} />
          <span>Invoice Repository ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'upload'
            ? theme === 'dark' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-300'
            : 'text-slate-400 hover:text-indigo'
            }`}
        >
          <UploadCloud size={16} />
          <span>Upload & OCR Document</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'reports'
            ? theme === 'dark' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-300'
            : 'text-slate-400 hover:text-indigo'
            }`}
        >
          <PieChartIcon size={16} />
          <span>Analytics & Spend</span>
        </button>
      </div>

      {/* TAB 1: INVOICE REPOSITORY */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200'
            }`}>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">Filter Location:</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-indigo' : 'bg-white border-slate-300 text-slate-900'
                  }`}
              >
                <option value="">All Locations</option>
                {['Pune', 'Coimbatore', 'Bangalore(Domlur)', 'Chennai', 'Hyderabad', 'Mumbai', 'Ahmedabad', 'Bangalore(Signet)'].map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setActiveTab('upload')}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-indigo font-semibold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <UploadCloud size={14} />
              Process New Document
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading invoice records...</div>
          ) : invoices.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200'
              }`}>
              <FileText size={36} className="mx-auto text-slate-500 mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-300">No Invoices Uploaded</h3>
              <p className="text-xs text-slate-500 mt-1">
                The invoice repository is currently empty. Click "Upload & OCR Document" to add your first vendor invoice.
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'
              }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    } font-semibold uppercase text-[0.65rem]`}>
                    <tr>
                      <th className="p-4">Doc Type / Vendor</th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Invoice Date</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Subtotal / Tax</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {invoices.map((inv) => {
                      const isExpanded = expandedInvoiceId === inv.invoice_id;

                      return (
                        <Fragment key={inv.invoice_id}>
                          <tr className="hover:bg-slate-500/5 transition">
                            <td className="p-4">
                              <div className="font-bold text-purple-400">{inv.vendor_name}</div>
                              <div className="text-[0.68rem] text-slate-400">{inv.document_type || 'Tax Invoice'}</div>
                            </td>
                            <td className="p-4 font-mono font-medium text-slate-300">{inv.invoice_number}</td>
                            <td className="p-4 text-slate-400">{inv.invoice_date}</td>
                            <td className="p-4 text-slate-300 font-medium">{inv.location}</td>
                            <td className="p-4 text-slate-400">
                              <div>{inv.currency || '$'}{inv.subtotal?.toLocaleString()}</div>
                              <div className="text-[0.68rem] text-slate-500">+ Tax: {inv.currency || '$'}{inv.tax?.toLocaleString()}</div>
                            </td>
                            <td className="p-4 font-extrabold text-indigo text-sm">
                              {inv.currency || '$'}{inv.total_amount?.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {inv.status || 'processed'}
                              </span>
                            </td>
                            <td className="p-4 text-right flex items-center justify-end gap-2">
                              <button
                                onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.invoice_id)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-indigo transition flex items-center gap-1 text-[0.7rem]"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                Line Items ({inv.items?.length || 0})
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(inv.invoice_id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* EXPANDED LINE ITEMS ROW */}
                          {isExpanded && (
                            <tr key={`${inv.invoice_id}_items`} className="bg-[#090d17]">
                              <td colSpan={8} className="p-4 border-t border-b border-gray-800">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                                    <span>Extracted Line Items for {inv.invoice_number} ({inv.vendor_address || 'Address N/A'})</span>
                                    <span>Uploaded By: {inv.uploaded_by || 'Admin'}</span>
                                  </div>

                                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                                    <table className="w-full text-left text-[0.7rem]">
                                      <thead className="bg-[#121829] text-slate-400 font-semibold uppercase">
                                        <tr>
                                          <th className="p-2">Description</th>
                                          <th className="p-2">Type of Service</th>
                                          <th className="p-2">Service Dates</th>
                                          <th className="p-2">Qty</th>
                                          <th className="p-2">Unit Price</th>
                                          <th className="p-2 text-right">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-800 text-slate-300">
                                        {inv.items && inv.items.length > 0 ? (
                                          inv.items.map((item, idx) => (
                                            <tr key={idx}>
                                              <td className="p-2 font-medium">{item.description}</td>
                                              <td className="p-2 text-indigo-400">{item.type_of_service}</td>
                                              <td className="p-2 text-slate-400">
                                                {item.start_date || 'N/A'} {item.end_date ? `to ${item.end_date}` : ''}
                                              </td>
                                              <td className="p-2">{item.quantity}</td>
                                              <td className="p-2">{inv.currency || '$'}{item.unit_price}</td>
                                              <td className="p-2 text-right font-bold text-slate-200">
                                                {inv.currency || '$'}{item.amount}
                                              </td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td colSpan={6} className="p-3 text-center text-slate-500">
                                              No line item breakdown recorded.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD & OCR PROCESSING */}
      {activeTab === 'upload' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200 shadow-sm'
            }`}>
            <h2 className="text-lg font-bold text-indigo mb-1">
              Multimodal OCR Document Processing
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Upload any invoice image or PDF document. AI will automatically extract structural invoice fields including vendor details, service dates, line item breakdowns, tax, and currency.
            </p>

            <div className="space-y-4">
              {/* File Dropzone */}
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${file
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-700 hover:border-purple-500/50 bg-slate-900/50'
                }`}>
                <input
                  type="file"
                  id="ocr-invoice-file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const selected = e.target.files[0];
                    setFile(selected);
                    if (selected) handleRunOcr(selected);
                  }}
                  className="hidden"
                />
                <label htmlFor="ocr-invoice-file" className="cursor-pointer block">
                  <UploadCloud size={40} className="mx-auto mb-2 text-purple-400" />
                  <div className="text-sm font-semibold text-slate-200">
                    {file ? file.name : 'Click or Drop Invoice Document (PNG, JPG, PDF)'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Automatic OCR Field Extraction</p>
                </label>
              </div>

              {/* Location selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target Location</label>
                  <select
                    value={uploadLocation}
                    onChange={(e) => setUploadLocation(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-indigo' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                  >
                    {['Pune', 'Coimbatore', 'Bangalore(Domlur)', 'Chennai', 'Hyderabad', 'Mumbai', 'Ahmedabad', 'Bangalore(Signet)'].map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => handleRunOcr()}
                    disabled={ocrProcessing || !file}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-indigo font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
                  >
                    {ocrProcessing ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Running AI OCR Extraction...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        <span>Re-Run AI OCR Extraction</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* EXTRACTED FIELDS REVIEW & EDIT FORM */}
            {extractedData && (
              <div className="mt-8 pt-6 border-t border-gray-800 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <h3 className="text-base font-bold text-indigo">Extracted Invoice Fields Review</h3>
                  </div>
                  <span className="text-xs text-slate-400">Review & verify extracted values before saving</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Document Type</label>
                    <input
                      type="text"
                      value={extractedData.document_type || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, document_type: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={extractedData.vendor_name || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, vendor_name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={extractedData.invoice_number || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, invoice_number: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={extractedData.invoice_date || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, invoice_date: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Currency</label>
                    <input
                      type="text"
                      value={extractedData.currency || 'USD'}
                      onChange={(e) => setExtractedData({ ...extractedData, currency: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Vendor Address</label>
                    <input
                      type="text"
                      value={extractedData.vendor_address || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, vendor_address: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo"
                    />
                  </div>
                </div>

                {/* LINE ITEMS EDITABLE TABLE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Extracted Line Items ({extractedData.items?.length || 0})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs px-2.5 py-1 bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-indigo rounded-lg transition"
                    >
                      + Add Line Item
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121829] text-slate-400 font-semibold uppercase text-[0.65rem]">
                        <tr>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5">Type of Service</th>
                          <th className="p-2.5">Start Date</th>
                          <th className="p-2.5">End Date</th>
                          <th className="p-2.5 w-16">Qty</th>
                          <th className="p-2.5 w-24">Unit Price</th>
                          <th className="p-2.5 w-24">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 bg-slate-900/50">
                        {extractedData.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.type_of_service}
                                onChange={(e) => handleUpdateItem(idx, 'type_of_service', e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={item.start_date}
                                onChange={(e) => handleUpdateItem(idx, 'start_date', e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={item.end_date}
                                onChange={(e) => handleUpdateItem(idx, 'end_date', e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleUpdateItem(idx, 'unit_price', e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) => handleUpdateItem(idx, 'amount', e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo text-xs font-bold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TOTALS SUMMARY */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400 block">Subtotal</span>
                      <input
                        type="number"
                        value={extractedData.subtotal}
                        onChange={(e) => setExtractedData({ ...extractedData, subtotal: Number(e.target.value) })}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo font-bold w-28"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tax</span>
                      <input
                        type="number"
                        value={extractedData.tax}
                        onChange={(e) => {
                          const taxVal = Number(e.target.value);
                          setExtractedData({
                            ...extractedData,
                            tax: taxVal,
                            total_amount: (extractedData.subtotal || 0) + taxVal,
                          });
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-indigo font-bold w-28"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <span className="text-xl font-extrabold text-emerald-400">
                      {extractedData.currency || '$'}{extractedData.total_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => setExtractedData(null)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-indigo rounded-xl transition"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveInvoice}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-indigo font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>Save to Invoice Repository</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SPEND ANALYTICS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Total Procurement Spend</span>
              <div className="text-2xl font-extrabold text-indigo">${totalSpend.toLocaleString()}</div>
            </div>
            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Total Invoices Processed</span>
              <div className="text-2xl font-extrabold text-indigo">{invoices.length}</div>
            </div>
            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Workplace Locations</span>
              <div className="text-2xl font-extrabold text-indigo">{locationData.length}</div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-slate-200'}`}>
            <h3 className="text-base font-bold text-indigo mb-4">Location Spend Allocation</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(val) => `$${Number(val).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
