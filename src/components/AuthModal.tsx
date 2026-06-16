import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '../supabaseClient';
import AssetlyLogo, { AssetlyText } from './AssetlyLogo';

interface AuthModalProps {
  onLoginSuccess: (username: string) => void;
  onGuestAccess: () => void;
  onClose?: () => void;
  canCloseWithoutLogin?: boolean;
}

export default function AuthModal({
  onLoginSuccess,
  onGuestAccess,
  onClose,
  canCloseWithoutLogin = false
}: AuthModalProps) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [showGooglePrompt, setShowGooglePrompt] = useState<boolean>(false);
  const [googleStep, setGoogleStep] = useState<'idle' | 'authenticating' | 'syncing' | 'complete'>('idle');

  const handleGoogleSignInTrigger = () => {
    setMessage(null);
    setShowGooglePrompt(true);
    setGoogleStep('idle');
  };

  const handleSelectAccount = () => {
    setGoogleStep('authenticating');
    
    // Simulate high-fidelity multi-stage login sequence representing a cloud database check
    setTimeout(() => {
      setGoogleStep('syncing');
    }, 900);

    setTimeout(() => {
      setGoogleStep('complete');
    }, 2000);

    setTimeout(() => {
      localStorage.setItem('assman_current_user_avatar', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120');
      onLoginSuccess('Lê Hồng Ngọc');
    }, 2700);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dynamic blurred high contrast safety backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer" 
        onClick={onGuestAccess}
        title="Bấm ra ngoài để trải nghiệm chế độ Khách"
      />

      {/* Auth visual card container board */}
      <div className="relative bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-sm p-8 overflow-hidden shadow-2xl shadow-emerald-500/5 animate-fade-in">
        {/* Subtle decorative visual glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        {showGooglePrompt ? (
          <div className="relative z-10 animate-fade-in font-sans">
            {/* Google Logo */}
            <div className="flex justify-center mb-5">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>

            {googleStep === 'idle' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-zinc-100 font-bold text-sm tracking-tight">Chọn một tài khoản để tiếp tục</h3>
                  <p className="text-zinc-500 text-[10.5px] mt-1">đăng nhập vào ứng dụng <AssetlyText className="text-[10.5px]" /></p>
                </div>

                {/* Account card choice */}
                <button
                  type="button"
                  onClick={handleSelectAccount}
                  className="w-full p-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850/60 rounded-2xl flex items-center space-x-3 text-left transition duration-150 cursor-pointer group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120&h=120"
                    alt="Lê Hồng Ngọc"
                    className="w-10 h-10 rounded-full border border-zinc-700 object-cover shrink-0"
                  />
                  <div className="truncate flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-100 font-bold text-xs group-hover:text-emerald-450 transition text-emerald-400">Lê Hồng Ngọc</span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-900/35">Đề xuất</span>
                    </div>
                    <span className="text-zinc-500 text-[10px] block mt-0.5 font-mono truncate">demo.user@assetly.vn</span>
                  </div>
                </button>

                {/* Use another account option */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleStep('authenticating');
                      setTimeout(handleSelectAccount, 600);
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-350 transition underline cursor-pointer font-medium"
                  >
                    Sử dụng một tài khoản Google khác
                  </button>
                </div>

                <div className="border-t border-zinc-900/60 pt-4 mt-2">
                  <p className="text-[10px] text-zinc-400 leading-relaxed text-justify px-1">
                    Bằng việc tiếp tục chọn tài khoản, Google sẽ chia sẻ công khai tên, địa chỉ email, tùy chọn ngôn ngữ và ảnh đại diện của bạn an toàn với <AssetlyText className="text-[10px]" /> để định danh sở hữu.
                  </p>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowGooglePrompt(false)}
                    className="text-zinc-500 hover:text-zinc-350 font-mono text-[10px] tracking-wider cursor-pointer font-bold"
                  >
                    [ Quay lại Cổng Gate ]
                  </button>
                </div>
              </div>
            )}

            {googleStep === 'authenticating' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin" />
                  <div className="absolute text-[10px] font-mono font-bold text-emerald-400 uppercase">G</div>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-200 font-bold text-xs">Đang kiểm tra thông tin Google...</p>
                  <p className="text-zinc-500 text-[10px] font-mono font-bold tracking-widest uppercase animate-pulse">Authenticating OAuth</p>
                </div>
              </div>
            )}

            {googleStep === 'syncing' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin" />
                  <div className="absolute text-[10px] font-mono font-bold text-indigo-400">DATA</div>
                </div>
                <div className="space-y-1 animate-fade-in">
                  <p className="text-zinc-200 font-bold text-xs">Đang đồng bộ hóa dữ liệu danh mục...</p>
                  <p className="text-zinc-500 text-[10px] font-mono font-bold tracking-widest uppercase animate-pulse">Syncing User Assets</p>
                </div>
              </div>
            )}

            {googleStep === 'complete' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950/30 border border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="h-6 w-6 text-emerald-400 stroke-2 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-emerald-400 font-bold text-xs">Đăng nhập thành công!</p>
                  <p className="text-zinc-500 text-[10px] font-mono font-bold tracking-widest uppercase">Welcome back, Ngọc</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Brand identity launcher */}
            <div className="flex flex-col items-center text-center mb-8">
              <AssetlyLogo size="xl" />
              <div className="mt-3 text-center">
                <AssetlyText className="text-3.5xl font-extrabold tracking-tight uppercase block" />
                <span className="text-zinc-500 text-[11px] font-mono block mt-1 tracking-wider uppercase">
                  Quản lý tài sản cá nhân thông minh
                </span>
              </div>
            </div>

            {/* Informational message alert */}
            {message && (
              <div
                className={`p-3.5 rounded-xl text-xs mb-5 border select-none ${
                  message.isError
                    ? 'bg-red-950/25 border-red-900/60 text-red-300'
                    : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                }`}
              >
                <p className="font-semibold leading-relaxed text-center">{message.text}</p>
              </div>
            )}

            {/* Google OAuth Login Button */}
            <div className="mb-6 font-sans">
              <button
                type="button"
                onClick={handleGoogleSignInTrigger}
                className="w-full py-3.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl font-extrabold cursor-pointer transition shadow-lg flex items-center justify-center space-x-3 text-xs select-none hover:scale-[1.01] active:scale-[0.99] duration-150"
              >
                <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Đăng nhập nhanh với Google</span>
              </button>
            </div>

            {/* Separate spacer boundary */}
            <div className="relative my-6 select-none">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-900" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-zinc-950 px-3.5 text-zinc-500 font-mono tracking-widest font-bold">Trải nghiệm tự do</span>
              </div>
            </div>

            {/* Guest access option button layout */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={onGuestAccess}
                className="w-full py-3 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 text-emerald-430 hover:text-emerald-400 rounded-xl font-extrabold cursor-pointer transition duration-150 flex items-center justify-center space-x-2 font-sans select-none text-xs"
              >
                <span>Trải nghiệm làm Khách (Không cần tài khoản)</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>

              {canCloseWithoutLogin && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-center py-1 text-zinc-500 hover:text-zinc-350 transition font-mono tracking-wide text-[10px] cursor-pointer"
                >
                  [ Đóng cửa sổ và tiếp tục xem ]
                </button>
              )}

              <p className="text-[10px] text-zinc-650 text-center leading-relaxed select-none px-4 pt-1">
                * Khách vãng lai vẫn được quyền xem 100% tất cả các chức năng VIP của <AssetlyText className="text-[10px]" /> với data simulation
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
