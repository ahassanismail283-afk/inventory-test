import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Image as ImageIcon, Lock, Check } from 'lucide-react';
import { Card, CardTitle, Field, PageHeader, buttonClass, inputClass } from '../ui';
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
      toast.success('تم تحديث الملف الشخصي والصورة بنجاح. قد تحتاج إلى إعادة تحميل الصفحة لرؤية التغييرات.');
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
    <div className="max-w-3xl space-y-4">
      <PageHeader title="إعدادات الحساب" description="اسمك وصورتك كما يظهران للزملاء، وبيانات الدخول." />

      {/* Profile Section */}
      <Card>
        <CardTitle>الملف الشخصي</CardTitle>
        <form onSubmit={handleUpdateProfile} className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
              aria-label="تغيير الصورة"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="mx-auto h-7 w-7 text-slate-400" strokeWidth={1.5} />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                تغيير
              </span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />

            <div className="flex-1 sm:max-w-sm">
              <Field label="الاسم الظاهر" htmlFor="profile-nickname">
                <input
                  id="profile-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button type="submit" disabled={isUpdatingProfile} className={buttonClass('primary')}>
              <Check className="h-4 w-4" />
              {isUpdatingProfile ? 'جارٍ الحفظ...' : 'حفظ الملف الشخصي'}
            </button>
          </div>
        </form>
      </Card>

      {/* Security Section */}
      <Card>
        <CardTitle>بيانات الدخول</CardTitle>
        <form onSubmit={handleUpdateCredentials} className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="البريد الإلكتروني" htmlFor="profile-email" hint="إذا غيّرته ستصلك رسالة تأكيد على البريد الجديد.">
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass + ' text-left'}
                dir="ltr"
              />
            </Field>

            <Field label="كلمة المرور الجديدة" htmlFor="profile-password" hint="اتركها فارغة إن لم ترد تغييرها.">
              <input
                id="profile-password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass + ' text-left'}
                minLength={6}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button type="submit" disabled={isUpdatingCredentials} className={buttonClass('secondary')}>
              <Lock className="h-4 w-4" strokeWidth={1.75} />
              {isUpdatingCredentials ? 'جارٍ التحديث...' : 'تحديث بيانات الدخول'}
            </button>
          </div>
        </form>
      </Card>

    </div>
  );
};

export default UserProfile;
