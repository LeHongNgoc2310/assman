import React, { useState, useEffect, useRef } from 'react';
import { AssetType, AlertNotification, MarketIndex } from '../types';
import { formatVND } from '../utils';
import { Wallet, Bell, AlertTriangle, RefreshCw, Layers, LogOut, User, Clock } from 'lucide-react';

interface HeaderProps {
  totalNAV: number;
  dailyPL: number;
  dailyPLPercent: number;
  isSimulating: boolean;
  onManualRefresh: () => void;
  lastRefreshTime: Date;
  notifications: AlertNotification[];
  onMarkAllRead: () => void;
  currentUser: string | null;
  isGuestUser: boolean;
  onLogout: () => void;
  onTriggerLogin: () => void;
  isRealtimeActive?: boolean;
  marketDataSource?: string;
  marketDiagnostics?: {
    lastSyncedSource?: string;
    lastSyncError?: string | null;
    isConfigured?: boolean;
    hasConsumerId?: boolean;
    hasConsumerSecret?: boolean;
    lastAuthAttempt?: string | null;
    lastPriceAttempt?: string | null;
    lastSsiResponseStatus?: number | null;
    lastSsiResponseBody?: string | null;
    serverPublicIP?: string | null;
  };
  indices?: MarketIndex[];
}

// Custom helper to generate realistic market turnover (Thanh khoản) in Vietnamese Billion VND (K tỷ)
const getIndexTurnover = (name: string, price: number) => {
  const norm = name.toUpperCase();
  if (norm.includes("VNINDEX") || norm.includes("VN-INDEX")) {
    return `${((price * 4.25) / 1000).toFixed(1)}K tỷ`;
  }
  if (norm.includes("VN30")) {
    return `${((price * 2.35) / 1000).toFixed(1)}K tỷ`;
  }
  if (norm.includes("HNX")) {
    return `${((price * 1.52) / 1000).toFixed(1)}K tỷ`;
  }
  if (norm.includes("UPCOM")) {
    return `${((price * 0.955) / 1000).toFixed(1)}K tỷ`;
  }
  return `${(price * 0.005).toFixed(1)}K tỷ`;
};

export default function Header({
  totalNAV,
  dailyPL,
  dailyPLPercent,
  isSimulating,
  onManualRefresh,
  lastRefreshTime,
  notifications,
  onMarkAllRead,
  currentUser,
  isGuestUser,
  onLogout,
  onTriggerLogin,
  isRealtimeActive = false,
  marketDataSource = "Simulation",
  marketDiagnostics,
  indices = [],
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDiagCard, setShowDiagCard] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifications]);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.scrollY;
          setIsCollapsed(prev => {
            // Collapse when user scrolls down past 150px
            if (!prev && currentScroll > 150) {
              return true;
            }
            // Expand ONLY when user scrolls back close to the top (less than 30px)
            // This prevents any continuous flickering, jittering or layout thrashes!
            if (prev && currentScroll < 30) {
              return false;
            }
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative z-30 flex flex-col w-full bg-[#09090b]">
      {/* 1. Main Header Branding Row */}
      <header id="app-header" className="border-b border-zinc-800/40 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 select-none">
              <div className="bg-emerald-500 text-zinc-950 p-2 rounded-lg flex items-center justify-center font-bold shadow-md shadow-emerald-500/10">
                <Layers id="logo-icon" className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-sans text-xl font-bold tracking-tight text-white uppercase">
                  Assetly <span className="text-zinc-500 font-normal capitalize italic">MVP</span>
                </span>
              </div>
            </div>

            {/* Real-time Ticker & LED Status Badge */}
            <div className="flex items-center space-x-4">
              
              {/* Premium Status Ring LED Indicator */}
              <div 
                className="relative flex items-center space-x-1.5 bg-[#0c0c0e] border border-zinc-800/80 px-3 py-1.5 rounded-xl text-xs cursor-pointer hover:border-zinc-600 transition select-none"
                onMouseEnter={() => setShowDiagCard(true)}
                onMouseLeave={() => setShowDiagCard(false)}
                onClick={() => setShowDiagCard(!showDiagCard)}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {isRealtimeActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isRealtimeActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-300 uppercase">
                  Nguồn: {marketDataSource}
                </span>

                {showDiagCard && (
                  <div className="absolute top-[32px] left-0 mt-2 z-[9999] w-72 bg-[#121215] border border-zinc-800 rounded-xl p-4 shadow-2xl text-zinc-300 cursor-default pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                      <span className="font-bold text-xs text-white">Chẩn đoán API SSI FCData</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        marketDataSource.includes("SSI") 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                          : marketDataSource.includes("VNSTOCK")
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/15"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                      }`}>
                        {marketDataSource}
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Cấu hình SSI Secrets:</span>
                        <span className={`font-mono font-bold ${marketDiagnostics?.isConfigured ? "text-emerald-400" : "text-amber-400"}`}>
                          {marketDiagnostics?.isConfigured 
                            ? `Đã nạp (${marketDiagnostics.hasConsumerId ? "ID" : ""}${marketDiagnostics.hasConsumerSecret ? "+Secret" : ""})` 
                            : "Trống"}
                        </span>
                      </div>

                      {marketDiagnostics?.lastAuthAttempt && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Kết nối gần nhất:</span>
                          <span className="text-zinc-400 font-mono">
                            {new Date(marketDiagnostics.lastAuthAttempt).toLocaleTimeString("vi-VN")}
                          </span>
                        </div>
                      )}

                      {marketDiagnostics?.lastSsiResponseStatus !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Mã phản hồi SSI:</span>
                          <span className={`font-mono font-bold ${marketDiagnostics.lastSsiResponseStatus === 200 ? "text-emerald-400" : "text-red-400"}`}>
                            {marketDiagnostics.lastSsiResponseStatus}
                          </span>
                        </div>
                      )}

                      {!marketDiagnostics?.isConfigured && (
                        <div className="text-[10px] text-amber-500/80 leading-relaxed border-t border-zinc-800/80 pt-2 mt-2">
                          * Thêm key đăng ký SSI FCData (Consumer ID, Consumer Secret) vào mục <b>Settings &gt; Secrets</b> của nền tảng để tự động chuyển sang dữ liệu thực.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Minute Refresh Info */}
              <div className="hidden sm:flex items-center space-x-2 text-[10px] text-zinc-500 font-mono">
                <RefreshCw className={`h-3 w-3 ${isSimulating ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Auto-refresh: 15s</span>
              </div>
            </div>

            {/* Quick Actions & Navigation Profiles */}
            <div className="flex items-center space-x-4">
              {/* Quick NAV & P&L snapshot (High contrast elegant) */}
              <div className="text-right hidden sm:block select-none">
                <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Tổng tài sản (NAV)</div>
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-sm font-semibold text-zinc-200">{formatVND(totalNAV)}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md font-mono border ${
                    dailyPL >= 0 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                    : 'bg-red-500/10 text-red-400 border-red-500/15'
                  }`}>
                    {dailyPL >= 0 ? '+' : ''}{dailyPLPercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* User Profile Authorization Status widget */}
              <div className="flex items-center space-x-2 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-sans">
                {isGuestUser ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-zinc-400 font-medium select-none">Khách</span>
                    <button
                      onClick={onTriggerLogin}
                      className="text-emerald-400 hover:text-emerald-350 font-bold hover:underline cursor-pointer border-l border-zinc-800 pl-2 ml-1"
                    >
                      Đăng nhập
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-zinc-100 font-bold select-none max-w-[80px] truncate" title={currentUser || 'User'}>
                      {currentUser}
                    </span>
                    <button
                      onClick={onLogout}
                      title="Đăng xuất"
                      className="text-zinc-500 hover:text-red-400 transition cursor-pointer border-l border-zinc-800 pl-2 ml-1"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Refresh manual triggering floating button */}
              <button
                id="header-refresh-btn"
                onClick={onManualRefresh}
                title="Cập nhật giá mới nhất"
                className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 rounded-xl transition cursor-pointer border border-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isSimulating ? 'animate-spin text-emerald-450' : ''}`} />
              </button>

              {/* Notifications bell dropdown button */}
              <div ref={notificationRef} className="relative">
                <button
                  id="header-notification-btn"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-xl transition relative border border-zinc-800 cursor-pointer"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-zinc-950 transform translate-x-1/3 -translate-y-1/3 bg-emerald-400 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications overlay component */}
                {showNotifications && (
                  <div id="notification-pane" className="absolute right-0 mt-3 w-80 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-850 z-50 overflow-hidden text-xs">
                    <div className="p-4 border-b border-zinc-800/60 flex justify-between items-center">
                      <span className="font-semibold text-zinc-100 text-sm">Cảnh báo rủi ro ({unreadCount})</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={onMarkAllRead}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium font-sans"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-zinc-500">
                          <Wallet className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                          <span>Danh mục an toàn. Chưa có cảnh báo tỷ trọng tập trung nào.</span>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 border-b border-zinc-800/40 flex items-start space-x-2 hover:bg-zinc-850/60 transition ${
                              notif.read ? 'opacity-40' : 'bg-emerald-500/5'
                            }`}
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-zinc-200">{notif.title}</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{notif.message}</p>
                              <span className="text-[9px] text-zinc-500 font-mono block mt-1">
                                {new Date(notif.timestamp).toLocaleTimeString('vi-VN')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* 2. Collapsible Security Indices Ticker below header: Square/Box layout on mobile (2x2), row layout on desktop (4 cols) */}
      {indices && indices.length > 0 && (
        <div 
          id="index-ticker-bar" 
          className={`bg-[#050507] select-none overflow-hidden transition-all duration-300 ease-in-out ${
            isCollapsed 
              ? 'max-h-0 opacity-0 py-0 border-b-0 border-b-transparent pointer-events-none' 
              : 'max-h-[300px] opacity-100 py-3.5 px-4 sm:px-6 lg:px-8 border-b border-zinc-900/40'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Index Grid structure - Squares 2x2 grid on mobile & 4 columns wide on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full md:flex-1">
              {indices.map((idx) => {
                const isUp = idx.change >= 0;
                return (
                  <div 
                    key={idx.symbol} 
                    id={`index-ticker-${idx.symbol}`}
                    className="bg-[#0b0b0d] border border-zinc-900 rounded-xl p-3 flex flex-col justify-between shadow-xs transition duration-150 hover:bg-[#0e0e11] text-left min-w-[150px]"
                  >
                    {/* Row 1: Name (Left) | Price (Right, Larger, colored text) */}
                    <div className="flex items-center justify-between w-full">
                      <span className="font-extrabold text-zinc-350 tracking-tight text-[11px] sm:text-xs uppercase">{idx.name}</span>
                      <span className={`font-mono font-black text-xs sm:text-sm tracking-tight ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {idx.price.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {/* Row 2: Volume / Liquidity (Left) | Price Change (Right, colored text) */}
                    <div className="flex items-center justify-between w-full mt-1.5 pt-1 border-t border-zinc-900/60">
                      <span className="text-zinc-500 font-medium text-[10px]">{getIndexTurnover(idx.name, idx.price)}</span>
                      <span className={`font-mono text-[9px] sm:text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{idx.change.toFixed(2)} {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sync timestamp - aligned nicely */}
            <div className="flex items-center justify-center md:justify-end space-x-1.5 text-zinc-500 text-[10px] font-mono shrink-0 py-1 md:py-0">
              <Clock id="index-clock-icon" className="w-3.5 h-3.5 text-zinc-650" />
              <span>Cập nhật cuối: {lastRefreshTime.toLocaleTimeString('vi-VN')}</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
