import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Stethoscope } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Field, inputClass, buttonClass } from './ui';

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

  const title =
    mode === 'login' ? 'تسجيل الدخول' : mode === 'forgot' ? 'استعادة كلمة المرور' : 'كلمة مرور جديدة';

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-primary-900 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(36,70,214,0.9),transparent_60%)]" aria-hidden="true" />
      <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-primary-500/30 blur-3xl" aria-hidden="true" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm">
            <Stethoscope className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-white">وحدة جزيرة شندويل البيطرية</p>
            <p className="text-sm text-primary-200">منظومة إدارة المخزون والصرف</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-primary-950/40 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {mode === 'forgot' && (
            <p className="mt-1 text-sm text-slate-600">أدخل بريدك وسنرسل لك رابطا لتعيين كلمة مرور جديدة.</p>
          )}

          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            {(mode === 'login' || mode === 'forgot') && (
              <Field label="البريد الإلكتروني" htmlFor="login-email">
                <input
                  id="login-email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass + ' text-left'}
                  required
                />
              </Field>
            )}

            {(mode === 'login' || mode === 'reset') && (
              <Field label={mode === 'reset' ? 'كلمة المرور الجديدة' : 'كلمة المرور'} htmlFor="login-password">
                <input
                  id="login-password"
                  type="password"
                  dir="ltr"
                  autoComplete={mode === 'reset' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass + ' text-left'}
                  required
                />
              </Field>
            )}

            <button type="submit" disabled={loading} className={buttonClass('primary', 'w-full')}>
              {loading ? 'جارٍ المعالجة...' :
               mode === 'login' ? 'دخول' :
               mode === 'forgot' ? 'إرسال رابط الاستعادة' :
               'حفظ كلمة المرور'}
            </button>
          </form>

          {!isRecoveryMode && (
            <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm">
              {mode === 'login' ? (
                <button onClick={() => setMode('forgot')} className="font-medium text-primary-700 hover:text-primary-900">
                  نسيت كلمة المرور؟
                </button>
              ) : (
                <button onClick={() => setMode('login')} className="font-medium text-primary-700 hover:text-primary-900">
                  العودة إلى تسجيل الدخول
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
