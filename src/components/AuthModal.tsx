import React, { useState } from 'react';
import { Layers, ShieldCheck, User, Lock, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';

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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const getSavedUsers = (): Record<string, string> => {
    try {
      const users = localStorage.getItem('assman_users');
      return users ? JSON.parse(users) : {};
    } catch {
      return {};
    }
  };

  const saveUser = (user: string, pass: string) => {
    const users = getSavedUsers();
    users[user.trim().toLowerCase()] = pass;
    localStorage.setItem('assman_users', JSON.stringify(users));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setMessage({ text: 'Vui lòng cung cấp đầy đủ thông tin đăng nhập.', isError: true });
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setMessage({ text: 'Mật khẩu phải chứa ít nhất 6 ký tự để bảo mật.', isError: true });
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ text: 'Mật khẩu xác nhận không trùng khớp.', isError: true });
        return;
      }

      const users = getSavedUsers();
      if (users[trimmedUser.toLowerCase()]) {
        setMessage({ text: 'Tên đăng nhập này đã được đăng ký trên hệ thống.', isError: true });
        return;
      }

      saveUser(trimmedUser, password);
      setMessage({ text: 'Khởi tạo tài khoản thành công! Bạn có thể nâng cấp chiếc ví tài sản ngay bây giờ.', isError: false });
      
      // Auto toggle to login
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setMessage(null);
      }, 1500);

    } else {
      // Login mode
      const users = getSavedUsers();
      const registeredPassword = users[trimmedUser.toLowerCase()];

      if (registeredPassword && registeredPassword === password) {
        onLoginSuccess(trimmedUser);
      } else {
        setMessage({ text: 'Sai tài khoản hoặc mật khẩu đăng nhập, vui lòng kiểm tra lại.', isError: true });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic blurred high contrast safety backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      {/* Auth visual card container board */}
      <div className="relative bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-md p-8 overflow-hidden shadow-2xl shadow-emerald-500/5 animate-fade-in">
        {/* Subtle decorative visual glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        {/* Brand identity launcher */}
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="bg-emerald-500 text-zinc-950 p-3 rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
            <Layers className="h-8 w-8 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-sans text-2xl font-extrabold tracking-tight text-white uppercase block">
              AssMan Port <span className="text-emerald-400 font-bold lowercase italic font-serif">Gate</span>
            </span>
            <span className="text-zinc-500 text-[11px] font-mono block mt-1 tracking-wider uppercase">
              Quản lý tài sản cá nhân thông minh
            </span>
          </div>
        </div>

        {/* Tab switcher options */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-xl mb-6 select-none font-sans text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setMessage(null);
            }}
            className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-450 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Đăng ký sở hữu</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setMessage(null);
            }}
            className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-450 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Khai sinh mới</span>
          </button>
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

        {/* Creation or Signin input forms */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-400">Tên đăng nhập (Username)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-550" />
              <input
                type="text"
                value={username}
                placeholder="Ví dụ: investor2026"
                required
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-zinc-850 bg-zinc-900 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-transparent placeholder:text-zinc-650 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-zinc-400">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-550" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="Ít nhất 6 ký tự bảo mật"
                required
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 border border-zinc-850 bg-zinc-900 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-transparent placeholder:text-zinc-650 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="font-bold text-zinc-400">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-550" />
                <input
                  type="password"
                  value={confirmPassword}
                  placeholder="Nhập lại mật khẩu phía trên"
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-850 bg-zinc-900 text-zinc-100 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-transparent placeholder:text-zinc-650 font-medium"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl font-extrabold cursor-pointer transition shadow-lg shadow-emerald-500/10 mt-2 text-center select-none"
          >
            {mode === 'login' ? 'Xác minh & Truy cập' : 'Khai sinh tài khoản mới'}
          </button>
        </form>

        {/* Separate spacer boundary */}
        <div className="relative my-6 select-none">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-900" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-zinc-950 px-3 text-zinc-550 font-mono tracking-widest">Trải nghiệm tự do</span>
          </div>
        </div>

        {/* Guest access option button layout */}
        <div className="space-y-3">
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

          <p className="text-[10px] text-zinc-600 text-center leading-relaxed select-none px-4 pt-1">
            * Theo yêu cầu của bạn, khách vãng lai vẫn được quyền xem và sử dụng 100% tất cả các chức năng VIP của AssMan.
          </p>
        </div>

      </div>
    </div>
  );
}
