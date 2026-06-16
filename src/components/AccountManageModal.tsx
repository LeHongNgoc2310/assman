import React, { useState } from 'react';
import { BrokerageAccount, PortfolioPosition, ManualTransaction, SubAccountType } from '../types';
import { formatVND, formatShares, formatPercent } from '../utils';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  TrendingUp, 
  Coins, 
  Receipt, 
  Calendar, 
  Info, 
  Lock, 
  Unlock,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface AccountManageModalProps {
  brokerName: string; // The broker connection scope, e.g. "SSI"
  accounts: BrokerageAccount[]; // All registered subaccounts
  positions: PortfolioPosition[]; // All holdings
  onClose: () => void;
  onAddAccount: (account: Omit<BrokerageAccount, 'id'>) => void;
  onEditAccount: (id: string, updated: Partial<BrokerageAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onRecordManualTransaction: (accountId: string, tx: Omit<ManualTransaction, 'id' | 'accountId' | 'confirmedAt' | 'createdAt'>) => void;
}

const SUB_ACCOUNT_LABELS: Record<SubAccountType, string> = {
  THUONG: 'Tài khoản Thường (Đầu tư cơ bản / Tích sản)',
  MARGIN: 'Tài khoản Ký Quỹ (Margin / Sức mua)',
  PHAI_SINH: 'Tài khoản Phái Sinh (Phép Hợp đồng tương lai)',
  TRAI_PHIEU: 'Tài khoản Trái phiếu & ETF Chuyên biệt'
};

export default function AccountManageModal({
  brokerName,
  accounts,
  positions,
  onClose,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onRecordManualTransaction
}: AccountManageModalProps) {
  // Filter only subaccounts belonging to this specific broker
  const brokerSubaccounts = accounts.filter(a => a.broker === brokerName);

  // Selected subaccount context within this modal
  const [selectedSubId, setSelectedSubId] = useState<string>(brokerSubaccounts[0]?.id || '');
  const activeSubAccount = brokerSubaccounts.find(a => a.id === selectedSubId) || brokerSubaccounts[0];

  // Forms state
  const [showAddSubForm, setShowAddSubForm] = useState(false);
  const [newSubType, setNewSubType] = useState<SubAccountType>('MARGIN');
  const [newSubFeeRate, setNewSubFeeRate] = useState<number>(0.15); // Default 0.15%
  const [newSubInitialCash, setNewSubInitialCash] = useState<number>(0);
  const [newSubInitialLoadStatus, setNewSubInitialLoadStatus] = useState<boolean>(true); // true = start empty (isInitialLoaded = true), false = load later (isInitialLoaded = false)

  // Subaccount Fee Inline Edit State
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [tempFeeRate, setTempFeeRate] = useState<number>(0.15);

  // Manual Transaction Form State
  const [showTxForm, setShowTxForm] = useState(false);
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [txSymbol, setTxSymbol] = useState('');
  const [txQty, setTxQty] = useState<number>(0);
  const [txPrice, setTxPrice] = useState<number>(0);
  const [txFeeOverride, setTxFeeOverride] = useState<string>(''); // blank uses subaccount defaults
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState('');

  // BR-004 Cash Sync Dialog States
  const [showCashSyncDialog, setShowCashSyncDialog] = useState(false);
  const [syncSuggestedCash, setSyncSuggestedCash] = useState<number>(0);
  const [syncInputCash, setSyncInputCash] = useState<number>(0);

  // Transaction Review / Confirmation Slate
  const [showReviewScreen, setShowReviewScreen] = useState(false);

  // Find unused types under this broker for US-ONBOARD-002
  const existingTypes = brokerSubaccounts.map(a => a.subAccountType || 'THUONG');
  const availableTypes: SubAccountType[] = (['THUONG', 'MARGIN', 'PHAI_SINH', 'TRAI_PHIEU'] as SubAccountType[])
    .filter(t => !existingTypes.includes(t));

  // Determine positions of the current active sub-account
  const subPositions = activeSubAccount 
    ? positions.filter(p => p.accountId === activeSubAccount.id)
    : [];

  // Formula computations
  const feeRateToUse = txFeeOverride !== '' ? parseFloat(txFeeOverride) : (activeSubAccount?.feeRate || 0.15);
  const rawTradeVal = txQty * txPrice;
  const computedFee = rawTradeVal * (feeRateToUse / 100);
  
  // Tax rate is ALWAYS fixed to 0.1% for SELLs (BR-001)
  const sellTaxRate = 0.1;
  const computedTax = txType === 'SELL' ? rawTradeVal * (sellTaxRate / 100) : 0;

  // net_amount = BUY: -(qty * price + fee) | SELL: qty * price - fee - tax (BR-001)
  const computedNetAmount = txType === 'BUY' 
    ? -(rawTradeVal + computedFee)
    : (rawTradeVal - computedFee - computedTax);

  // Estimate new WAC or Realized P&L
  let wacPreviewText = '';
  let realizedPnLPreview: number | null = null;
  let realizedPnLPercent = 0;

  const matchPos = txSymbol ? subPositions.find(p => p.stockSymbol.toUpperCase() === txSymbol.toUpperCase()) : null;

  if (txType === 'BUY' && activeSubAccount) {
    const isDerivative = activeSubAccount.subAccountType === 'PHAI_SINH';
    const multiplier = isDerivative ? 100000 : 1;
    const currentQty = matchPos ? matchPos.quantity : 0;
    const currentWac = matchPos ? matchPos.averageCostPrice : 0;
    
    const existingCostVal = currentQty * currentWac * multiplier;
    const buyCostVal = (txQty * txPrice * multiplier) + computedFee;
    const nextTotalQty = currentQty + txQty;
    const nextCostVal = existingCostVal + buyCostVal;
    const nextAvg = nextTotalQty > 0 ? (nextCostVal / multiplier) / nextTotalQty : 0;

    wacPreviewText = nextTotalQty > 0 
      ? `${formatVND(nextAvg)} (Gốc trước: ${formatVND(currentWac)})`
      : '—';
  } else if (txType === 'SELL' && matchPos) {
    // realized_pnl = (price - avg_cost) * sell_qty - fee_amount - tax_amount (BR-002)
    const costBasisUnit = matchPos.averageCostPrice;
    realizedPnLPreview = (txPrice - costBasisUnit) * txQty - computedFee - computedTax;
    realizedPnLPercent = (costBasisUnit * txQty) > 0 ? (realizedPnLPreview / (costBasisUnit * txQty)) * 100 : 0;
  }

  // Handle Add Sub-Account Form Submission
  const handleCreateSubAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubAccount) return;

    onAddAccount({
      name: `${brokerName} - ${newSubType === 'THUONG' ? 'Thường' : newSubType === 'MARGIN' ? 'Margin' : newSubType === 'PHAI_SINH' ? 'Phái Sinh' : 'Trái Phiếu'}`,
      broker: brokerName,
      cashBalance: newSubInitialCash,
      color: activeSubAccount.color,
      subAccountType: newSubType,
      feeRate: newSubFeeRate,
      taxRate: 0.1,
      isInitialLoaded: newSubInitialLoadStatus,
      transactions: []
    });

    setShowAddSubForm(false);
    setNewSubInitialCash(0);
  };

  // Handle Inline Fee Change Confirmation
  const handleSaveFeeRate = (subId: string) => {
    if (tempFeeRate < 0.01 || tempFeeRate > 1.0) {
      alert("Tỷ lệ phí giao dịch không hợp lệ (hợp lệ từ 0.01% đến 1.0%)");
      return;
    }
    onEditAccount(subId, { feeRate: tempFeeRate });
    setEditingFeeId(null);
  };

  // Pre-validate before showing Review screen (BR-004 Cash Balance check)
  const handleTriggerReview = () => {
    if (!txSymbol.trim()) {
      alert("Vui lòng cung cấp mã chứng khoán");
      return;
    }
    if (txQty <= 0 || txPrice <= 0) {
      alert("Số lượng và đơn giá phải lớn hơn 0");
      return;
    }

    // Auto-correction for Vietnamese thousand-VND stock/ETF units
    const isPhaiSinh = activeSubAccount?.subAccountType === 'PHAI_SINH';
    let finalPrice = txPrice;
    if (!isPhaiSinh && finalPrice < 1000 && finalPrice > 0) {
      finalPrice = finalPrice * 1000;
      setTxPrice(finalPrice);
    }

    // BR-006: Multiple constraints
    if (isPhaiSinh) {
      if (txQty % 1 !== 0) {
        alert("Đối với tiểu khoản phái sinh, số lượng số hợp đồng phải là nguyên số (bội số của 1)");
        return;
      }
    } else {
      if (txQty % 100 !== 0) {
        alert("Đối với cổ phiếu, lô giao dịch tối thiểu phải là bội số của 100");
        return;
      }
    }

    if (txType === 'SELL') {
      if (!matchPos) {
        alert("Mã chứng khoán không tồn tại trong danh mục tiểu khoản này");
        return;
      }
      if (txQty > matchPos.quantity) {
        alert(`Số lượng bán vượt quá số dư hiện có (${formatShares(matchPos.quantity)} CP)`);
        return;
      }
    }

    // BUY Cash validation: BR-004 Cash Ingress Guard
    if (txType === 'BUY' && activeSubAccount) {
      const buyTotalExpense = Math.abs(computedNetAmount);
      if (buyTotalExpense > activeSubAccount.cashBalance) {
        // Insufficient funds -> Open Cash Sync Dialog overlay
        setSyncSuggestedCash(buyTotalExpense);
        setSyncInputCash(buyTotalExpense);
        setShowCashSyncDialog(true);
        return;
      }
    }

    // All checks pass, direct to review
    setShowReviewScreen(true);
  };

  // Resolve Cash synchronization issue callback
  const handleConfirmCashSync = () => {
    if (syncInputCash < syncSuggestedCash) {
      alert(`Số dư thực tế mới phải lớn hơn hoặc bằng chi phí lệnh mua là ${formatVND(syncSuggestedCash)}`);
      return;
    }
    // Update sub-account cash balance on the air
    if (activeSubAccount) {
      onEditAccount(activeSubAccount.id, { cashBalance: syncInputCash });
      setShowCashSyncDialog(false);
      setShowReviewScreen(true);
    }
  };

  // Commit transaction to ledger
  const handleConfirmTransactionCommit = () => {
    if (!activeSubAccount) return;

    onRecordManualTransaction(activeSubAccount.id, {
      type: txType,
      symbol: txSymbol.toUpperCase().trim(),
      quantity: txQty,
      price: txPrice,
      feeRate: feeRateToUse,
      feeAmount: computedFee,
      taxRate: txType === 'SELL' ? sellTaxRate : 0,
      taxAmount: computedTax,
      netAmount: computedNetAmount,
      realizedPnL: realizedPnLPreview || 0,
      tradeDate: txDate,
      note: txNote
    });

    // Reset Trade form
    setShowReviewScreen(false);
    setShowTxForm(false);
    setTxSymbol('');
    setTxQty(0);
    setTxPrice(0);
    setTxNote('');
  };

  // Sub-account delete cascades to positions in parent App.tsx
  const handleRemoveSubAccount = (subId: string, typeName: string) => {
    if (brokerSubaccounts.length <= 1) {
      alert("Không thể xóa tiểu khoản duy nhất. Phải có ít nhất một tiểu khoản đầu tư.");
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa Tiểu khoản [${typeName}] thuộc ${brokerName}? Tất cả vị thế và lịch sử giao dịch thuộc tiểu khoản này sẽ mất vĩnh viễn.`)) {
      onDeleteAccount(subId);
      // Select another remaining sub-account
      const remaining = brokerSubaccounts.filter(a => a.id !== subId);
      if (remaining.length > 0) {
        setSelectedSubId(remaining[0].id);
      }
    }
  };

  return (
    <div id="account-manage-modal" className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-6 z-[100] animate-fade-in backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 select-none">
          <div className="flex items-center space-x-2">
            <span 
              className="w-3.5 h-3.5 rounded-full" 
              style={{ backgroundColor: activeSubAccount?.color || '#E02424' }}
            />
            <h2 className="text-sm font-bold text-zinc-150">Quản lý Tài khoản {brokerName}</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1.5 hover:bg-zinc-800 rounded-lg transition shrink-0 cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Main Grid */}
        <div className="p-5 md:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 leading-relaxed flex-1 scrollbar-thin">
          
          {/* Left Side: Sub accounts and General Configs (span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-zinc-500 uppercase font-black tracking-wider">Danh sách tiểu khoản hiện có</span>
                {!showAddSubForm && availableTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddSubForm(true)}
                    className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-md hover:bg-emerald-500/5 transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Thêm tiểu khoản</span>
                  </button>
                )}
              </div>

              {/* Add New Sub-Account Inline Form */}
              {showAddSubForm && (
                <form onSubmit={handleCreateSubAccount} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-3 text-xs animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <span className="font-bold text-zinc-200">Liên kết tiểu khoản mới</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddSubForm(false)} 
                      className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Sub Account Selector */}
                  <div className="space-y-1">
                    <label className="text-zinc-400 block font-medium">Phân loại tiểu khoản</label>
                    <select
                      value={newSubType}
                      onChange={(e) => setNewSubType(e.target.value as SubAccountType)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1.5 rounded-lg cursor-pointer text-xs"
                    >
                      {availableTypes.map(type => (
                        <option key={type} value={type}>{SUB_ACCOUNT_LABELS[type]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fee rate configuration */}
                  <div className="space-y-1">
                    <label className="text-zinc-400 block font-medium">Tỷ lệ phí giao dịch (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1.0"
                      required
                      value={newSubFeeRate}
                      onChange={(e) => setNewSubFeeRate(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-2 py-1.5 rounded-lg text-xs"
                    />
                  </div>

                  {/* Cash position allocation */}
                  <div className="space-y-1">
                    <label className="text-zinc-400 block font-medium">Tiền mặt khởi tạo ban đầu (VND)</label>
                    <input
                      type="number"
                      min="0"
                      value={newSubInitialCash}
                      onChange={(e) => setNewSubInitialCash(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-2 py-1.5 rounded-lg text-xs"
                    />
                  </div>

                  {/* Initial load mode selection */}
                  <div className="space-y-2">
                    <label className="text-zinc-400 block font-medium">Phương thức nạp danh mục ban đầu</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewSubInitialLoadStatus(true)}
                        className={`p-2 rounded-lg border text-center transition cursor-pointer text-[11px] ${
                          newSubInitialLoadStatus 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        Khởi tạo Trống (Nhập tay)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSubInitialLoadStatus(false)}
                        className={`p-2 rounded-lg border text-center transition cursor-pointer text-[11px] ${
                          !newSubInitialLoadStatus
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        Mở cổng Import (OCR / Excel)
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-550 italic">
                      {newSubInitialLoadStatus 
                        ? '• Tiểu khoản sẽ được coi là đã hoàn thành nạp danh mục gốc. Mọi lệnh sau này sử dụng mua/bán.' 
                        : '• Cho phép nạp OCR, Excel hoặc nhập hàng loạt duy nhất 01 lần tại mục Import Data chính.'
                      }
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-450 text-black py-2 rounded-lg font-bold text-center transition cursor-pointer mt-3"
                  >
                    Tạo tiểu khoản
                  </button>
                </form>
              )}

              {/* Subaccounts Cards List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto scrollbar-thin">
                {brokerSubaccounts.map(acc => {
                  const isCurActive = acc.id === selectedSubId;
                  const isEditingFee = editingFeeId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => !isEditingFee && setSelectedSubId(acc.id)}
                      className={`border p-4 rounded-xl transition flex flex-col justify-between hover:bg-zinc-850/20 ${
                        isCurActive 
                        ? 'border-emerald-500/40 bg-emerald-500/[0.02] shadow-sm' 
                        : 'border-zinc-800 bg-zinc-950/40 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`font-bold select-none text-xs ${isCurActive ? 'text-zinc-100' : 'text-zinc-350'}`}>
                            {acc.subAccountType === 'THUONG' ? 'TIỂU KHOẢN THƯỜNG (01)' : 
                             acc.subAccountType === 'MARGIN' ? 'TIỂU KHOẢN MARGIN (08)' : 
                             acc.subAccountType === 'PHAI_SINH' ? 'TIỂU KHOẢN PHÁI SINH (13)' : 'TIỂU KHOẢN TRÁI PHIẾU / ETF'}
                          </p>
                          <span className="font-mono text-[10px] text-zinc-550 block mt-1">
                            Mã kết nối: #{acc.id.substring(4, 9)}
                          </span>
                        </div>

                        {/* Delete sub-account button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSubAccount(acc.id, acc.subAccountType || 'THUONG');
                          }}
                          className="text-zinc-650 hover:text-red-400 p-1 rounded-sm hover:bg-red-500/5 transition cursor-pointer"
                          title="Xóa tiểu khoản"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Cash balances */}
                      <div className="mt-3 flex justify-between items-baseline border-t border-zinc-850/50 pt-2">
                        <span className="text-[10px] text-zinc-500 block">Số dư Cash khả dụng</span>
                        <p className="text-sm font-extrabold text-zinc-150 font-mono">
                          {formatVND(acc.cashBalance)}
                        </p>
                      </div>

                      {/* Fee configuration inline editor */}
                      <div className="mt-2 text-[10px] text-zinc-500 flex justify-between items-center">
                        <span>Biểu phí giao dịch</span>
                        {isEditingFee ? (
                          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max="1.0"
                              value={tempFeeRate}
                              onChange={(e) => setTempFeeRate(Number(e.target.value))}
                              className="w-12 bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono text-[9px] text-center px-1 py-0.5 rounded-sm"
                            />
                            <span className="text-zinc-400 font-mono font-bold">%</span>
                            <button
                              type="button"
                              onClick={() => handleSaveFeeRate(acc.id)}
                              className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-zinc-400 font-bold bg-zinc-850 px-1 py-0.5 rounded-sm">
                              {acc.feeRate || 0.15}%
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFeeId(acc.id);
                                setTempFeeRate(acc.feeRate || 0.15);
                              }}
                              className="text-zinc-650 hover:text-emerald-400 p-0.5"
                              title="Sửa biểu phí"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Ingestion Lock status indicator */}
                      <div className="mt-2 pt-1.5 border-t border-zinc-900 text-[10px] flex items-center space-x-1 justify-end">
                        {acc.isInitialLoaded ? (
                          <span className="flex items-center text-zinc-550 select-none">
                            <Lock className="h-2.5 w-2.5 mr-0.5" />
                            Lịch sử tự động tối ưu
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-500/80 animate-pulse select-none font-semibold">
                            <Unlock className="h-2.5 w-2.5 mr-0.5 text-amber-500" />
                            Chưa nạp vị thế gốc
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hold positions list in this subaccount */}
            <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-3">
              <span className="font-mono text-[10px] text-zinc-500 uppercase font-black tracking-wider block">Danh mục nắm giữ hiện tại</span>
              
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin text-xs text-zinc-300">
                {subPositions.map(pos => (
                  <div key={pos.id} className="flex justify-between items-center py-1.5 border-b border-zinc-900 last:border-0 font-sans">
                    <span className="font-extrabold text-zinc-200">{pos.stockSymbol}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-zinc-100">{formatShares(pos.quantity)} {pos.assetType === 'DERIVATIVE' ? 'HĐ' : 'CP'}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">Giá vốn: {formatVND(pos.averageCostPrice)}</span>
                    </div>
                  </div>
                ))}

                {subPositions.length === 0 && (
                  <p className="text-[10px] text-zinc-550 text-center py-4">Tiểu khoản đang trống (không nắm giữ mã nào)</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Side: Manual trade input and logs (span 7) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Quick Actions Panel */}
            {activeSubAccount && (
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 relative">
                
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-zinc-200 select-all tracking-wide uppercase font-mono">
                    Giao dịch khớp lệnh thủ công
                  </h3>
                  {!showTxForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTxForm(true);
                        setTxType('BUY');
                        setTxSymbol('');
                        setTxQty(0);
                        setTxPrice(0);
                        setTxNote('');
                        setTxDate(new Date().toISOString().split('T')[0]);
                        setShowReviewScreen(false);
                      }}
                      className="flex items-center space-x-1 text-xs bg-emerald-500 hover:bg-emerald-450 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Thêm Giao Dịch Mới</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTxForm(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Đóng Form nhập
                    </button>
                  )}
                </div>

                {/* Dynamic Entry Form */}
                {showTxForm && (
                  <div className="space-y-4 animate-fade-in text-xs border-t border-zinc-900 pt-4">
                    
                    {/* Trade direction select Buy/Sell */}
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 text-zinc-300 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="txType"
                          value="BUY"
                          checked={txType === 'BUY'}
                          onChange={() => {
                            setTxType('BUY');
                            setTxSymbol('');
                          }}
                          className="accent-emerald-500"
                        />
                        <span>MUA cổ phiếu / Khớp chỉ sổ</span>
                      </label>
                      <label className="flex items-center space-x-2 text-zinc-300 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="txType"
                          value="SELL"
                          checked={txType === 'SELL'}
                          onChange={() => {
                            setTxType('SELL');
                            // Auto-select first symbol from holdings if possible
                            if (subPositions.length > 0) {
                              setTxSymbol(subPositions[0].stockSymbol);
                            } else {
                              setTxSymbol('');
                            }
                          }}
                          className="accent-emerald-500"
                        />
                        <span>BÁN hạ tỷ trọng (Chốt lời/cắt lỗ)</span>
                      </label>
                    </div>

                    {!showReviewScreen && (
                      <div className="grid grid-cols-2 gap-4">
                        
                        {/* Token ticker */}
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block pb-0.5">Mã chứng khoán / HĐ phái sinh</label>
                          {txType === 'SELL' ? (
                            // Dropdown limit: BR-005 - select ONLY from owned codes in this subaccount
                            <select
                              value={txSymbol}
                              onChange={(e) => setTxSymbol(e.target.value)}
                              className="w-full px-3 py-2 border border-zinc-800 bg-zinc-900 text-zinc-100 rounded-xl cursor-not-allowed select-none"
                            >
                              <option value="">-- Chọn mã đang sở hữu --</option>
                              {subPositions.map(pos => (
                                <option key={pos.id + '-sel'} value={pos.stockSymbol}>
                                  {pos.stockSymbol} ({formatShares(pos.quantity)} CP)
                                </option>
                              ))}
                            </select>
                          ) : (
                            // Free manual input for BUY
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: VHM, HPG, FPT..."
                              value={txSymbol}
                              onChange={(e) => setTxSymbol(e.target.value.toUpperCase())}
                              className="w-full px-3 py-2 border border-zinc-800 bg-zinc-900 text-zinc-100 rounded-xl font-bold placeholder:text-zinc-600 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                            />
                          )}
                        </div>

                        {/* Trade volume */}
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block pb-0.5">
                            {activeSubAccount.subAccountType === 'PHAI_SINH' 
                              ? 'Số hợp đồng giao dịch' 
                              : 'Số lượng mua bán (Bội số lô 100)'
                            }
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={txQty || ''}
                            onChange={(e) => setTxQty(Number(e.target.value))}
                            placeholder={activeSubAccount.subAccountType === 'PHAI_SINH' ? 'Bội số của 1' : 'Hệ số lô 100, 200, 500...'}
                            className="w-full px-3 py-2 border border-zinc-800 bg-zinc-900 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Single unit price in VND */}
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block pb-0.5">
                            Đơn giá khớp (VND / Điểm chỉ số)
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={txPrice || ''}
                            onChange={(e) => setTxPrice(Number(e.target.value))}
                            placeholder="Ví dụ: 40500"
                            className="w-full px-3 py-2 border border-zinc-800 bg-zinc-900 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Trade execution date */}
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block pb-0.5">Ngày khớp giao dịch</label>
                          <input
                            type="date"
                            required
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-800 bg-zinc-900 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Form controls */}
                        <div className="col-span-2 pt-2 border-t border-zinc-900 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowTxForm(false)}
                            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl font-bold cursor-pointer transition text-center"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleTriggerReview}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl font-extrabold cursor-pointer transition shadow-xs"
                          >
                            Xem trước lênh
                          </button>
                        </div>

                      </div>
                    )}

                    {/* Step 2: Confirmation / Review view */}
                    {showReviewScreen && (
                      <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4 text-xs animate-fade-in">
                        <div className="flex items-center space-x-2 border-b border-zinc-900 pb-2.5">
                          <Receipt className="h-4 w-4 text-amber-500" />
                          <h4 className="font-bold text-zinc-150">Xác Nhận Lệnh {txType === 'BUY' ? 'MUA' : 'BÁN'}</h4>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 border-b border-zinc-900 pb-4">
                          
                          <div>
                            <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">Đồng mã</span>
                            <span className="font-bold text-sm text-zinc-100">{txSymbol}</span>
                          </div>

                          <div>
                            <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">Phân loại</span>
                            <span className="font-bold text-zinc-200">
                              {activeSubAccount.subAccountType === 'PHAI_SINH' ? 'Hợp đồng Tương lai' : 'Cổ phiếu niêm yết'}
                            </span>
                          </div>

                          <div>
                            <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">Số lượng khớp</span>
                            <span className="font-mono font-bold text-zinc-100">
                              {formatShares(txQty)} {activeSubAccount.subAccountType === 'PHAI_SINH' ? 'HĐ' : 'CP'}
                            </span>
                          </div>

                          <div>
                            <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">Đơn giá hợp đồng</span>
                            <span className="font-mono font-semibold text-zinc-100">{formatVND(txPrice)}</span>
                          </div>

                          <div>
                            <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">Tổng giá trị khớp</span>
                            <span className="font-mono font-semibold text-zinc-150">{formatVND(rawTradeVal)}</span>
                          </div>

                          <div>
                            <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">Phí giao dịch ({feeRateToUse}%)</span>
                            <span className="font-mono text-zinc-350">{formatVND(computedFee)}</span>
                          </div>

                          {txType === 'SELL' && (
                            <div>
                              <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">Thuế bán (0.1% cố định)</span>
                              <span className="font-mono text-zinc-350">{formatVND(computedTax)}</span>
                            </div>
                          )}

                          <div className="border-t border-zinc-900/60 pt-2.5 col-span-full grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono">
                                {txType === 'BUY' ? 'Số tiền thực tế phải chi' : 'Thực tế ròng nhận về'}
                              </span>
                              <p className={`font-mono text-base font-extrabold ${txType === 'BUY' ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatVND(Math.abs(computedNetAmount))}
                              </p>
                            </div>

                            {txType === 'BUY' ? (
                              <div>
                                <span className="text-emerald-400/90 block uppercase tracking-wide text-[9px] font-mono">WAC trung bình dự kiến</span>
                                <p className="font-mono text-sm font-bold text-zinc-100">{wacPreviewText}</p>
                              </div>
                            ) : (
                              <div>
                                <span className="text-emerald-400/90 block uppercase tracking-wide text-[9px] font-mono">Lợi nhuận thực hiện (Realized P&L)</span>
                                <p className={`font-mono text-sm font-extrabold ${realizedPnLPreview !== null && realizedPnLPreview >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {realizedPnLPreview !== null ? (
                                    <>
                                      {realizedPnLPreview >= 0 ? '+' : ''}{formatVND(realizedPnLPreview)}
                                      <span className="text-xs font-normal ml-1">({formatPercent(realizedPnLPercent)})</span>
                                    </>
                                  ) : '—'}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="col-span-full border-t border-zinc-900 pt-3">
                            <span className="text-zinc-500 block uppercase tracking-wide text-[9px] font-mono mb-1">Thay đổi cơ cấu tài khoản</span>
                            <div className="flex items-center space-x-6 text-[11px] text-zinc-400">
                              <p>• Tiền mặt: <span className="font-bold text-zinc-200">{formatVND(activeSubAccount.cashBalance)}</span> → <span className="font-bold text-emerald-400">{formatVND(activeSubAccount.cashBalance + computedNetAmount)}</span></p>
                              {matchPos && (
                                <p>• Sở hữu {txSymbol}: <span className="font-bold text-zinc-200">{formatShares(matchPos.quantity)} CP</span> → <span className="font-bold text-emerald-400">{formatShares(matchPos.quantity + (txType === 'BUY' ? txQty : -txQty))} CP</span></p>
                              )}
                            </div>
                          </div>

                        </div>

                        <div className="flex justify-end space-x-3 select-none pt-2">
                          <button
                            type="button"
                            onClick={() => setShowReviewScreen(false)}
                            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl font-bold cursor-pointer transition"
                          >
                            Sửa lệnh
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmTransactionCommit}
                            className="px-8 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-extrabold cursor-pointer transition shadow-xs"
                          >
                            Xác Nhận Khớp Lệnh
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* BR-004 Cash Sync Dialog popup */}
            {showCashSyncDialog && (
              <div className="bg-zinc-950 border border-amber-500/30 p-5 rounded-xl space-y-4 text-xs animate-fade-in relative z-50">
                <div className="flex items-start space-x-3 text-amber-400">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-200 text-sm">Cập Nhật Số Dư Thực Tế (Không Đủ Sức Mua!)</h4>
                    <p className="text-zinc-400 mt-1">
                      Tổng chi phí mua của lệnh là <strong className="text-zinc-100 font-mono">{formatVND(syncSuggestedCash)}</strong>, lớn hơn số dư tiền mặt của bạn trên Assetly ({formatVND(activeSubAccount?.cashBalance || 0)}). Vui lòng cập nhật số dư tiền thực tế khả dụng của bạn tại CTCK để khớp lệnh này.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-zinc-400 block font-semibold">Tỷ số khả dụng thực tế mới (VND)</label>
                  <input
                    type="number"
                    min={syncSuggestedCash}
                    value={syncInputCash || ''}
                    onChange={(e) => setSyncInputCash(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono font-bold text-sm px-3 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-550">Phải tối thiểu là {formatVND(syncSuggestedCash)} để khớp lệnh thành công.</p>
                </div>

                <div className="flex justify-end space-x-2 pt-2 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCashSyncDialog(false);
                      setShowReviewScreen(false);
                    }}
                    className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg cursor-pointer transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCashSync}
                    className="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-black font-extrabold rounded-lg cursor-pointer transition"
                  >
                    Xác nhận số dư mới
                  </button>
                </div>
              </div>
            )}

            {/* End of content */}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950/50 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-zinc-500 gap-4">
          <p>Dữ liệu giao dịch khớp lệnh được lưu trữ an toàn & bảo mật cục bộ.</p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold rounded-lg cursor-pointer transition shrink-0"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
}
