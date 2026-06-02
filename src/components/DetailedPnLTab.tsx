import React, { useState, useEffect } from 'react';
import { PortfolioPosition, BrokerageAccount } from '../types';
import { consolidatePositions, formatVND, formatShares, formatPercent, ConsolidateItem } from '../utils';
import { 
  BarChart2, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Search, 
  ShieldCheck, 
  Plus, 
  EditIcon, 
  AlertCircle,
  TrendingUp,
  Tag
} from 'lucide-react';

interface DetailedPnLTabProps {
  positions: PortfolioPosition[];
  accounts: BrokerageAccount[];
  onUpdateCostPrice: (accountId: string, symbol: string, currentPrice: number) => void;
  selectedBrokerFilter?: string;
  onBrokerFilterChange?: (broker: string) => void;
  newSymbols?: string[];
  onSeenSymbol?: (symbol: string) => void;
}

export default function DetailedPnLTab({
  positions,
  accounts,
  onUpdateCostPrice,
  selectedBrokerFilter = 'ALL',
  onBrokerFilterChange,
  newSymbols = [],
  onSeenSymbol,
}: DetailedPnLTabProps) {
  const [filterSymbol, setFilterSymbol] = useState('');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<'ALL' | 'EQUITY' | 'ETF' | 'DERIVATIVE'>('ALL');

  // Track expanded row symbols for multi-broker breakdown view
  const [expandedRowSymbols, setExpandedRowSymbols] = useState<Record<string, boolean>>({});

  // Inputs for editing cost bases
  const [modifyingSymbol, setModifyingSymbol] = useState<string | null>(null);
  const [modifyingAccountId, setModifyingAccountId] = useState<string>('');
  const [newCostValue, setNewCostValue] = useState<number>(0);

  const consolidated = consolidatePositions(positions, accounts);

  // Calculate total metrics for weight calculations
  const totalStockMkt = consolidated.reduce((acc, curr) => acc + curr.totalMarketValue, 0);
  const totalCash = accounts.reduce((acc, curr) => acc + curr.cashBalance, 0);
  const totalNAV = totalStockMkt + totalCash;

  // Dynamically extract only connected brokers from configured brokerage accounts
  const connectedBrokers = Array.from(new Set(accounts.map(acc => acc.broker))).filter(Boolean).sort();

  // Toggle expanding multi-broker details
  const toggleExpanded = (symbol: string) => {
    setExpandedRowSymbols(prev => ({
      ...prev,
      [symbol]: !prev[symbol]
    }));
  };

  // Filter application
  const filteredItems = consolidated.filter(item => {
    const matchSymbol = item.stockSymbol.toLowerCase().includes(filterSymbol.toLowerCase().trim());
    const matchAsset = selectedAssetFilter === 'ALL' || item.assetType === selectedAssetFilter;
    
    let matchBroker = true;
    if (selectedBrokerFilter !== 'ALL') {
      matchBroker = item.accountsBreakdown.some(b => b.brokerName === selectedBrokerFilter);
    }

    return matchSymbol && matchAsset && matchBroker;
  });

  const handleSaveCostBase = (symbol: string, accountId: string) => {
    if (newCostValue <= 0) return;
    onUpdateCostPrice(accountId, symbol, newCostValue);
    setModifyingSymbol(null);
  };

  return (
    <div id="detailed-pnl-tab" className="space-y-6 font-sans text-xs">
      
      {/* Search Filters header toolbar */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-550" />
          <input
            id="filter-ticker-input"
            type="text"
            placeholder="Tìm mã cổ phiếu (FPT, HPG...)"
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-555 font-semibold placeholder:text-zinc-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Asset filter */}
          <select
            id="filter-asset-select"
            value={selectedAssetFilter}
            onChange={(e) => setSelectedAssetFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-zinc-800 rounded-xl bg-zinc-950 text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-xs font-semibold cursor-pointer"
          >
            <option value="ALL" className="bg-zinc-950 text-zinc-100">Tất cả lớp tài sản</option>
            <option value="EQUITY" className="bg-zinc-950 text-zinc-100">Cổ phiếu niêm yết</option>
            <option value="ETF" className="bg-zinc-950 text-zinc-100">Quỹ chỉ số (ETF)</option>
            <option value="DERIVATIVE" className="bg-zinc-950 text-zinc-100">Chứng khoán Phái sinh</option>
          </select>

          {/* Broker filter */}
          <select
            id="filter-broker-select"
            value={selectedBrokerFilter}
            onChange={(e) => onBrokerFilterChange?.(e.target.value)}
            className="px-3 py-1.5 border border-zinc-800 rounded-xl bg-zinc-950 text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-xs font-semibold cursor-pointer"
          >
            <option value="ALL" className="bg-zinc-950 text-zinc-100">Tất cả CTCK</option>
            {connectedBrokers.map(broker => (
              <option key={broker} value={broker} className="bg-zinc-950 text-zinc-100">
                {broker} Securities
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Main Aggregation Detailed Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800/60">
            <thead>
              <tr className="bg-zinc-900/20 text-zinc-500 text-left font-mono text-[10px] uppercase tracking-wider">
                <th className="px-6 py-3">Mã chứng khoán</th>
                <th className="px-6 py-3 text-right">Tổng số lượng</th>
                <th className="px-6 py-3 text-right">Giá vốn gia quyền (VND)</th>
                <th className="px-6 py-3 text-right">Giá thị trường (VND)</th>
                <th className="px-6 py-3 text-right">Giá trị gốc sở hữu</th>
                <th className="px-6 py-3 text-right">Giá trị thị trường</th>
                <th className="px-6 py-3 text-right">Lãi / Lỗ (VND)</th>
                <th className="px-6 py-3 text-right">% P&L</th>
                <th className="px-6 py-3 text-right">Tỷ trọng (% NAV)</th>
                <th className="px-6 py-3 text-center">Tài khoản giữ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 bg-zinc-900/10 font-sans text-xs">
              {filteredItems.map((item, idx) => {
                const isExpanded = expandedRowSymbols[item.stockSymbol] || false;
                const hasMultipleAccounts = item.accountsBreakdown.length > 1;

                let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
                if (item.assetType === 'ETF') {
                  badgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/15";
                } else if (item.assetType === 'DERIVATIVE') {
                  badgeColor = "bg-amber-500/10 text-amber-400 border-amber-550/15";
                }

                return (
                  <React.Fragment key={idx}>
                    {/* Primary Consolidated Row */}
                    <tr 
                      className={`hover:bg-zinc-850/45 transition cursor-pointer ${isExpanded ? 'bg-zinc-900/50' : ''}`}
                      onClick={() => {
                        toggleExpanded(item.stockSymbol);
                        if (newSymbols.includes(item.stockSymbol.toUpperCase())) {
                          onSeenSymbol?.(item.stockSymbol);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${badgeColor}`}>
                            {item.stockSymbol}
                          </span>
                          {newSymbols.includes(item.stockSymbol.toUpperCase()) && (
                            <span className="bg-emerald-500 text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded-full select-none animate-pulse shrink-0 tracking-wider">
                              NEW
                            </span>
                          )}
                          {hasMultipleAccounts && (
                            <span className="bg-teal-500/10 text-teal-400 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border border-teal-500/15">
                              Đa rổ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-semibold text-zinc-200">
                        {formatShares(item.totalQuantity)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-zinc-400">
                        {item.weightedAvgPrice === 0 ? (
                          <span className="text-amber-450 font-bold font-sans">N/A - Thiếu giá vốn</span>
                        ) : item.assetType === 'DERIVATIVE' ? (
                          item.weightedAvgPrice.toFixed(1)
                        ) : (
                          formatVND(item.weightedAvgPrice, false)
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-zinc-400">
                        {item.assetType === 'DERIVATIVE' ? item.currentPrice.toFixed(1) : formatVND(item.currentPrice, false)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-zinc-500">
                        {formatVND(item.totalCostValue)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold text-zinc-200">
                        {formatVND(item.totalMarketValue)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center font-mono font-bold text-xs ${
                          item.totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {item.totalUnrealizedPL >= 0 ? '+' : ''}{formatVND(item.totalUnrealizedPL, true)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className={`font-mono font-extrabold text-sm ${
                          item.totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {item.totalUnrealizedPL >= 0 ? '+' : ''}{formatPercent(item.totalUnrealizedPLPct)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold text-zinc-200">
                        {totalNAV > 0 ? formatPercent((item.totalMarketValue / totalNAV) * 100) : '0.00%'}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {hasMultipleAccounts ? (
                            <div className="flex items-center text-zinc-500 hover:text-emerald-400 transition">
                              <span className="mr-1 text-[10px] font-mono">Xem {item.accountsBreakdown.length} CTCK</span>
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </div>
                          ) : (
                            <span className="font-semibold text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-0.5 rounded-md">
                              {item.accountsBreakdown[0]?.brokerName}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Sub-table discrete breakdown level if expanded or has multiple brokers */}
                    {isExpanded && (
                      <tr className="bg-zinc-950/20">
                        <td colSpan={10} className="px-8 py-3 bg-zinc-950/40 border-t border-b border-zinc-800/65">
                          <div className="space-y-3 pt-1">
                            <p className="font-bold text-zinc-200 text-[11px] flex items-center space-x-1">
                              <Activity className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span>Mã {item.stockSymbol} tại các tài khoản:</span>
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                              {item.accountsBreakdown.map((breakdownAcc, bIdx) => {
                                const isEditingCost = modifyingSymbol === item.stockSymbol && modifyingAccountId === breakdownAcc.accountId;

                                return (
                                  <div 
                                    key={bIdx}
                                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-bold text-zinc-200 text-xs">{breakdownAcc.accountName}</p>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Môi giới: {breakdownAcc.brokerName}</p>
                                      </div>

                                      <span className="font-semibold px-2 py-0.5 bg-zinc-850 border border-zinc-750 text-[10px] text-zinc-300 rounded-sm">
                                        SL: {formatShares(breakdownAcc.quantity)}
                                      </span>
                                    </div>

                                    {/* Cost Price values */}
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] border-t border-zinc-800/60 pt-2.5">
                                      <div>
                                        <p className="text-zinc-500">Giá vốn:</p>
                                        
                                        {isEditingCost ? (
                                          <div className="flex items-center space-x-1 mt-1">
                                            <input
                                              id={`editing-cost-val-${bIdx}`}
                                              type="number"
                                              value={newCostValue}
                                              onChange={(e) => setNewCostValue(Number(e.target.value))}
                                              className="w-24 px-1.5 py-0.5 bg-zinc-950 text-zinc-100 border border-zinc-700 rounded-sm"
                                            />
                                            <button
                                              onClick={() => handleSaveCostBase(item.stockSymbol, breakdownAcc.accountId)}
                                              className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-450 text-black rounded-md text-[9px] cursor-pointer font-bold"
                                            >
                                              Lưu
                                            </button>
                                          </div>
                                        ) : breakdownAcc.averageCostPrice === 0 ? (
                                          <div className="mt-1 flex items-center space-x-1 text-red-400">
                                            <span>Chưa có giá vốn</span>
                                            <button
                                              onClick={() => {
                                                setModifyingSymbol(item.stockSymbol);
                                                setModifyingAccountId(breakdownAcc.accountId);
                                                setNewCostValue(0);
                                              }}
                                              className="p-1 hover:bg-zinc-800 rounded-md text-emerald-400 cursor-pointer"
                                              title="Thêm giá mua gốc"
                                            >
                                              <Plus className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center space-x-1 mt-1">
                                            <span className="font-bold font-mono text-zinc-200">
                                              {item.assetType === 'DERIVATIVE' ? breakdownAcc.averageCostPrice.toFixed(1) : formatVND(breakdownAcc.averageCostPrice)}
                                            </span>
                                            <button
                                              onClick={() => {
                                                setModifyingSymbol(item.stockSymbol);
                                                setModifyingAccountId(breakdownAcc.accountId);
                                                setNewCostValue(breakdownAcc.averageCostPrice);
                                              }}
                                              className="text-zinc-500 hover:text-emerald-400 p-0.5 cursor-pointer rounded-xs transition"
                                              title="Sửa giá vốn"
                                            >
                                              <Tag className="h-2.5 w-2.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      <div className="text-right">
                                        <p className="text-zinc-500">Lãi / Lỗ trạng thái:</p>
                                        <p className={`font-bold font-mono mt-1 text-[11px] ${
                                          breakdownAcc.unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                          {breakdownAcc.unrealizedPL >= 0 ? '+' : ''}{formatVND(breakdownAcc.unrealizedPL)} ({formatPercent(breakdownAcc.unrealizedPLPct)})
                                        </p>
                                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                          Tỷ trọng / NAV: <strong className="text-zinc-350">
                                            {(() => {
                                              let itemMktVal = breakdownAcc.quantity * item.currentPrice;
                                              if (item.assetType === 'DERIVATIVE') {
                                                itemMktVal = breakdownAcc.quantity * item.currentPrice * 100000;
                                              }
                                              return totalNAV > 0 ? formatPercent((itemMktVal / totalNAV) * 100) : '0.00%';
                                            })()}
                                          </strong>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-zinc-550">
                    <Search className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                    <p className="font-semibold text-xs text-zinc-300">Không tìm thấy mã tài sản khớp bộ lọc</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-sans">Vui lòng thử điều chỉnh lại từ khóa hoặc danh sách Công ty chứng khoán.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
