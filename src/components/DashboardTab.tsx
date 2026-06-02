import React, { useState } from 'react';
import { PortfolioPosition, BrokerageAccount, AlertRule, MarketAsset } from '../types';
import { consolidatePositions, formatVND, formatShares, formatPercent } from '../utils';
import { 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  Briefcase, 
  Users, 
  AlertCircle, 
  Bookmark, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Coins, 
  Database,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardTabProps {
  positions: PortfolioPosition[];
  accounts: BrokerageAccount[];
  marketAssets: MarketAsset[];
  onNavigateToTab: (tabName: string) => void;
  staleCount: number;
  newSymbols?: string[];
  onSeenSymbol?: (symbol: string) => void;
}

export default function DashboardTab({
  positions,
  accounts,
  marketAssets,
  onNavigateToTab,
  staleCount,
  newSymbols = [],
  onSeenSymbol,
}: DashboardTabProps) {
  
  // Local state for interactive details toggles
  const [expandedBrokers, setExpandedBrokers] = useState<Record<string, boolean>>({});
  const [expandedAssetTypes, setExpandedAssetTypes] = useState<Record<string, boolean>>({});
  const [expandedStocks, setExpandedStocks] = useState<Record<string, boolean>>({});

  // Interactive state for visual progress bar touch/taps
  const [activeBrokerIdx, setActiveBrokerIdx] = useState<number | null>(null);
  const [activeAssetIdx, setActiveAssetIdx] = useState<number | null>(null);
  
  // Consolidate positions with market price and broker accounts
  const consolidated = consolidatePositions(positions, accounts);

  // Calculate Asset Allocation by Broker
  const totalCash = accounts.reduce((acc, curr) => acc + curr.cashBalance, 0);
  const totalStockMarketValue = consolidated.reduce((acc, curr) => acc + curr.totalMarketValue, 0);
  const totalNAV = totalStockMarketValue + totalCash;

  // Calculate P&L aggregates
  const totalCost = consolidated.reduce((acc, curr) => acc + curr.totalCostValue, 0);
  const totalUnrealizedPL = totalNAV - (totalCost + totalCash); // Total unrealized profit is asset gain
  const totalUnrealizedPLPct = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;

  // Calculate total realized P&L from transactions of all sub-accounts
  let totalRealizedPL = 0;
  accounts.forEach(acc => {
    if (acc.transactions) {
      acc.transactions.forEach(tx => {
        if (tx.type === 'SELL') {
          totalRealizedPL += tx.realizedPnL;
        }
      });
    }
  });

  // Calculate Daily P&L (Change from previous close)
  let dailyPL = 0;
  consolidated.forEach(pos => {
    const marketAsset = marketAssets.find(ma => ma.symbol === pos.stockSymbol);
    if (marketAsset) {
      if (pos.assetType === 'DERIVATIVE') {
        const valueChange = pos.totalQuantity * marketAsset.change * 100000;
        dailyPL += valueChange;
      } else {
        const valueChange = pos.totalQuantity * marketAsset.change;
        dailyPL += valueChange;
      }
    }
  });
  const dailyPLPercent = (totalNAV - dailyPL) > 0 ? (dailyPL / (totalNAV - dailyPL)) * 100 : 0;

  // Broker allocations calculation
  const brokerMap = new Map<string, number>();
  // Initialize cash values first
  accounts.forEach(acc => {
    brokerMap.set(acc.broker, (brokerMap.get(acc.broker) || 0) + acc.cashBalance);
  });
  // Add market values
  positions.forEach(pos => {
    const acc = accounts.find(a => a.id === pos.accountId);
    if (acc) {
      let val = pos.quantity * pos.currentPrice;
      if (pos.assetType === 'DERIVATIVE') {
        val = pos.quantity * pos.currentPrice * 100000;
      }
      brokerMap.set(acc.broker, (brokerMap.get(acc.broker) || 0) + val);
    }
  });

  const brokerAllocations = Array.from(brokerMap.entries()).map(([broker, value]) => ({
    broker,
    value,
    percentage: totalNAV > 0 ? (value / totalNAV) * 100 : 0
  })).sort((a,b) => b.value - a.value);

  // Asset type allocations calculation
  const assetTypeMap = new Map<string, number>();
  assetTypeMap.set("Tiềm mặt (Cash)", totalCash);
  consolidated.forEach(pos => {
    const label = pos.assetType === 'EQUITY' ? 'Cổ phiếu niêm yết' : pos.assetType === 'ETF' ? 'Quỹ chỉ số (ETF)' : 'Chứng khoán Phái sinh';
    assetTypeMap.set(label, (assetTypeMap.get(label) || 0) + pos.totalMarketValue);
  });

  const assetTypeAllocations = Array.from(assetTypeMap.entries()).map(([label, value]) => ({
    label,
    value,
    percentage: totalNAV > 0 ? (value / totalNAV) * 100 : 0
  })).sort((a,b) => b.value - a.value);

  // Color mappings for modern charts
  const brokerColors: Record<string, string> = {
    SSI: 'bg-red-500',
    VPS: 'bg-yellow-500',
    TCBS: 'bg-blue-600',
    MBS: 'bg-violet-600',
    Pinetree: 'bg-emerald-500',
    Khác: 'bg-gray-400'
  };

  const assetColors: Record<string, string> = {
    'Tiềm mặt (Cash)': 'bg-zinc-600',
    'Cổ phiếu niêm yết': 'bg-emerald-500',
    'Quỹ chỉ số (ETF)': 'bg-blue-500',
    'Chứng khoán Phái sinh': 'bg-amber-500',
  };

  return (
    <div 
      id="dashboard-tab" 
      className="space-y-6"
      onClick={() => {
        setActiveBrokerIdx(null);
        setActiveAssetIdx(null);
      }}
    >
      
      {/* 1. Alerts Banner block */}
      {staleCount > 0 && (
        <div id="stale-accounts-banner" className="bg-amber-950/20 border border-amber-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in text-xs">
          <div className="flex items-center space-x-3 text-amber-350">
            <AlertCircle className="h-5 w-5 text-amber-550 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-semibold text-amber-100">
                Phát hiện {staleCount} tài khoản vị thế chưa đồng bộ gần đây
              </p>
              <p className="text-xs text-amber-400">
                Để dữ liệu P&L và Phân bổ tài sản chính xác, bạn nên thường xuyên đồng bộ hóa hoặc trích xuất lại danh mục mới.
              </p>
            </div>
          </div>
          <button
            id="stale-sync-now-btn"
            onClick={() => onNavigateToTab('accounts')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-450 text-black rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap"
          >
            Đồng bộ ngay
          </button>
        </div>
      )}

      {/* 2. Key Aggregate Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total NAV Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-6 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className="absolute right-4 top-4 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <p className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Tổng giá trị tài sản (NAV)</p>
          <p className="text-xl md:text-2xl font-extrabold text-zinc-100 mt-2 font-sans tracking-tight select-all whitespace-nowrap truncate">{formatVND(totalNAV)}</p>
          
          <div className="flex items-center space-x-4 mt-6 text-xs border-t border-zinc-800/60 pt-3">
            <div>
              <span className="text-zinc-500">Vị thế:</span>
              <span className="ml-1 font-semibold text-zinc-350">{formatVND(totalStockMarketValue)}</span>
            </div>
            <div className="border-l border-zinc-800/40 pl-4">
              <span className="text-zinc-500">Tiền mặt:</span>
              <span className="ml-1 font-semibold text-zinc-350">{formatVND(totalCash)}</span>
            </div>
          </div>
        </div>

        {/* Daily P&L Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-6 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className={`absolute right-4 top-4 p-2.5 rounded-xl border ${
            dailyPL >= 0 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {dailyPL >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          </div>
          <p className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Lãi/Lỗ trong ngày</p>
          <p className={`text-xl md:text-2xl font-extrabold mt-2 font-sans tracking-tight select-all whitespace-nowrap truncate ${
            dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {dailyPL >= 0 ? '+' : ''}{formatVND(dailyPL)}
          </p>

          <div className="flex items-center space-x-2 mt-6 text-xs border-t border-zinc-800/60 pt-3">
            <span className="text-zinc-500">Phiên hôm nay:</span>
            <span className={`font-mono font-bold ${dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(dailyPLPercent)}
            </span>
          </div>
        </div>

        {/* Total Unrealized P&L Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-6 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className={`absolute right-4 top-4 p-2.5 rounded-xl border ${
            totalUnrealizedPL >= 0
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Lãi/Lỗ chưa thực hiện</p>
          <p className={`text-xl md:text-2xl font-extrabold mt-2 font-sans tracking-tight select-all whitespace-nowrap truncate ${
            totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {totalUnrealizedPL >= 0 ? '+' : ''}{formatVND(totalUnrealizedPL)}
          </p>

          <div className="flex items-center space-x-2 mt-6 text-xs border-t border-zinc-800/60 pt-3">
            <span className="text-zinc-500">Kỳ vọng:</span>
            <span className={`font-mono font-bold ${totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(totalUnrealizedPLPct)}
            </span>
          </div>
        </div>

        {/* Total Realized P&L Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-6 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className={`absolute right-4 top-4 p-2.5 rounded-xl border ${
            totalRealizedPL >= 0
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <TrendingUp className="h-5 w-5 text-sky-400 border-sky-500/20" />
          </div>
          <p className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Tổng P&L đã thực hiện</p>
          <p className={`text-xl md:text-2xl font-extrabold mt-2 font-sans tracking-tight select-all whitespace-nowrap truncate ${
            totalRealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {totalRealizedPL >= 0 ? '+' : ''}{formatVND(totalRealizedPL)}
          </p>

          <div className="flex items-center space-x-2 mt-6 text-xs border-t border-zinc-800/60 pt-3">
            <span className="text-zinc-400">Lãi/Lỗ thực tính sau thuế & phí</span>
          </div>
        </div>

      </div>

      {/* 3. Visual Portfolio Distribution Analytics (Bento Layout style) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Allocation by Broker Component */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-6 rounded-2xl shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <PieChart className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Tỷ trọng tài sản theo Công ty Chứng khoán</h3>
          </div>
          
          {/* Custom clean CSS multi-colored linear bar with touch tooltips */}
          <div className="relative mb-6 select-none" onClick={(e) => e.stopPropagation()}>
            {/* Tooltip centered on the touched/active segment */}
            {activeBrokerIdx !== null && (
              (() => {
                let cumulative = 0;
                let activeItem = null;
                for (let i = 0; i < brokerAllocations.length; i++) {
                  const val = brokerAllocations[i].value;
                  if (val > 0) {
                    if (i === activeBrokerIdx) {
                      activeItem = {
                        ...brokerAllocations[i],
                        center: cumulative + brokerAllocations[i].percentage / 2
                      };
                      break;
                    }
                    cumulative += brokerAllocations[i].percentage;
                  }
                }
                if (!activeItem) return null;
                return (
                  <div 
                    style={{ left: `${activeItem.center}%` }}
                    className="absolute -top-10 -translate-x-1/2 bg-zinc-950/95 text-white font-sans text-[11px] font-bold px-2.5 py-1 rounded-xl border border-zinc-700/60 shadow-xl whitespace-nowrap animate-fade-in z-20 flex items-center space-x-1.5 transition-all duration-300 pointer-events-none select-none"
                  >
                    <span className={`w-2 h-2 rounded-full ${brokerColors[activeItem.broker] || 'bg-zinc-400'}`} />
                    <span>{activeItem.broker}:</span>
                    <span className="text-emerald-400 font-extrabold">{activeItem.percentage.toFixed(1)}%</span>
                  </div>
                );
              })()
            )}

            {/* Visual multi-colored bar */}
            <div className="h-6 w-full rounded-full overflow-hidden flex bg-zinc-850 font-sans border border-zinc-800/40 relative">
              {brokerAllocations.map((item, idx) => {
                if (item.value <= 0) return null;
                const colorClass = brokerColors[item.broker] || 'bg-zinc-400';
                const isSelected = activeBrokerIdx === idx;
                return (
                  <div 
                    key={idx} 
                    style={{ width: `${item.percentage}%` }}
                    className={`${colorClass} h-full transition-all duration-300 relative flex items-center justify-center cursor-pointer select-none ${
                      isSelected ? 'ring-2 ring-white/40 brightness-110 z-10 scale-y-110' : 'opacity-90 hover:opacity-100 hover:brightness-105'
                    }`}
                    onMouseEnter={() => setActiveBrokerIdx(idx)}
                    onMouseLeave={() => setActiveBrokerIdx(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBrokerIdx(prev => prev === idx ? null : idx);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveBrokerIdx(idx);
                    }}
                    title={`${item.broker}: ${formatPercent(item.percentage)}`}
                  >
                    {item.percentage >= 8 && (
                      <span className={`text-[10px] font-extrabold text-white px-0.5 leading-none select-none pointer-events-none truncate drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] transition ${
                        isSelected ? 'scale-115 font-black text-white' : 'opacity-85'
                      }`}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divide-y divide-zinc-900/60">
            {brokerAllocations.map((item, idx) => {
              const belongsAccounts = accounts.filter(acc => acc.broker === item.broker);
              const isExpanded = expandedBrokers[item.broker] || false;

              // Compute total P&L for this broker
              const brokerPositions = positions.filter(pos => {
                const acc = accounts.find(a => a.id === pos.accountId);
                return acc && acc.broker === item.broker;
              });

              const brokerMarketValue = brokerPositions.reduce((sum, pos) => {
                let val = pos.quantity * pos.currentPrice;
                if (pos.assetType === 'DERIVATIVE') {
                  val = pos.quantity * pos.currentPrice * 100000;
                }
                return sum + val;
              }, 0);

              const brokerCostValue = brokerPositions.reduce((sum, pos) => {
                let val = pos.quantity * pos.averageCostPrice;
                if (pos.assetType === 'DERIVATIVE') {
                  val = pos.quantity * pos.averageCostPrice * 100000;
                }
                return sum + val;
              }, 0);

              const brokerPL = brokerMarketValue - brokerCostValue;
              const brokerPLPct = brokerCostValue > 0 ? (brokerPL / brokerCostValue) * 100 : 0;

              return (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                  <div 
                    onClick={() => setExpandedBrokers(prev => ({ ...prev, [item.broker]: !isExpanded }))}
                    className="flex justify-between items-center text-xs cursor-pointer select-none hover:text-zinc-100 transition group py-1"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${brokerColors[item.broker] || 'bg-zinc-500'}`}></span>
                      <span className="font-bold text-zinc-300 group-hover:text-emerald-400 transition flex items-center space-x-1.5">
                        <span>{item.broker}</span>
                        <span className="text-[10px] text-zinc-500 font-normal">({belongsAccounts.length} tài khoản)</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-zinc-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-zinc-400" />
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {brokerPositions.length > 0 && (
                        <span className={`font-mono text-[10.5px] font-bold ${
                          brokerPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {brokerPL >= 0 ? '+' : ''}{formatVND(brokerPL, true)} ({brokerPLPct.toFixed(1)}%)
                        </span>
                      )}
                      <span className="text-zinc-500 font-mono hidden sm:inline">{formatVND(item.value)}</span>
                      <span className="font-mono font-extrabold text-zinc-200 bg-zinc-800/40 px-1.5 py-0.5 rounded-sm">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Sub-accounts details list */}
                  {isExpanded && belongsAccounts.length > 0 && (
                    <div className="mt-2.5 pl-4 border-l border-zinc-800 space-y-2 animate-fade-in text-[10px] sm:text-[11px] mb-1">
                      {belongsAccounts.map(acc => {
                        const accPositions = positions.filter(pos => pos.accountId === acc.id);
                        
                        const stockMarketValue = accPositions.reduce((sum, pos) => {
                          let val = pos.quantity * pos.currentPrice;
                          if (pos.assetType === 'DERIVATIVE') {
                            val = pos.quantity * pos.currentPrice * 100000;
                          }
                          return sum + val;
                        }, 0);

                        const stockCostValue = accPositions.reduce((sum, pos) => {
                          let val = pos.quantity * pos.averageCostPrice;
                          if (pos.assetType === 'DERIVATIVE') {
                            val = pos.quantity * pos.averageCostPrice * 100000;
                          }
                          return sum + val;
                        }, 0);

                        const accNAV = stockMarketValue + acc.cashBalance;
                        const accUnrealizedPL = stockMarketValue - stockCostValue;
                        const accUnrealizedPLPct = stockCostValue > 0 ? (accUnrealizedPL / stockCostValue) * 100 : 0;
                        const accWeight = totalNAV > 0 ? (accNAV / totalNAV) * 100 : 0;

                        return (
                          <div key={acc.id} className="bg-zinc-950/20 rounded-xl p-2.5 border border-zinc-900/60 flex flex-col space-y-1.5 hover:bg-zinc-900/20 transition">
                            <div className="flex justify-between items-center font-bold text-zinc-200 text-xs">
                              <span className="text-zinc-300 font-semibold">{acc.name}</span>
                              <span className="font-mono text-zinc-400 font-bold">{accWeight.toFixed(1)}%</span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-500 font-mono">
                              <div className="flex justify-between">
                                <span>Tiền mặt:</span>
                                <span className="font-semibold text-zinc-400">{formatVND(acc.cashBalance, false)}đ</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Giá trị CP:</span>
                                <span className="font-semibold text-zinc-400">{formatVND(stockMarketValue, false)}đ</span>
                              </div>
                            </div>

                            {/* Profit Loss detail */}
                            <div className="flex justify-between items-center pt-1.5 border-t border-zinc-900/50">
                              <span className="text-zinc-500 text-[10px] font-sans">Lãi/Lỗ hiện nay:</span>
                              <span className={`font-mono font-bold flex items-center space-x-1 ${
                                accUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                <span>{accUnrealizedPL >= 0 ? '+' : ''}{formatVND(accUnrealizedPL, true)}</span>
                                <span className="text-[9px] font-normal">({accUnrealizedPLPct.toFixed(1)}%)</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {brokerAllocations.length === 0 && (
              <div className="text-center py-6 text-xs text-zinc-500">Hãy thêm tài khoản chứng khoán để xem phân bổ tài sản.</div>
            )}
          </div>
        </div>

        {/* Allocation by Asset Type */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-6 rounded-2xl shadow-xs">
          <div className="flex items-center space-x-2 mb-4">
            <Coins className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Cơ cấu danh mục theo Loại Tài sản</h3>
          </div>

          {/* Combined Visual Track bar with touch tooltips */}
          <div className="relative mb-6 select-none" onClick={(e) => e.stopPropagation()}>
            {/* Tooltip centered on the touched/active segment */}
            {activeAssetIdx !== null && (
              (() => {
                let cumulative = 0;
                let activeItem = null;
                for (let i = 0; i < assetTypeAllocations.length; i++) {
                  const val = assetTypeAllocations[i].value;
                  if (val > 0) {
                    if (i === activeAssetIdx) {
                      activeItem = {
                        ...assetTypeAllocations[i],
                        center: cumulative + assetTypeAllocations[i].percentage / 2
                      };
                      break;
                    }
                    cumulative += assetTypeAllocations[i].percentage;
                  }
                }
                if (!activeItem) return null;
                return (
                  <div 
                    style={{ left: `${activeItem.center}%` }}
                    className="absolute -top-10 -translate-x-1/2 bg-zinc-950/95 text-white font-sans text-[11px] font-bold px-2.5 py-1 rounded-xl border border-zinc-700/60 shadow-xl whitespace-nowrap animate-fade-in z-20 flex items-center space-x-1.5 transition-all duration-300 pointer-events-none select-none"
                  >
                    <span className={`w-2 h-2 rounded-full ${assetColors[activeItem.label] || 'bg-teal-500'}`} />
                    <span>{activeItem.label}:</span>
                    <span className="text-emerald-400 font-extrabold">{activeItem.percentage.toFixed(1)}%</span>
                  </div>
                );
              })()
            )}

            {/* Visual multi-colored bar */}
            <div className="h-6 w-full rounded-full overflow-hidden flex bg-zinc-850 font-sans border border-zinc-800/40 relative">
              {assetTypeAllocations.map((item, idx) => {
                if (item.value <= 0) return null;
                const colorClass = assetColors[item.label] || 'bg-teal-500';
                const isSelected = activeAssetIdx === idx;
                return (
                  <div 
                    key={idx} 
                    style={{ width: `${item.percentage}%` }}
                    className={`${colorClass} h-full transition-all duration-300 relative flex items-center justify-center cursor-pointer select-none ${
                      isSelected ? 'ring-2 ring-white/40 brightness-110 z-10 scale-y-110' : 'opacity-90 hover:opacity-100 hover:brightness-105'
                    }`}
                    onMouseEnter={() => setActiveAssetIdx(idx)}
                    onMouseLeave={() => setActiveAssetIdx(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAssetIdx(prev => prev === idx ? null : idx);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveAssetIdx(idx);
                    }}
                    title={`${item.label}: ${formatPercent(item.percentage)}`}
                  >
                    {item.percentage >= 8 && (
                      <span className={`text-[10px] font-extrabold text-white px-0.5 leading-none select-none pointer-events-none truncate drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] transition ${
                        isSelected ? 'scale-115 font-black text-white' : 'opacity-85'
                      }`}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divide-y divide-zinc-900/60">
            {assetTypeAllocations.map((item, idx) => {
              const isExpanded = expandedAssetTypes[item.label] || false;

              // Compute broker-level breakdown for this specific asset type
              const brokerBreakdown: { broker: string; value: number }[] = [];

              if (item.label === 'Tiềm mặt (Cash)') {
                const cashMap = new Map<string, number>();
                accounts.forEach(acc => {
                  cashMap.set(acc.broker, (cashMap.get(acc.broker) || 0) + acc.cashBalance);
                });
                cashMap.forEach((val, brk) => {
                  if (val > 0) {
                    brokerBreakdown.push({ broker: brk, value: val });
                  }
                });
              } else {
                const correspondingType = 
                  item.label === 'Cổ phiếu niêm yết' 
                    ? 'EQUITY' 
                    : item.label === 'Quỹ chỉ số (ETF)' 
                      ? 'ETF' 
                      : 'DERIVATIVE';
                
                const filteredPos = positions.filter(pos => pos.assetType === correspondingType);
                const typeMap = new Map<string, number>();

                filteredPos.forEach(pos => {
                  const acc = accounts.find(a => a.id === pos.accountId);
                  if (acc) {
                    let val = pos.quantity * pos.currentPrice;
                    if (pos.assetType === 'DERIVATIVE') {
                      val = pos.quantity * pos.currentPrice * 100000;
                    }
                    typeMap.set(acc.broker, (typeMap.get(acc.broker) || 0) + val);
                  }
                });

                typeMap.forEach((val, brk) => {
                  if (val > 0) {
                    brokerBreakdown.push({ broker: brk, value: val });
                  }
                });
              }

              // Sort cascading
              brokerBreakdown.sort((a, b) => b.value - a.value);

              // Compute total P&L for this asset class
              let assetPL = 0;
              let assetCostValue = 0;

              if (item.label !== "Tiềm mặt (Cash)") {
                const correspondingType = 
                  item.label === 'Cổ phiếu niêm yết' 
                    ? 'EQUITY' 
                    : item.label === 'Quỹ chỉ số (ETF)' 
                      ? 'ETF' 
                      : 'DERIVATIVE';

                const typePositions = positions.filter(pos => pos.assetType === correspondingType);

                const typeMarketValue = typePositions.reduce((sum, pos) => {
                  let val = pos.quantity * pos.currentPrice;
                  if (pos.assetType === 'DERIVATIVE') {
                    val = pos.quantity * pos.currentPrice * 100000;
                  }
                  return sum + val;
                }, 0);

                assetCostValue = typePositions.reduce((sum, pos) => {
                  let val = pos.quantity * pos.averageCostPrice;
                  if (pos.assetType === 'DERIVATIVE') {
                    val = pos.quantity * pos.averageCostPrice * 100000;
                  }
                  return sum + val;
                }, 0);

                assetPL = typeMarketValue - assetCostValue;
              }

              const assetPLPct = assetCostValue > 0 ? (assetPL / assetCostValue) * 100 : 0;

              return (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                  <div 
                    onClick={() => setExpandedAssetTypes(prev => ({ ...prev, [item.label]: !isExpanded }))}
                    className="flex justify-between items-center text-xs cursor-pointer select-none hover:text-zinc-100 transition group py-1"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${assetColors[item.label] || 'bg-teal-600'}`}></span>
                      <span className="font-bold text-zinc-300 group-hover:text-emerald-400 transition flex items-center space-x-1.5">
                        <span>{item.label}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-zinc-500" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-zinc-500" />
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {item.label !== "Tiềm mặt (Cash)" && (
                        <span className={`font-mono text-[10.5px] font-bold ${
                          assetPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {assetPL >= 0 ? '+' : ''}{formatVND(assetPL, true)} ({assetPLPct.toFixed(1)}%)
                        </span>
                      )}
                      <span className="text-zinc-500 font-mono hidden sm:inline">{formatVND(item.value)}</span>
                      <span className="font-mono font-extrabold text-zinc-200 bg-zinc-800/40 px-1.5 py-0.5 rounded-sm">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Sub-CTCK details for Asset Type */}
                  {isExpanded && brokerBreakdown.length > 0 && (
                    <div className="mt-2 pl-4 border-l border-zinc-850 space-y-2 animate-fade-in text-[10px] sm:text-xs">
                      {brokerBreakdown.map((sub, sIdx) => {
                        const pctOfGroup = item.value > 0 ? (sub.value / item.value) * 100 : 0;
                        const pctOfNAV = totalNAV > 0 ? (sub.value / totalNAV) * 100 : 0;

                        return (
                          <div key={sIdx} className="bg-zinc-950/20 rounded-xl p-2.5 border border-zinc-900/60 flex justify-between items-center hover:bg-zinc-900/10 transition">
                            <div className="flex items-center space-x-2.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${brokerColors[sub.broker] || 'bg-zinc-500'}`} />
                              <span className="text-zinc-350 font-semibold">{sub.broker}</span>
                            </div>
                            <div className="flex items-center space-x-4 font-mono text-[10px]">
                              <span className="text-zinc-400">{formatVND(sub.value)}</span>
                              <span className="text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded-sm" title="Tỷ trọng trong nhóm này">
                                {pctOfGroup.toFixed(1)}% nhóm
                              </span>
                              <span className="text-zinc-500" title="Tỷ trọng trên tổng NAV">
                                Tỉ trọng: {pctOfNAV.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. Portfolio Asset Holdings List */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/40">
          <div className="flex items-center space-x-2">
            <Bookmark className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Phân bổ tài sản toàn bộ mã đầu tư</h3>
          </div>
          <button 
            id="dash-view-details-btn"
            onClick={() => onNavigateToTab('pnl')}
            className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
          >
            <span>Phân tích chi tiết P&L</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800/60 font-sans text-xs">
            <thead>
              <tr className="bg-zinc-900/20 text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                <th className="px-6 py-3 text-left">Mã CK</th>
                <th className="px-6 py-3 text-right">Tổng số lượng</th>
                <th className="px-6 py-3 text-right">Giá vốn gia quyền</th>
                <th className="px-6 py-3 text-right">Giá thị trường</th>
                <th className="px-6 py-3 text-right">Giá trị tài sản</th>
                <th className="px-6 py-3 text-right">Tỷ trọng</th>
                <th className="px-6 py-3 text-right">Lãi / Lỗ vị thế</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 bg-zinc-900/10">
              {consolidated.sort((a,b) => b.totalMarketValue - a.totalMarketValue).map((pos, idx) => {
                const pctOfNAV = totalNAV > 0 ? (pos.totalMarketValue / totalNAV) * 100 : 0;
                
                // Find unique brokers holding this stock Symbol
                const uniqueBrokers = Array.from(new Set(pos.accountsBreakdown.map(b => b.brokerName)));
                const hasMultipleBrokers = uniqueBrokers.length > 1;
                const isExpanded = expandedStocks[pos.stockSymbol] || false;

                // Color highlight for stock ticker
                let symbolBadgeColor = "bg-zinc-800 text-zinc-350 border-zinc-700/50";
                if (pos.assetType === 'ETF') {
                  symbolBadgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/15";
                } else if (pos.assetType === 'DERIVATIVE') {
                  symbolBadgeColor = "bg-amber-500/10 text-amber-400 border-amber-550/15";
                } else {
                  symbolBadgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/15";
                }

                return (
                  <React.Fragment key={idx}>
                    <tr 
                      id={`holding-row-${pos.stockSymbol}`}
                      onClick={() => {
                        if (hasMultipleBrokers) {
                          setExpandedStocks(prev => ({ ...prev, [pos.stockSymbol]: !isExpanded }));
                        }
                        if (newSymbols.includes(pos.stockSymbol.toUpperCase())) {
                          onSeenSymbol?.(pos.stockSymbol);
                        }
                      }}
                      className={`transition duration-150 relative ${
                        hasMultipleBrokers ? 'cursor-pointer hover:bg-zinc-800/40' : 'hover:bg-zinc-855/20'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-md text-xs font-mono font-bold border ${symbolBadgeColor}`}>
                            {pos.stockSymbol}
                          </span>
                          {newSymbols.includes(pos.stockSymbol.toUpperCase()) && (
                            <span className="bg-emerald-500 text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded-full select-none animate-pulse shrink-0 tracking-wider">
                              NEW
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 capitalize hidden sm:inline">
                            {pos.assetType === 'EQUITY' ? 'Cổ phiếu' : pos.assetType === 'ETF' ? 'ETF Quỹ' : 'Phái sinh'}
                          </span>
                          
                          {/* Indicator for multiple brokers */}
                          {hasMultipleBrokers && (
                            <span className="inline-flex items-center gap-1 bg-purple-500/10 border border-purple-500/15 text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-medium select-none ml-1 animate-pulse">
                              <span>{uniqueBrokers.length} CTCK</span>
                              {isExpanded ? (
                                <ChevronUp className="h-2.5 w-2.5" />
                              ) : (
                                <ChevronDown className="h-2.5 w-2.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-zinc-300">{formatShares(pos.totalQuantity)}</td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-zinc-450">
                        {pos.assetType === 'DERIVATIVE' 
                          ? pos.weightedAvgPrice.toFixed(1) 
                          : formatVND(pos.weightedAvgPrice, false)
                        }
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-zinc-400">
                        {pos.assetType === 'DERIVATIVE' 
                          ? pos.currentPrice.toFixed(1) 
                          : formatVND(pos.currentPrice, false)
                        }
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-semibold text-zinc-200">
                        {formatVND(pos.totalMarketValue)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono">
                        <div className="inline-flex items-center space-x-1.5 justify-end">
                          <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div className="bg-emerald-500 h-full" style={{ width: `${pctOfNAV}%` }} />
                          </div>
                          <span className="font-bold text-zinc-300">{pctOfNAV.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 font-mono font-bold ${
                          pos.totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          <span>{pos.totalUnrealizedPL >= 0 ? '+' : ''}{formatVND(pos.totalUnrealizedPL, true)}</span>
                          <span className="text-[10px] font-normal">({formatPercent(pos.totalUnrealizedPLPct)})</span>
                        </span>
                      </td>
                    </tr>

                    {/* Exploded sub-row details */}
                    {isExpanded && hasMultipleBrokers && (
                      <tr className="bg-zinc-950/45 text-[11px] border-y border-zinc-900/60 shadow-inner">
                        <td colSpan={7} className="px-6 py-4.5">
                          <div className="pl-4 border-l-2 border-purple-500/50 space-y-2">
                            <div className="text-zinc-450 font-bold mb-2 uppercase tracking-wide text-[9px] font-mono flex items-center space-x-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              <span>Phân rã vị thế theo từng CTCK ({uniqueBrokers.length} đối tác)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {pos.accountsBreakdown.map((breakNode, bIdx) => {
                                const subMktVal = pos.assetType === 'DERIVATIVE' 
                                  ? (breakNode.quantity * pos.currentPrice * 100000) 
                                  : (breakNode.quantity * pos.currentPrice);

                                return (
                                  <div key={bIdx} className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80 hover:border-zinc-750 transition flex flex-col justify-between">
                                    <div className="flex justify-between items-center font-bold text-zinc-200 border-b border-zinc-850 pb-1.5 mb-2">
                                      <span style={{ color: accounts.find(a => a.id === breakNode.accountId)?.color || '#10B981' }} className="font-bold">
                                        {breakNode.brokerName}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-normal truncate max-w-[150px]">
                                        {breakNode.accountName}
                                      </span>
                                    </div>
                                    <div className="space-y-1 font-mono text-[10.5px]">
                                      <div className="flex justify-between text-zinc-500">
                                        <span>Số lượng:</span>
                                        <span className="text-zinc-300 font-semibold">{formatShares(breakNode.quantity)}</span>
                                      </div>
                                      <div className="flex justify-between text-zinc-500">
                                        <span>Giá vốn:</span>
                                        <span className="text-zinc-300">
                                          {pos.assetType === 'DERIVATIVE' 
                                            ? breakNode.averageCostPrice.toFixed(1) 
                                            : formatVND(breakNode.averageCostPrice, false)
                                          }
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-zinc-500">
                                        <span>Giá trị TT:</span>
                                        <span className="text-zinc-350 font-bold">{formatVND(subMktVal, false)}đ</span>
                                      </div>
                                      <div className="flex justify-between pt-1.5 border-t border-zinc-850/50 mt-1.5">
                                        <span className="text-zinc-550 font-sans">Lãi/Lỗ:</span>
                                        <span className={`font-bold flex items-center space-x-1 ${
                                          breakNode.unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                          <span>{breakNode.unrealizedPL >= 0 ? '+' : ''}{formatVND(breakNode.unrealizedPL, true)}</span>
                                          <span className="text-[9px] font-normal">({breakNode.unrealizedPLPct.toFixed(1)}%)</span>
                                        </span>
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
              {consolidated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <Database className="h-8 w-8 mx-auto text-zinc-700 mb-2 animate-bounce" />
                    <p className="font-semibold text-xs">Chưa có vị thế đầu tư nào.</p>
                    <p className="text-[10px] text-zinc-650 mt-1 font-sans">Hãy trích xuất từ ảnh screenshot hoặc import file Excel ở mục 'Nạp dữ liệu'</p>
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
