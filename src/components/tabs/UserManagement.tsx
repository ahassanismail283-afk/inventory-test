import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { UserProfile, Location, Role } from '../../types';
import { toast } from 'react-hot-toast';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Register Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newRole, setNewRole] = useState<Role>('CLIENT');
  const [newLocationIds, setNewLocationIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, locsRes] = await Promise.all([
        supabase.from('users').select('*').order('email'),
        supabase.from('locations').select('*').order('name'),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (locsRes.error) throw locsRes.error;

      setUsers(usersRes.data || []);
      setLocations(locsRes.data || []);
    } catch (err: any) {
      toast.error('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: Role) => {
    try {
      const { error } = await supabase.from('users').update({ role }).eq('id', userId);
      if (error) throw error;
      toast.success('تم تحديث الصلاحية');
      fetchData();
    } catch (err: any) {
      toast.error('خطأ في تحديث الصلاحية');
    }
  };

  const handleToggleLocationAccess = async (user: UserProfile, locationId: string) => {
    const isCurrentlyAdded = user.locationIds?.includes(locationId);
    let updatedLocationIds = user.locationIds || [];

    if (isCurrentlyAdded) {
      updatedLocationIds = updatedLocationIds.filter(id => id !== locationId);
    } else {
      updatedLocationIds = [...updatedLocationIds, locationId];
    }

    try {
      const { error } = await supabase.from('users').update({ locationIds: updatedLocationIds }).eq('id', user.id);
      if (error) throw error;
      toast.success('تم تحديث الصلاحية للموقع');
      fetchData();
    } catch (err: any) {
      toast.error('خطأ في تحديث صلاحية الموقع');
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم ${user.email}؟ \nسيؤدي هذا إلى إنهاء صلاحياته بالكامل في النظام.`)) return;
    
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      toast.success('تم حذف المستخدم بنجاح');
      fetchData();
    } catch (err: any) {
      toast.error('خطأ أثتاء حذف المستخدم');
    }
  };

  const toggleNewLocation = (locId: string) => {
    setNewLocationIds(prev => 
      prev.includes(locId) ? prev.filter(id => id !== locId) : [...prev, locId]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    
    setIsCreating(true);
    try {
      // 1. Create a secondary client bypassing session persistence to avoid logging out the Admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';
      const adminAuthClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });

      // 2. Sign up the user (make sure Email Confirmations are disabled in Supabase dashboard)
      const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('فشل إنشاء المستخدم في نظام المصادقة');

      // 3. Insert user configuration into `users` table
      const { error: dbError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: authData.user.email,
        nickname: newNickname || authData.user.email?.split('@')[0],
        role: newRole,
        locationIds: newLocationIds
      });

      if (dbError) throw dbError;

      toast.success('تم إنشاء المستخدم وتكوينه بنجاح');
      
      // Clear form
      setNewEmail('');
      setNewPassword('');
      setNewNickname('');
      setNewRole('CLIENT');
      setNewLocationIds([]);
      fetchData();
      
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إنشاء المستخدم');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary-50/50 p-2.5 text-primary-600 shadow-sm backdrop-blur-sm">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 font-serif tracking-tight">إدارة المستخدمين</h2>
        </div>
      </div>

      {/* Admin User Creation Form Engine */}
      <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-bold font-serif text-slate-800">إضافة مستخدم جديد</h3>
        </div>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور (6+ أحرف)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الاسم المستعار (اختياري)</label>
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الرتبة الأولية</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="mt-1 block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-primary-600 bg-primary-50 focus:bg-white shadow-sm transition-all"
            >
              <option value="CLIENT">مدخل بيانات (CLIENT)</option>
              <option value="MANAGER">مراقب (MANAGER)</option>
              <option value="ADMIN">مدير النظام (ADMIN)</option>
            </select>
          </div>

          {newRole !== 'ADMIN' && (
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">تخصيص مواقع الموظف الجديد</label>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => toggleNewLocation(loc.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      newLocationIds.includes(loc.id)
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-primary-50 text-slate-600 hover:bg-primary-100'
                    }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-gradient-to-bl from-primary-700 to-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:from-primary-800 hover:to-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-all disabled:opacity-50"
            >
              {isCreating ? 'جاري الإنشاء...' : 'تسجيل المستخدم'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
             <div className="text-center py-8 text-slate-500">جاري التحميل...</div>
          ) : (
          <table className="min-w-full divide-y divide-slate-200/60 text-right">
            <thead className="bg-[#fbf9f5]">
              <tr>
                <th scope="col" className="px-6 py-4 text-sm font-bold text-slate-800">المستخدم</th>
                <th scope="col" className="px-6 py-4 text-sm font-bold text-slate-800 text-center">الرتبة</th>
                <th scope="col" className="px-6 py-4 text-sm font-bold text-slate-800 w-1/2">المواقع المصرح بها</th>
                <th scope="col" className="px-6 py-4 text-sm font-bold text-slate-800">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-transparent">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-primary-50/30 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_base64 && (
                        <img src={user.avatar_base64} alt="Avatar" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-900">{user.nickname || '-'}</div>
                        <div className="text-xs font-medium text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-center">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as Role)}
                      className="rounded-xl border-slate-200 text-sm focus:ring-primary-600 focus:border-primary-600 bg-white"
                    >
                      <option value="ADMIN">مدير (ADMIN)</option>
                      <option value="MANAGER">مراقب (MANAGER)</option>
                      <option value="CLIENT">موظف (CLIENT)</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {user.role === 'ADMIN' ? (
                      <span className="text-slate-500 italic">يملك صلاحية شاملة</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {locations.map(loc => {
                          const hasAccess = user.locationIds?.includes(loc.id);
                          return (
                            <button
                              key={loc.id}
                              onClick={() => handleToggleLocationAccess(user, loc.id)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                hasAccess 
                                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' 
                                  : 'bg-primary-50 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {loc.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="حذف المستخدم"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
