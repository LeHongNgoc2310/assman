import React, { useState } from 'react';
import { AlertRule, PortfolioPosition, BrokerageAccount } from '../types';
import { consolidatePositions, formatVND, formatPercent } from '../utils';
import { 
  AlertTriangle, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  SwitchCamera, 
  Percent, 
  BookOpen, 
  TrendingUp, 
  CheckCircle,
  Clock
} from 'lucide-react';

interface RiskAlertsTabProps {
  positions: PortfolioPosition[];
  accounts: BrokerageAccount[];
  rules: AlertRule[];
  onAddRule: (rule: Omit<AlertRule, 'id' | 'isActive'>) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
}

export default function RiskAlertsTab({
  positions,
  accounts,
  rules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
}: RiskAlertsTabProps) {
  const [ticker, setTicker] = useState('');
  const [threshold, setThreshold] = useState<number>(15);
  const [inputError, setInputError] = useState<string | null>(null);

  const consolidated = consolidatePositions(positions, accounts);
  const totalCash = accounts.reduce((acc, curr) => acc + curr.cashBalance, 0);
  const totalStockMkt = consolidated.reduce((acc, curr) => acc + curr.totalMarketValue, 0);
  const totalNAV = totalStockMkt + totalCash;

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const symbol = ticker.trim().toUpperCase();
    if (!symbol) {
      setInputError("Vui lòng nhập mã chứng khoán cần theo dõi.");
      return;
    }

    if (threshold <= 0 || threshold > 100) {
      setInputError("Ngưỡng cảnh báo tỷ trọng phải nằm trong khoảng 1% - 100% tài sản.");
      return;
    }

    // Check duplicate
    const duplicate = rules.find(r => r.stockSymbol === symbol);
    if (duplicate) {
      setInputError(`Mã chứng khoán "${symbol}" đã có sẵn quy tắc bảo vệ tỷ trọng.`);
      return;
    }

    onAddRule({
      type: 'CONCENTRATION',
      stockSymbol: symbol,
      thresholdPercent: threshold
    });

    setTicker('');
  };

  return (
    <div id="risk-alerts-tab" className="space-y-6 font-sans text-xs">

      {/* Intro details relative to Concentration risk */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-2">
          <p className="font-bold text-zinc-100 text-sm flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Chỉ mục Kiểm soát Rủi ro Tập trung (Concentration Risk Alert)</span>
          </p>
          <p className="text-zinc-400 leading-relaxed text-[11px]">
            Đa số các quỹ chuyên nghiệp và chuyên gia tài sản khuyến nghị <strong>không nên phân bổ vượt quá 15% - 20% tổng NAV</strong> vào bất kỳ mã cổ phiếu đơn lẻ nào để tránh rủi ro sụt giảm mạnh. AssMan giúp bạn cấu hình các chỉ báo tự động giám sát. Khi giá cổ phiếu dịch chuyển khiến tỷ trọng vượt biên mức cài đặt, hệ thống sẽ trigger cảnh báo cho bạn ngay lập tức.
          </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-4 flex flex-col justify-center text-center">
          <p className="text-[10px] text-zinc-550 font-mono uppercase tracking-wide">Quy mô bảo hộ NAV</p>
          <p className="text-xl font-black text-emerald-400 mt-1 font-mono">{formatVND(totalNAV)}</p>
          <p className="text-[9px] text-zinc-500 mt-2">Giám sát {rules.length} quy tắc bảo trì tỷ trọng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Add alert rule inputs panel */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 shadow-xs h-fit space-y-4">
          <div className="flex items-center space-x-1.5 font-bold text-zinc-150 border-b border-zinc-850 pb-2 mb-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            <span>Tạo cảnh báo mới</span>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-400 select-none">Mã Chứng Khoán giám sát</label>
              <input
                id="alert-ticker-input"
                type="text"
                placeholder="Ví dụ: FPT, HPG, VNM"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 uppercase font-mono font-bold text-center text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-400 block select-none">Ngưỡng giới hạn tỷ trọng (%)</label>
              <div className="relative">
                <input
                  id="alert-threshold-input"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={threshold || ''}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                />
                <span className="absolute right-3 top-2.5 text-zinc-500 font-bold select-none">%</span>
              </div>
            </div>

            {inputError && (
              <p className="p-2.5 text-red-400 bg-red-500/10 border border-red-500/15 rounded-lg text-[10px] leading-relaxed font-semibold">
                {inputError}
              </p>
            )}

            <button
              id="submit-alert-rule-btn"
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl font-bold transition shadow-xs cursor-pointer select-none"
            >
              Khai sinh Quy tắc Giám sát
            </button>
          </form>
        </div>

        {/* 2. Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-zinc-150">Danh sách quy tắc tỷ trọng ({rules.length})</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rules.map((rule) => {
              // Calculate current weight of this symbol in portfolio
              const matchingHoldings = consolidated.find(c => c.stockSymbol === rule.stockSymbol);
              const currentWeight = matchingHoldings && totalNAV > 0 ? (matchingHoldings.totalMarketValue / totalNAV) * 100 : 0;
              const isBreached = currentWeight > rule.thresholdPercent;

              return (
                <div
                  key={rule.id}
                  className={`bg-zinc-900/50 border p-4.5 rounded-2xl shadow-xs relative transition flex flex-col justify-between ${
                    isBreached && rule.isActive ? 'border-red-900/40 bg-red-950/5' : 'border-zinc-800/80'
                  }`}
                >
                  <div>
                    {/* Header: ticker symbols */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 font-mono font-black border border-zinc-700 bg-zinc-800 rounded-md text-zinc-200 text-xs">
                          {rule.stockSymbol}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-emerald-555 animate-pulse' : 'bg-zinc-700'}`} />
                          <span className="text-[9px] text-zinc-500 font-mono uppercase">
                            {rule.isActive ? 'Bản hoạt động' : 'Tắt'}
                          </span>
                        </div>
                      </div>

                      {/* Power switch inline toggler */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onToggleRule(rule.id)}
                          className={`w-8 h-4 rounded-full p-0.5 transition cursor-pointer ${
                            rule.isActive ? 'bg-emerald-500' : 'bg-zinc-800 border border-zinc-700'
                          }`}
                          title="Bật/Tắt quy tắc"
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition transform ${
                            rule.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {/* Weight benchmarks metrics comparison list */}
                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800/65 pt-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block select-none">Ngưỡng tối đa</span>
                        <span className="text-sm font-bold text-zinc-300 font-mono">
                          {rule.thresholdPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block select-none">Tỷ trọng thực tế</span>
                        <span className={`text-sm font-black font-mono ${isBreached && rule.isActive ? 'text-red-400' : 'text-zinc-200'}`}>
                          {currentWeight.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Status Alert logs rendering */}
                    {rule.isActive && (
                      <div className="mt-4">
                        {isBreached ? (
                          <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 border border-red-500/15 p-2 rounded-xl text-[10px] font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            <span>Vượt ngưỡng an toàn! ({formatPercent(currentWeight - rule.thresholdPercent)} overweight)</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-emerald-450 bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-xl text-[10px] font-semibold">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span>Hiện tại an toàn ({formatPercent(rule.thresholdPercent - currentWeight)} dưới biên)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/65 flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 font-mono flex items-center space-x-1 select-none">
                      <Clock className="w-3 h-3" />
                      <span>{rule.lastTriggeredAt ? `Cảnh báo lúc: ${new Date(rule.lastTriggeredAt).toLocaleTimeString('vi-VN')}` : 'Chưa từng nổ'}</span>
                    </span>

                    <button
                      id={`delete-alert-rule-${rule.id}`}
                      onClick={() => onDeleteRule(rule.id)}
                      className="text-zinc-550 hover:text-red-400 p-1 rounded-md hover:bg-zinc-800 cursor-pointer transition"
                      title="Xóa quy tắc bảo vệ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {rules.length === 0 && (
              <div className="col-span-2 py-16 text-center text-zinc-500 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800">
                <ShieldCheck className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                <p className="font-semibold text-xs text-zinc-350">Chưa có quy tắc giám sát rủi ro nào</p>
                <p className="text-[10px] text-zinc-550 mt-1 max-w-xs mx-auto">
                  Vui lòng thêm mã cổ phiếu cần bảo hiểm tỷ trọng bên biểu mẫu trái (ví dụ: FPT tối đa 15% NAV).
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
