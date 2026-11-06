import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext.tsx';
import { Logo } from '../Logo.tsx';
import { Icon3D } from '../icons/Icon3D.tsx';
import { Lock, Mail, User, AlertCircle, CheckCircle2, ShieldCheck, Sparkles, X } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, user } = usePOS();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthModalOpen && user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (isRegisterMode) {
        const res = await register(email, password, name);
        if (!res.success) {
          setError(res.error || 'Failed to register');
        } else {
          setSuccess('បានបង្កើតគណនី និងភ្ជាប់ Realtime ដោយជោគជ័យ!');
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Failed to login');
        } else {
          setSuccess('បានចូលប្រើប្រាស់ និងធ្វើសមកាលកម្មទិន្នន័យជោគជ័យ!');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoAccount = (demoEmail: string, demoPass: string, demoName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setName(demoName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Decorative Header Banner */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-700 text-white">
          {user && (
            <button
              onClick={closeAuthModal}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex items-center justify-center mb-3">
            <Logo size="lg" showSubtitle={false} className="text-white" />
          </div>

          <p className="text-center text-indigo-100 text-xs px-2">
            ប្រព័ន្ធ Realtime Multi-Device Sync សុវត្ថិភាពខ្ពស់ ផ្ដាច់ទិន្នន័យដាច់ដោយឡែកតាមគណនី Gmail នីមួយៗ
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex p-1 mt-4 bg-indigo-950/40 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegisterMode
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Sign In (ចូលប្រើប្រាស់)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegisterMode
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              Create Account (បង្កើតថ្មី)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ឈ្មោះអាជីវកម្ម ឬ អ្នកគ្រប់គ្រង (Full Name)
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. ហួត ដារ៉ា"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gmail Address
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                1 Gmail = 1 គណនីគត់
              </span>
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password (ពាក្យសម្ងាត់)
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Realtime Rules Note */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>ច្បាប់ការពារសុវត្ថិភាពទិន្នន័យ (Data Isolation):</span>
            </div>
            <p>
              • ឧបករណ៍ច្រើនដែល Sign in ចូល Gmail តែមួយ (A) នឹងឃើញរបាយការណ៍ Orders និងស្តុកដូចគ្នា Realtime។
            </p>
            <p>
              • មិនអាចមើលឃើញទិន្នន័យរបស់ Gmail ផ្សេង (B) ជាដាច់ខាត លុះត្រាតែ Sign out រួច Sign in ចូល Gmail នោះ។
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-500/25 btn-3d disabled:opacity-50"
          >
            {submitting
              ? 'កំពុងដំណើរការ...'
              : isRegisterMode
              ? 'បង្កើតគណនី (Great Account)'
              : 'ចូលប្រើប្រាស់ (Sign In)'}
          </button>

          {/* Quick Demo Pre-fill */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" />
              <span>គណនីតេស្តសាកល្បងរហ័ស (Quick Demo Accounts):</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button
                type="button"
                onClick={() =>
                  handleQuickDemoAccount('darahouthr@gmail.com', '123456', 'ហួត ដារ៉ា')
                }
                className="p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
              >
                <div>Gmail A (ហួត ដារ៉ា)</div>
                <div className="text-[9px] text-slate-500 font-normal">darahouthr@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickDemoAccount('branch.b@gmail.com', '123456', 'សាខា B (Branch B)')
                }
                className="p-2 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 font-semibold text-left hover:bg-sky-100 dark:hover:bg-sky-900/40"
              >
                <div>Gmail B (សាខា B)</div>
                <div className="text-[9px] text-slate-500 font-normal">branch.b@gmail.com</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
