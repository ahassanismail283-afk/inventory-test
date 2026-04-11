import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Settings, Image as ImageIcon, Mail, Lock, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const UserProfile: React.FC = () => {
  const { profile, user } = useAuth();
  
  // States
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '');
      setAvatarPreview(profile.avatar_base64 || null);
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 200px to keep base64 string lightweight for PG sizing
          const maxDim = 200;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress heavily to keep the size small (< 10KB)
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64Str = await resizeImage(file);
        setAvatarPreview(base64Str);
      } catch (err) {
        toast.error('حدث خطأ أثناء معالجة الصورة');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nickname,
          avatar_base64: avatarPreview
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      toast.success('تم تحديث الملف الشخصي والصورة بنجاح. قد تحتاج للتحديث (Refresh) لرؤية التغييرات.');
    } catch (err: any) {
      toast.error('لم نتمكن من تحديث الملف الشخصي');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCredentials(true);
    try {
      const updates: any = {};
      
      if (email && email !== user?.email) updates.email = email;
      if (password && password.length >= 6) updates.password = password;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;
        toast.success('تم تحديث بيانات الدخول. تحقق من بريدك إذا غيرته.');
        setPassword('');
      } else {
        toast('لم تقم بإجراء تغييرات في الدخول', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error('لم نتمكن من تحديث بيانات الدخول.');
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary-50/50 p-2.5 text-primary-600 shadow-sm backdrop-blur-sm">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-serif tracking-tight">إعدادات الحساب</h2>
          <p className="text-sm text-slate-500">تخصيص ملفك الشخصي وبيانات الدخول</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-bold font-serif text-slate-800">الملف الشخصي (العام)</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div 
                className="h-24 w-24 rounded-full bg-primary-50 flex items-center justify-center overflow-hidden border-2 border-primary-100 shadow-sm relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                )}
                <div className="absolute inset-0 bg-primary-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold text-white">تغيير</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange}
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم المستعار (Nickname)</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="كيف ترغب أن نناديك؟"
                className="mt-1 block max-w-sm w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-bl from-primary-700 to-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-primary-800 hover:to-primary-700 transition-all disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isUpdatingProfile ? 'جاري الحفظ...' : 'حفظ الملف الشخصي'}
            </button>
          </div>
        </form>
      </div>

      {/* Security Section */}
      <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-bold font-serif text-slate-800">بيانات الأمان</h3>
          </div>
          <p className="text-xs text-slate-500 pr-7">استخدم هذه الإعدادات لتغيير بريدك أو كلمة المرور الخاصة بك عبر نظام Supabase الآمن</p>
        </div>

        <form onSubmit={handleUpdateCredentials} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني الجديد</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-300" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 pl-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="اتركه فارغاً إن لم ترغب في التغيير"
                  className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isUpdatingCredentials}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 transition-all disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isUpdatingCredentials ? 'جاري التحديث...' : 'تحديث بيانات الدخول'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default UserProfile;
