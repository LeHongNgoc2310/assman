import React from 'react';
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
}

export default function DashboardTab({
  positions,
  accounts,
  marketAssets,
  onNavigateToTab,
  staleCount,
}: DashboardTabProps) {
  
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
    <div id="dashboard-tab" className="space-y-6">
      
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
            onClick={() => onNavigateToTab('import')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-450 text-black rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap"
          >
            Đồng bộ ngay
          </button>
        </div>
      )}

      {/* 2. Key Aggregate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total NAV Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-6 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className="absolute right-4 top-4 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <p className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Tổng giá trị tài sản (NAV)</p>
          <p className="text-3xl font-extrabold text-zinc-100 mt-2 font-sans tracking-tight">{formatVND(totalNAV)}</p>
          
          <div className="flex items-center space-x-4 mt-6 text-xs border-t border-zinc-800/60 pt-3">
            <div>
              <span className="text-zinc-500">Giá trị vị thế:</span>
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
          <p className={`text-3xl font-extrabold mt-2 font-sans tracking-tight ${
            dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {dailyPL >= 0 ? '+' : ''}{formatVND(dailyPL)}
          </p>

          <div className="flex items-center space-x-2 mt-6 text-xs border-t border-zinc-800/60 pt-3">
            <span className="text-zinc-500">Hiệu năng phiên hôm nay:</span>
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
          <p className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Tổng Lãi/Lỗ trạng thái (Unrealized P&L)</p>
          <p className={`text-3xl font-extrabold mt-2 font-sans tracking-tight ${
            totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {totalUnrealizedPL >= 0 ? '+' : ''}{formatVND(totalUnrealizedPL)}
          </p>

          <div className="flex items-center space-x-2 mt-6 text-xs border-t border-zinc-800/60 pt-3">
            <span className="text-zinc-500">Tỷ suất lợi nhuận kỳ vọng:</span>
            <span className={`font-mono font-bold ${totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(totalUnrealizedPLPct)}
            </span>
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
          
          {/* Custom clean CSS multi-colored linear bar */}
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-zinc-850 mb-6 font-sans">
            {brokerAllocations.map((item, idx) => {
              if (item.value <= 0) return null;
              const colorClass = brokerColors[item.broker] || 'bg-zinc-400';
              return (
                <div 
                  key={idx} 
                  style={{ width: `${item.percentage}%` }}
                  className={`${colorClass} h-full transition-all duration-500`}
                  title={`${item.broker}: ${formatPercent(item.percentage)}`}
                />
              );
            })}
          </div>

          <div className="space-y-3">
            {brokerAllocations.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${brokerColors[item.broker] || 'bg-zinc-500'}`}></span>
                  <span className="font-semibold text-zinc-300">{item.broker}</span>
                </div>
                <div className="flex space-x-4 items-center">
                  <span className="text-zinc-500">{formatVND(item.value)}</span>
                  <span className="font-mono font-extrabold text-zinc-200 bg-zinc-800/40 px-1.5 py-0.5 rounded-sm">{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
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

          {/* Combined Visual Track bar */}
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-zinc-850 mb-6 font-sans">
            {assetTypeAllocations.map((item, idx) => {
              if (item.value <= 0) return null;
              const colorClass = assetColors[item.label] || 'bg-teal-500';
              return (
                <div 
                  key={idx} 
                  style={{ width: `${item.percentage}%` }}
                  className={`${colorClass} h-full transition-all duration-500`}
                  title={`${item.label}: ${formatPercent(item.percentage)}`}
                />
              );
            })}
          </div>

          <div className="space-y-3">
            {assetTypeAllocations.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${assetColors[item.label] || 'bg-teal-600'}`}></span>
                  <span className="font-semibold text-zinc-300">{item.label}</span>
                </div>
                <div className="flex space-x-4 items-center">
                  <span className="text-zinc-500">{formatVND(item.value)}</span>
                  <span className="font-mono font-extrabold text-zinc-200 bg-zinc-800/40 px-1.5 py-0.5 rounded-sm">{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Top Holdings Panel list */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800/60 flex justify-between items-center bg-zinc-900/40">
          <div className="flex items-center space-x-2">
            <Bookmark className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Top phân bổ tài sản mã đầu tư</h3>
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
              {consolidated.sort((a,b) => b.totalMarketValue - a.totalMarketValue).slice(0, 10).map((pos, idx) => {
                const pctOfNAV = totalNAV > 0 ? (pos.totalMarketValue / totalNAV) * 100 : 0;
                
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
                  <tr key={idx} className="hover:bg-zinc-855/35 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-mono font-bold border ${symbolBadgeColor}`}>
                          {pos.stockSymbol}
                        </span>
                        <span className="text-[10px] text-zinc-500 capitalize hidden sm:inline">
                          {pos.assetType === 'EQUITY' ? 'Cổ phiếu' : pos.assetType === 'ETF' ? 'ETF Quỹ' : 'Phái sinh'}
                        </span>
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
