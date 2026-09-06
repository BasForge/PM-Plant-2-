import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Wrench, Lock, User, KeyRound, AlertCircle, ArrowRight, Eye, Factory } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, loginAsViewer, users } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const result = login(username, password);
      setIsSubmitting(false);

      if (result.success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorMsg(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    }, 200);
  };

  const handleDirectViewerAccess = () => {
    loginAsViewer();
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-between items-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header branding */}
      <header className="w-full max-w-6xl py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Wrench size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent uppercase">
              Thai Food Maint
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">ระบบบริหารงานซ่อมบำรุงและแผน PM โรงงานอาหาร</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>มาตรฐานความปลอดภัยอาหาร GMP / HACCP</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md my-auto z-10">
        <div className="bg-[#0b1325]/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          
          {/* Top Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 shadow-inner mb-3">
              <Lock size={26} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">เข้าสู่ระบบการทำงาน</h2>
            <p className="text-xs text-slate-400 mt-1">
              เข้าชมระบบทั่วไป หรือลงชื่อเข้าใช้งานสำหรับเจ้าหน้าที่
            </p>
          </div>

          {/* Direct Viewer Entrance (No credentials needed) */}
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 to-teal-950/50 border border-emerald-500/40 shadow-lg shadow-emerald-950/30">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <Eye size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300">สำหรับผู้ดูข้อมูล (Viewer)</div>
                <div className="text-[11px] text-slate-300">ดูแดชบอร์ด แผน PM และสถานะเครื่องจักร</div>
              </div>
            </div>
            <button
              type="button"
              id="btn-login-viewer-direct"
              onClick={handleDirectViewerAccess}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye size={15} />
              <span>เข้าชมระบบทันที (ไม่ต้องใส่รหัสและชื่อผู้ใช้)</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-5">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0b1325] px-3 text-[11px] text-slate-400 font-medium whitespace-nowrap">
              หรือ เข้าสู่ระบบสำหรับช่าง / ผู้ดูแลระบบ
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="login-username">
                ชื่อผู้ใช้ (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ป้อนชื่อผู้ใช้ของคุณ"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300" htmlFor="login-password">
                  รหัสผ่าน (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {showPassword ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound size={16} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ป้อนรหัสผ่าน"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>กำลังตรวจสอบสิทธิ์...</span>
              ) : (
                <>
                  <span>เข้าสู่ระบบ (Sign In)</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 gap-2 z-10">
        <div className="flex items-center gap-2">
          <Factory size={14} className="text-slate-500" />
          <span>ระบบศูนย์ซ่อมบำรุงโรงงานอาหาร (PM/TPM & Maintenance Cloud System)</span>
        </div>
        <div>
          <span>ระบบพร้อมใช้งาน</span>
        </div>
      </footer>
    </div>
  );
};
