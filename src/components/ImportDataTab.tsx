import React, { useState, useRef, useEffect } from 'react';
import { BrokerageAccount, PortfolioPosition, AssetType } from '../types';
import { csvTemplates, formatVND, formatShares } from '../utils';
import { getAuthHeader } from '../supabaseClient';
import { AssetlyText } from './AssetlyLogo';
import { 
  Camera, 
  Upload, 
  FileText, 
  Keyboard, 
  AlertTriangle, 
  Loader2, 
  Check, 
  X, 
  Info, 
  Trash2, 
  Plus, 
  ArrowRight,
  ClipboardCheck,
  Zap
} from 'lucide-react';

interface ImportDataTabProps {
  accounts: BrokerageAccount[];
  onImportPositions: (accountId: string, newPositions: Omit<PortfolioPosition, 'id' | 'currentPrice' | 'updatedAt'>[], mode: 'add' | 'overwrite') => void;
  onAddHistoryItem: (history: { fileName: string; accountId: string; status: 'Completed' | 'Failed'; importedCount: number; failedCount: number; errorLog?: string[] }) => void;
}

interface DraftPosition {
  stockSymbol: string;
  quantity: number;
  averageCostPrice: number;
}

export default function ImportDataTab({
  accounts,
  onImportPositions,
  onAddHistoryItem,
}: ImportDataTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ocr' | 'csv' | 'manual' | 'api'>('ocr');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  // Keep selected account sync when a new account is registered or accounts list changes
  useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.map(a => a.id).includes(selectedAccountId))) {
      setSelectedAccountId(accounts[accounts.length - 1].id);
    }
  }, [accounts]);

  // 1. OCR screenshot states
  const [screenshotRaw, setScreenshotRaw] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrLogName, setOcrLogName] = useState('');

  // 2. CSV / Copy-Paste spreadsheet states
  const [csvContent, setCsvContent] = useState('');
  const [selectedMappingTemplate, setSelectedMappingTemplate] = useState<'Pinetree' | 'SSI' | 'General'>('General');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState('');

  // 3. Manual positional states
  const [manualSymbol, setManualSymbol] = useState('');
  const [manualQty, setManualQty] = useState<number>(0);
  const [manualPrice, setManualPrice] = useState<number>(0);
  const [manualAssetType, setManualAssetType] = useState<AssetType>('EQUITY');

  // Preview management (OCR, CSV results stream to this table before persisting)
  const [previewPositions, setPreviewPositions] = useState<DraftPosition[]>([]);
  const [importMode, setImportMode] = useState<'add' | 'overwrite'>('add');
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Trigger Gemini-powered OCR screenshot parsing
  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setOcrError("Ảnh vượt quá giới hạn dung lượng 10MB VN Stock requirement.");
      return;
    }

    setOcrError(null);
    setOcrLoading(true);
    setOcrLogName(file.name);

    try {
      const base64 = await fileToBase64(file);
      setScreenshotRaw(base64);

      // Call our Express server endpoint (/api/ocr)
      const selectedAccount = accounts.find(a => a.id === selectedAccountId);
      const brokerName = selectedAccount ? selectedAccount.broker : 'SSI';

      const authHeaders = await getAuthHeader();
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 
          ...authHeaders,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          imageBase64: base64,
          broker: brokerName
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Không thể trích xuất thông tin danh mục qua Gemini API.");
      }

      const extracted: DraftPosition[] = result.positions.map((p: any) => ({
        stockSymbol: p.stockSymbol ? p.stockSymbol.toUpperCase().trim() : '',
        quantity: Number(p.quantity) || 0,
        averageCostPrice: Number(p.averageCostPrice) || 0
      })).filter((p: any) => p.stockSymbol && p.quantity > 0);

      // Validate results
      const warnings: string[] = [];
      extracted.forEach(p => {
        // Warning if stock code is abnormal
        if (p.stockSymbol.length < 3 || p.stockSymbol.length > 8) {
          warnings.push(`Mã CK "${p.stockSymbol}" có thể chưa chính xác.`);
        }
        if (p.averageCostPrice <= 0) {
          warnings.push(`Vị thế "${p.stockSymbol}" đang thiếu giá vốn trung bình.`);
        }
      });

      setPreviewPositions(extracted);
      setValidationWarnings(warnings);

    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setOcrLoading(false);
    }
  };

  // Import positions handler
  const handleProceedImport = () => {
    if (!selectedAccountId) {
      alert("Vui lòng chọn tài khoản đích để import.");
      return;
    }
    if (previewPositions.length === 0) return;

    // Filter valid positions
    const validPositions = previewPositions.filter(p => p.stockSymbol.length >= 3 && p.quantity > 0);
    
    // Auto-map Asset Types
    const mappedToImport = validPositions.map(p => {
      let assetType: AssetType = 'EQUITY';
      if (p.stockSymbol.startsWith('E1V') || p.stockSymbol.startsWith('FU')) {
        assetType = 'ETF';
      } else if (p.stockSymbol.includes('F1M') || p.stockSymbol.includes('F2M')) {
        assetType = 'DERIVATIVE';
      }
      return {
        stockSymbol: p.stockSymbol,
        quantity: p.quantity,
        averageCostPrice: p.averageCostPrice,
        assetType
      };
    });

    onImportPositions(selectedAccountId, mappedToImport, importMode);

    // Save history logs
    onAddHistoryItem({
      fileName: ocrLogName || csvFileName || "Nhập danh mục thủ công",
      accountId: selectedAccountId,
      status: 'Completed',
      importedCount: mappedToImport.length,
      failedCount: previewPositions.length - mappedToImport.length
    });

    // Reset preview
    setPreviewPositions([]);
    setScreenshotRaw(null);
    setCsvContent('');
  };

  // Parser: Simple spreadsheet / CSV text parser
  const parseCSVContent = () => {
    if (!csvContent.trim()) {
      setCsvError("Vui lòng nhập nội dung bảng spreadsheet.");
      return;
    }

    try {
      setCsvError(null);
      const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error("Dữ liệu cần chứa dòng tiêu đề và ít nhất 1 dòng dữ liệu.");
      }

      // Detect spreadsheet columns indices
      const headerLine = lines[0].toLowerCase();
      let symbolIdx = -1;
      let qtyIdx = -1;
      let priceIdx = -1;

      // Basic matching keywords
      const symbolTerms = ['mã', 'symbol', 'ticker', 'mack', 'ma', 'ck', 'stock'];
      const qtyTerms = ['lượng', 'số lượng', 'soluong', 'quantity', 'qty', 'sl', 'vol'];
      const priceTerms = ['giá vốn', 'giavon', 'average', 'avg', 'cost', 'giá mua', 'giamua', 'price'];

      const headers = headerLine.split(/[,;\t]/).map(h => h.trim());

      headers.forEach((h, idx) => {
        if (symbolTerms.some(term => h.includes(term))) symbolIdx = idx;
        if (qtyTerms.some(term => h.includes(term))) qtyIdx = idx;
        if (priceTerms.some(term => h.includes(term))) priceIdx = idx;
      });

      // Default index mapping templates if terms match fail
      if (selectedMappingTemplate === 'Pinetree') {
        symbolIdx = 0; qtyIdx = 1; priceIdx = 2; // Col index
      } else if (selectedMappingTemplate === 'SSI') {
        symbolIdx = 0; qtyIdx = 1; priceIdx = 2;
      }

      // If still mapping failed, fallback to 0, 1, 2
      if (symbolIdx === -1) symbolIdx = 0;
      if (qtyIdx === -1) qtyIdx = 1;
      if (priceIdx === -1) priceIdx = 2;

      const parsed: DraftPosition[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Split by comma, semicolon or tabs
        const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/"/g, ''));
        if (cols.length <= Math.max(symbolIdx, qtyIdx, priceIdx)) {
          continue; // row irregular shape
        }

        const sym = cols[symbolIdx].toUpperCase();
        // Strip any alphabetic separators/dots inside quantities
        const qty = parseInt(cols[qtyIdx].replace(/[.,\s]/g, ''), 10) || 0;
        
        // Strip dots/commas inside price
        let rawPriceStr = cols[priceIdx].replace(/[,\s]/g, '');
        // If they wrote with dot representing thousands decimals e.g., 28.5 but standard VND has thousands, convert it or parse float
        let averagePrice = parseFloat(rawPriceStr) || 0;
        if (averagePrice < 1000 && averagePrice > 0) {
          // Detect Vietnamese fractional representation: 28.5 represents 28500
          averagePrice = averagePrice * 1000;
        } else {
          // If 28.500 VND includes dots e.g., 28.500, parsing float could fail if strip dot, make sure it resolves to 28500
          averagePrice = parseFloat(rawPriceStr.replace(/\./g, '')) || 0;
        }

        if (sym && qty > 0) {
          parsed.push({
            stockSymbol: sym,
            quantity: qty,
            averageCostPrice: averagePrice
          });
        }
      }

      if (parsed.length === 0) {
        throw new Error("Không thể trích xuất cột dữ liệu nào. Vui lòng kiểm tra lại định dạng của bạn.");
      }

      setPreviewPositions(parsed);
      setValidationWarnings(warnings);

    } catch (err: any) {
      setCsvError(err.message || "Lỗi parse file bảng biểu.");
    }
  };

  // Parser: CSV file reader upload
  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setCsvContent(text);
        // auto trigger parsing
      }
    };
    reader.readAsText(file);
  };

  // Add position directly via manual form
  const handleAddManualPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSymbol.trim() || manualQty <= 0 || manualPrice <= 0) {
      alert("Vui lòng điền đầy đủ các trường thông tin vị thế.");
      return;
    }

    const sym = manualSymbol.trim().toUpperCase();
    
    // Check if symbol already in previews
    const exists = previewPositions.find(p => p.stockSymbol === sym);
    if (exists) {
      alert(`Mã ${sym} đã tồn tại trong danh sách preview chuẩn bị import.`);
      return;
    }

    setPreviewPositions([
      ...previewPositions,
      {
        stockSymbol: sym,
        quantity: manualQty,
        averageCostPrice: manualPrice
      }
    ]);

    // reset simple inputs
    setManualSymbol('');
    setManualQty(0);
    setManualPrice(0);
  };

  // Delete preview position drafts
  const handleDeleteDraftItem = (index: number) => {
    setPreviewPositions(previewPositions.filter((_, idx) => idx !== index));
  };

  // Update draft in interactive preview table
  const handleUpdateDraftValue = (index: number, field: keyof DraftPosition, value: string | number) => {
    const updated = [...previewPositions];
    if (field === 'stockSymbol') {
      updated[index].stockSymbol = String(value).toUpperCase();
    } else {
      updated[index][field] = Number(value) || 0;
    }
    setPreviewPositions(updated);
  };

  return (
    <div id="import-data-tab" className="space-y-6">

      {/* Selector of Target Brokerage Account */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">1. Chọn Tài Khoản Chứng Khoán Đích</h3>
          <p className="text-xs text-zinc-500 mt-1">Dữ liệu tài sản sau khi import sẽ được ghi nhận vào tài khoản này.</p>
        </div>

        <select
          id="import-account-selector"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-zinc-800 rounded-xl bg-zinc-950 text-zinc-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-555 font-semibold cursor-pointer"
        >
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.broker}) - Tiền mặt: {formatVND(a.cashBalance)}
            </option>
          ))}
          {accounts.length === 0 && <option value="">(Không có tài khoản - Vui lòng tạo tài khoản trước)</option>}
        </select>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-12 text-center rounded-2xl text-zinc-500 font-sans">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4 animate-pulse" />
          <p className="font-semibold text-sm text-zinc-300">Cần ít nhất một tài khoản CTCK để thực hiện tính năng này</p>
          <p className="text-xs mt-1 text-zinc-500">Hãy chuyển sang mục "Quản lý Tài Khoản" để khởi tạo một tài khoản chứng khoán.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-xs">
          
          {/* Ingestion Lanes Controller (Left Panel) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 shadow-xs">
              <h4 className="font-bold text-zinc-200 mb-3 border-b border-zinc-850 pb-2 mb-2 select-none">Phương thức nạp tài sản</h4>
              
              <div className="space-y-2">
                <button
                  id="tab-lane-ocr"
                  onClick={() => { setActiveSubTab('ocr'); setPreviewPositions([]); }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition cursor-pointer text-left ${
                    activeSubTab === 'ocr' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500' 
                      : 'hover:bg-zinc-850/45 text-zinc-400 border-l-4 border-transparent'
                  }`}
                >
                  <Camera className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wide">Trích xuất bằng Ảnh Chụp</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Nhanh nhất - Chụp screenshot danh mục rồi upload</p>
                  </div>
                </button>

                <button
                  id="tab-lane-csv"
                  onClick={() => { setActiveSubTab('csv'); setPreviewPositions([]); }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition cursor-pointer text-left ${
                    activeSubTab === 'csv' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500' 
                      : 'hover:bg-zinc-850/45 text-zinc-400 border-l-4 border-transparent'
                  }`}
                >
                  <FileText className="h-4 w-4 text-blue-450 shrink-0" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wide">Import bảng Excel / CSV</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Dành cho bảng tính hoặc sao kê giao diện web</p>
                  </div>
                </button>

                <button
                  id="tab-lane-manual"
                  onClick={() => { setActiveSubTab('manual'); setPreviewPositions([]); }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition cursor-pointer text-left ${
                    activeSubTab === 'manual' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500' 
                      : 'hover:bg-zinc-850/45 text-zinc-400 border-l-4 border-transparent'
                  }`}
                >
                  <Keyboard className="h-4 w-4 text-purple-400 shrink-0" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wide">Nhập tay từng vị thế</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Nhập mã tài sản thủ công bất kỳ</p>
                  </div>
                </button>

                <button
                  id="tab-lane-api"
                  onClick={() => { setActiveSubTab('api'); setPreviewPositions([]); }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition cursor-pointer text-left ${
                    activeSubTab === 'api' 
                      ? 'bg-amber-500/10 text-amber-400 border-l-4 border-amber-500' 
                      : 'hover:bg-zinc-850/30 text-zinc-450 border-l-4 border-transparent'
                  }`}
                >
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs uppercase tracking-wide truncate">Kết nối qua API bảo mật</p>
                      <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 border border-amber-500/20 font-bold font-mono rounded shrink-0 ml-1">Phase 2</span>
                    </div>
                    <p className="text-[10px] text-zinc-550 mt-0.5 truncate">Đồng bộ tự động realtime từ MBS, SSI, VPS...</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Ingestion dynamic detail box relative to selected active lane */}
            {activeSubTab === 'ocr' && (
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold border-b border-zinc-850 pb-2 select-none">
                  <Zap className="h-4 w-4 animate-bounce shrink-0" />
                  <span>Cảnh chụp thông minh (Gemini AI)</span>
                </div>
                
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Chụp screenshot phần hiển thị danh mục sở hữu cổ phiếu tại SSI, TCBS, VPS, Pinetree hay MBS. Gemini Vision tự động nhận diện ký hiệu mã, giá vốn và quy đổi theo đơn vị đầy đủ đồng (VND).
                </p>

                {/* Upload Action triggers */}
                <div 
                  onClick={() => ocrFileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer hover:bg-emerald-500/5 transition select-none"
                >
                  {ocrLoading ? (
                    <div className="space-y-2">
                      <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
                      <p className="font-bold text-emerald-400">Gemini đang phân tích vị thế...</p>
                      <p className="text-[10px] text-zinc-550">Trích xuất ticker, giá cũ & quy đổi VND</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="h-8 w-8 text-zinc-600 mx-auto" />
                      <p className="font-bold text-zinc-300">Tải screenshot của bạn lên</p>
                      <p className="text-[10px] text-zinc-550">Hỗ trợ PNG, JPEG dung lượng up to 10MB</p>
                    </div>
                  )}
                  <input
                    ref={ocrFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotSelect}
                    className="hidden"
                  />
                </div>

                {ocrError && (
                  <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/15 rounded-xl leading-relaxed text-[10px]">
                    {ocrError}
                  </div>
                )}

                {screenshotRaw && !ocrLoading && (
                  <div className="space-y-1 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
                    <p className="font-semibold text-zinc-550 select-none">Thumbnail ảnh tải lên:</p>
                    <img 
                      src={screenshotRaw} 
                      alt="Screenshot crop preview" 
                      className="max-h-36 rounded-lg mx-auto w-auto object-contain border border-zinc-800 bg-zinc-900"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'csv' && (
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center space-x-1.5 text-blue-400 font-bold border-b border-zinc-850 pb-2 select-none">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>Dữ liệu bảng tính (Copypaste)</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-400 block select-none">Template cấu trúc cột</label>
                  <select
                    id="csv-template-dropdown"
                    value={selectedMappingTemplate}
                    onChange={(e) => {
                      const mode = e.target.value as 'Pinetree' | 'SSI' | 'General';
                      setSelectedMappingTemplate(mode);
                      setCsvContent(csvTemplates[mode]);
                    }}
                    className="w-full px-2 py-1.5 border border-zinc-800 rounded-lg bg-zinc-950 text-zinc-300 cursor-pointer focus:outline-hidden"
                  >
                    <option value="General">Phổ thông (Mã, Số lượng, Giá vốn)</option>
                    <option value="Pinetree">Sao kê Pinetree Securities</option>
                    <option value="SSI">Sao kê SSI Securities</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center select-none">
                    <label className="font-semibold text-zinc-300">Dữ liệu bảng (CSV / Spreadsheet rows)</label>
                    <button
                      onClick={() => setCsvContent(csvTemplates[selectedMappingTemplate])}
                      className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                    >
                      Dùng dữ liệu mẫu
                    </button>
                  </div>
                  <textarea
                    id="csv-text-area"
                    rows={6}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="Dán các cột từ Excel của bạn vào đây..."
                    className="w-full px-2.5 py-2 font-mono text-[10px] border border-zinc-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-zinc-950 text-zinc-100 placeholder:text-zinc-650"
                  />
                </div>

                {/* File fallback */}
                <div className="space-y-1 select-none">
                  <label className="font-semibold text-zinc-400 block">Hoặc duyệt file CSV:</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .txt"
                    onChange={handleCSVFileSelect}
                    className="w-full text-xs text-zinc-550 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-750 file:cursor-pointer"
                  />
                  {csvFileName && <p className="text-[10px] text-emerald-400 font-medium mt-1">📁 Đã nạp file: {csvFileName}</p>}
                </div>

                {csvError && (
                  <div className="p-2.5 bg-red-500/10 text-red-400 border border-red-550/15 rounded-lg text-[10px]">
                    {csvError}
                  </div>
                )}

                <button
                  id="parse-csv-btn"
                  onClick={parseCSVContent}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-450 text-black rounded-xl font-bold cursor-pointer transition select-none"
                >
                  Xác nhận Khớp Cột & Phân tích
                </button>
              </div>
            )}

            {activeSubTab === 'manual' && (
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center space-x-1.5 text-purple-400 font-bold border-b border-zinc-850 pb-2 select-none">
                  <Keyboard className="h-4 w-4 shrink-0" />
                  <span>Nhập vị thế thủ công</span>
                </div>

                <form onSubmit={handleAddManualPosition} className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-300 block">Mã chứng khoán</label>
                    <input
                      id="manual-symbol-input"
                      type="text"
                      placeholder="Ví dụ: HPG, VN30F1M, E1VFVN30"
                      required
                      value={manualSymbol}
                      onChange={(e) => setManualSymbol(e.target.value)}
                      className="w-full px-3 py-1.5 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-bold text-center uppercase text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-300 block">Số lượng</label>
                      <input
                        id="manual-qty-input"
                        type="number"
                        min="1"
                        required
                        value={manualQty || ''}
                        onChange={(e) => setManualQty(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono text-right text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-300 block">Giá vốn (VND)</label>
                      <input
                        id="manual-price-input"
                        type="number"
                        min="1"
                        required
                        value={manualPrice || ''}
                        onChange={(e) => setManualPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono text-right text-xs"
                      />
                    </div>
                  </div>

                  <button
                    id="add-manual-list-btn"
                    type="submit"
                    className="w-full py-2 bg-purple-500 hover:bg-purple-450 text-black rounded-xl font-bold cursor-pointer transition flex items-center justify-center space-x-1.5 select-none text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Lên danh sách preview</span>
                  </button>
                </form>
              </div>
            )}

            {activeSubTab === 'api' && (
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold border-b border-zinc-850 pb-2 select-none">
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>Cổng đồng bộ API thực tế</span>
                </div>
                
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Giải pháp tích hợp giúp <AssetlyText className="text-[11px]" /> trực tiếp truy vấn số dư sở hữu thực tế từ các CTCK lớn (VNDIRECT, SSI, VPS, TCBS...). Loại bỏ hoàn toàn sự bất tiện khi phải tải file sao kê hay chụp hình thủ công.
                </p>

                <div className="space-y-4 pt-1">
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850 space-y-2">
                    <p className="font-bold text-[9px] text-zinc-450 uppercase tracking-widest font-mono select-none">Cam kết an toàn SSI Webhook</p>
                    <div className="space-y-1.5 text-zinc-550 text-[10px] leading-relaxed">
                      <p className="flex items-start space-x-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>Quyền truy cập chỉ đọc (Read-Only Compliance)</span>
                      </p>
                      <p className="flex items-start space-x-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>Tuyệt đối không có lệnh giao dịch/chuyển tiền</span>
                      </p>
                      <p className="flex items-start space-x-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>Mã hóa bảo mật đầu cuối HTTPS & AES-256</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table Preview and Import trigger (Right Panel - takes 2 cols) */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in text-xs">
            {activeSubTab === 'api' ? (
              <div className="bg-[#09090b] border border-zinc-800/80 rounded-2xl p-6 md:p-8 shadow-xs border-dashed border-amber-500/20 relative overflow-hidden space-y-6">
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                      Tính năng phát triển • Phase 2 MVP
                    </span>
                    <h4 className="text-base font-bold text-zinc-150 flex items-center space-x-2 pt-2">
                      <Zap className="h-4.5 w-4.5 text-amber-400" />
                      <span>Kết Nối Tài Khoản Trực Tiếp Qua API Bảo Mật</span>
                    </h4>
                    <p className="text-xs text-zinc-500">Thiết lập kết nối an toàn để hệ thống tự động cập nhật danh mục của bạn sau 15h00 hàng ngày.</p>
                  </div>
                </div>

                <div className="border border-zinc-850 bg-zinc-950/45 rounded-2xl p-6 space-y-6 relative opacity-60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-zinc-100 font-semibold select-none flex items-center space-x-1">
                        <span>Tài khoản đích</span>
                        <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/15">Active</span>
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id} className="bg-zinc-950 text-zinc-200">
                            {a.name} ({a.broker})
                          </option>
                        ))}
                        {accounts.length === 0 && <option value="">Chọn tài khoản</option>}
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold font-sans select-none">Chọn Cổng kết nối (API Gateway)</label>
                      <select disabled className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-500 cursor-not-allowed font-semibold select-none text-xs">
                        <option>SSI iBoard Open API Connection</option>
                        <option>VPS Securities Datafeed</option>
                        <option>TCBS TCInvest Connector</option>
                        <option>MBS Mobile Trading Webhook</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold select-none font-mono">Client ID Key</label>
                      <input 
                        type="password" 
                        disabled 
                        value="••••••••••••••••••••••••" 
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-650 cursor-not-allowed font-mono text-xs" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold select-none font-mono">Client Secret Key</label>
                      <input 
                        type="password" 
                        disabled 
                        value="••••••••••••••••••••••••" 
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-650 cursor-not-allowed font-mono text-xs" 
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-850 text-[10px] text-zinc-500 space-y-1.5 select-none">
                    <p className="font-bold text-zinc-400 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Thông tin giấy phép kết nối:</span>
                    </p>
                    <p className="leading-relaxed">Các khóa API của công ty chứng khoán được bảo mật bằng mã hóa bất đối xứng khóa công khai và lưu trữ trực tiếp trên thiết bị (Local Sandbox Private Vault) của bạn. Hệ thống cam kết không bao giờ thu thập hay lưu lại thông tin này trên server.</p>
                  </div>

                  {/* Blurred overlay with full CTA */}
                  <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[1.5px] rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl max-w-sm shadow-xl space-y-3.5">
                      <div className="w-12 h-12 rounded-full bg-amber-550/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Zap className="h-6 w-6 text-amber-400 animate-pulse" />
                      </div>
                      <div>
                        <h5 className="font-bold text-zinc-200">Đồng bộ tự động API (Phase 2)</h5>
                        <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                          Tính năng kết nối sâu này hiện đang được thử nghiệm bảo mật (Penetration Test) và phối hợp tích hợp cổng kết nối với các công ty chứng khoán lớn. Cùng chờ đón ở quý tiếp theo!
                        </p>
                      </div>
                      <button disabled className="px-5 py-1.5 bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30 rounded-lg cursor-not-allowed select-none">
                        Nhận thông báo khi ra mắt
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#09090b] border border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden pb-4">
                
                <div className="px-6 py-4 border-b border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/20">
                  <div>
                    <h4 className="font-bold text-zinc-200 flex items-center space-x-2">
                      <ClipboardCheck className="h-4 w-4 text-emerald-450" />
                      <span>Xem trước dữ liệu khớp ({previewPositions.length} mã)</span>
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Review, sửa lỗi nhận diện của AI hoặc sai lệch cột trước khi lưu vào danh mục.</p>
                  </div>

                  <div className="flex items-center space-x-4 select-none">
                    {/* Select Import Mode (Add or Overwrite positions) */}
                    <div className="flex items-center space-x-1 border border-zinc-800 rounded-lg p-0.5 bg-zinc-950 text-[10px] font-semibold">
                      <button
                        id="import-mode-add"
                        onClick={() => setImportMode('add')}
                        className={`px-2.5 py-1 rounded-sm transition cursor-pointer ${importMode === 'add' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-500'}`}
                      >
                        Cộng dồn vị thế
                      </button>
                      <button
                        id="import-mode-overwrite"
                        onClick={() => setImportMode('overwrite')}
                        className={`px-2.5 py-1 rounded-sm transition cursor-pointer ${importMode === 'overwrite' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-500'}`}
                        title="Ghi đè bằng dữ liệu mới nhất (Xóa cũ)"
                      >
                        Bản ghi mới nhất
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid content draft */}
                {previewPositions.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-zinc-800/50">
                        <thead>
                          <tr className="bg-zinc-900/10 text-zinc-550 font-mono text-[9px] uppercase tracking-wider text-right">
                            <th className="px-6 py-2.5 text-left">Mã chứng khoán</th>
                            <th className="px-6 py-2.5">Số lượng cổ phiếu</th>
                            <th className="px-6 py-2.5">Giá mua gốc (VND)</th>
                            <th className="px-6 py-2.5 text-center">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850/60 font-sans">
                          {previewPositions.map((item, idx) => (
                            <tr key={idx} className="hover:bg-zinc-850/30 transition">
                              <td className="px-6 py-2 whitespace-nowrap">
                                <input
                                  id={`preview-sym-${idx}`}
                                  type="text"
                                  value={item.stockSymbol}
                                  onChange={(e) => handleUpdateDraftValue(idx, 'stockSymbol', e.target.value)}
                                  className="px-1.5 py-1 text-center font-bold font-mono bg-zinc-950 border border-zinc-800 rounded-md focus:border-emerald-500 focus:bg-zinc-900 uppercase w-24 text-xs text-zinc-100"
                                />
                              </td>
                              <td className="px-6 py-2 text-right whitespace-nowrap">
                                <input
                                  id={`preview-qty-${idx}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity || ''}
                                  onChange={(e) => handleUpdateDraftValue(idx, 'quantity', e.target.value)}
                                  className="px-1.5 py-1 text-right font-mono bg-zinc-950 border border-zinc-800 rounded-md focus:border-teal-500 focus:bg-zinc-900 w-24 text-xs text-zinc-100"
                                />
                              </td>
                              <td className="px-6 py-2 text-right whitespace-nowrap">
                                <div className="inline-flex flex-col items-end">
                                  <input
                                    id={`preview-price-${idx}`}
                                    type="number"
                                    min="0"
                                    value={item.averageCostPrice || ''}
                                    onChange={(e) => handleUpdateDraftValue(idx, 'averageCostPrice', e.target.value)}
                                    className="px-1.5 py-1 text-right font-mono bg-zinc-950 border border-zinc-800 rounded-md focus:border-teal-500 focus:bg-zinc-900 w-32 text-xs text-zinc-100"
                                  />
                                  <span className="text-[10px] text-zinc-500 mt-1 font-mono font-medium">
                                    ≈ {formatVND(item.averageCostPrice)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-2 text-center whitespace-nowrap">
                                <button
                                  id={`delete-draft-${idx}`}
                                  onClick={() => handleDeleteDraftItem(idx)}
                                  className="text-zinc-550 hover:text-red-400 p-1.5 rounded-md hover:bg-zinc-850 cursor-pointer transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {validationWarnings.length > 0 && (
                      <div className="m-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
                        <p className="font-bold text-amber-400 flex items-center space-x-1 text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Các cảnh báo từ hệ thống AI:</span>
                        </p>
                        {validationWarnings.map((war, wIdx) => (
                          <p key={wIdx} className="text-[10px] text-amber-500/80 pl-4 list-disc">{war}</p>
                        ))}
                      </div>
                    )}

                    {/* Confirmed Import Trigger banner */}
                    <div className="mt-6 px-6 flex justify-end space-x-3 select-none">
                      <button
                        id="cancel-draft-btn"
                        onClick={() => setPreviewPositions([])}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold rounded-xl cursor-pointer transition border border-zinc-700"
                      >
                        Xóa bảng Preview
                      </button>

                      <button
                        id="commit-import-btn"
                        onClick={handleProceedImport}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-450 text-black font-extrabold rounded-xl cursor-pointer transition flex items-center space-x-2"
                      >
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        <span>Xác nhận Nạp Tài sản</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-24 text-center text-zinc-650">
                    <ClipboardCheck className="h-10 w-10 text-zinc-800 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-400">Bộ đệm preview trống</p>
                    <p className="text-[10px] text-zinc-550 mt-1 max-w-sm mx-auto">
                      Hãy lựa chọn phương thức nạp dữ liệu ở bảng điều khiển bên trái (Ảnh chụp nhanh, Copy-Paste, hoặc Nhập trực tiếp) để nạp bảng preview tại đây.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
