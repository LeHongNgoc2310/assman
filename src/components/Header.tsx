import React, { useState } from 'react';
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
  indices?: MarketIndex[];
}

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
  indices = [],
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Absolute Top Index Bar */}
      <div id="index-ticker-bar" className="bg-[#050507] border-b border-zinc-900/50 py-2 sm:px-6 lg:px-8 px-4 text-xs font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center sm:space-y-2 md:space-y-0 space-y-2 text-zinc-400">
          {/* List of Indices */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-center">
            {indices && indices.map((idx) => {
              const isUp = idx.change >= 0;
              return (
                <div key={idx.symbol} className="flex items-center space-x-1.5 py-0.5" id={`index-ticker-${idx.symbol}`}>
                  <span className="font-semibold text-zinc-400 tracking-wide text-[11px]">{idx.name}</span>
                  <span className={`font-mono font-bold text-xs ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {idx.price.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`font-mono text-[10px] flex items-center shrink-0 font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? '▲' : '▼'}{Math.abs(idx.change).toFixed(2)} ({isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%)
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Last Updated Timestamp */}
          <div className="flex items-center space-x-1.5 text-zinc-500 text-[10px] font-mono shrink-0">
            <Clock id="index-clock-icon" className="w-3.5 h-3.5 text-zinc-650" />
            <span>Thời điểm cập nhật cuối: {lastRefreshTime.toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </div>

      <header id="app-header" className="border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-zinc-950 p-2 rounded-lg flex items-center justify-center font-bold shadow-md shadow-emerald-500/10">
              <Layers id="logo-icon" className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-sans text-xl font-bold tracking-tight text-white uppercase">
                AssMan <span className="text-zinc-500 font-normal capitalize italic">MVP</span>
              </span>
            </div>
          </div>

          {/* Real-time Ticker info */}
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2 bg-zinc-900/40 hover:bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800/50 transition duration-150">
              <span className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></span>
              <span className="text-xs font-semibold text-zinc-350">{isRealtimeActive ? 'VNSTOCK LIVE ACTIVE' : 'GIẢ LẬP ĐANG CHẠY'}</span>
              <span className="text-[10px] text-zinc-450 px-1 inline bg-zinc-800 rounded font-mono">
                {isRealtimeActive ? 'VNDIRECT, TCBS APIS' : 'DỰ PHÒNG'}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-zinc-500 font-mono">
              <RefreshCw className={`h-3 w-3 ${isSimulating ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Cập nhật: 15s | Lần cuối: {lastRefreshTime.toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>

          {/* Quick Actions & Metrics */}
          <div className="flex items-center space-x-4">
            {/* Quick NAV & P&L snapshot */}
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Tổng tài sản (NAV)</div>
              <div className="flex items-center justify-end space-x-2">
                <span className="text-sm font-semibold text-zinc-150">{formatVND(totalNAV)}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md font-mono border ${
                  dailyPL >= 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                  : 'bg-red-500/10 text-red-400 border-red-500/15'
                }`}>
                  {dailyPL >= 0 ? '+' : ''}{dailyPLPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Auth status indicator */}
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

            {/* Refresh manual CTA */}
            <button
              id="header-refresh-btn"
              onClick={onManualRefresh}
              title="Cập nhật giá mới nhất"
              className="p-2 text-zinc-450 hover:text-emerald-400 hover:bg-zinc-900 rounded-xl transition cursor-pointer border border-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${isSimulating ? 'animate-spin text-emerald-450' : ''}`} />
            </button>

            {/* Notification Drawer trigger */}
            <div className="relative">
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

              {/* Notification Overlay Panel */}
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
    </>
  );
}
