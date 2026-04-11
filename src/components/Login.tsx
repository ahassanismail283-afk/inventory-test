import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Stethoscope } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LoginProps {
  isRecoveryMode?: boolean;
}

const Login: React.FC<LoginProps> = ({ isRecoveryMode = false }) => {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(isRecoveryMode ? 'reset' : 'login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
        setMode('login');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success('تم تحديث كلمة المرور بنجاح.');
        // clear the URL hash so we go back to normal app flow
        window.location.hash = '';
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ. تأكد من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 rounded-full bg-primary-100 p-4">
            <Stethoscope className="h-10 w-10 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">وحدة جزيرة شندويل البيطرية</h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'login' && 'منظومة إدارة المخزون والصرف'}
            {mode === 'forgot' && 'استعادة كلمة المرور'}
            {mode === 'reset' && 'إعداد كلمة مرور جديدة'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {(mode === 'login' || mode === 'forgot') && (
            <div>
              <label className="block text-sm font-medium text-slate-700">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="admin@vet.com"
                required
              />
            </div>
          )}

          {(mode === 'login' || mode === 'reset') && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {mode === 'reset' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
          >
            {loading ? 'جاري المعالجة...' : 
             mode === 'login' ? 'تسجيل الدخول' : 
             mode === 'forgot' ? 'إرسال رابط الاستعادة' : 
             'تحديث كلمة المرور'}
          </button>
        </form>

        {!isRecoveryMode && (
          <div className="mt-6 text-center text-sm">
            {mode === 'login' ? (
              <button onClick={() => setMode('forgot')} className="text-primary-600 hover:text-primary-500">
                هل نسيت كلمة المرور؟
              </button>
            ) : (
              <button onClick={() => setMode('login')} className="text-primary-600 hover:text-primary-500">
                العودة لتسجيل الدخول
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
