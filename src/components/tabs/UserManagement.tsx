import React, { useState, useEffect } from 'react';
import { supabase, createIsolatedAuthClient } from '../../lib/supabase';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { UserProfile, Location, Role } from '../../types';
import { toast } from 'react-hot-toast';
import { Card, CardTitle, EmptyState, Field, PageHeader, TableSkeleton, buttonClass, cx, iconButtonClass, inputClass, roleLabels, td, th, theadClass } from '../ui';

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
      const adminAuthClient = createIsolatedAuthClient();

      // 2. Sign up the user (make sure Email Confirmations are disabled in Supabase dashboard)
      const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('فشل إنشاء المستخدم في نظام المصادقة');

      // 3. Save user configuration into `users` table.
      // The on_auth_user_created trigger already inserted a default CLIENT row during sign-up,
      // so upsert to overwrite it with the chosen role and locations instead of failing on the duplicate id.
      const { error: dbError } = await supabase.from('users').upsert({
        id: authData.user.id,
        email: authData.user.email,
        nickname: newNickname || authData.user.email?.split('@')[0],
        role: newRole,
        locationIds: newLocationIds
      }, { onConflict: 'id' });

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

  const chipClass = (active: boolean) =>
    cx(
      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
      active
        ? 'border-primary-700 bg-primary-700 text-white hover:bg-primary-800'
        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
    );

  return (
    <div>
      <PageHeader title="المستخدمون" description="أنشئ حسابات الموظفين وحدد دور كل منهم والوحدات التي يعمل عليها." />

      {/* Admin User Creation Form Engine */}
      <Card className="mb-4">
        <CardTitle>مستخدم جديد</CardTitle>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="البريد الإلكتروني" htmlFor="new-user-email">
            <input
              id="new-user-email"
              type="email"
              dir="ltr"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass + ' text-left'}
              required
            />
          </Field>
          <Field label="كلمة المرور" htmlFor="new-user-password" hint="ستة أحرف على الأقل.">
            <input
              id="new-user-password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass + ' text-left'}
              required
              minLength={6}
            />
          </Field>
          <Field label="الاسم الظاهر (اختياري)" htmlFor="new-user-nickname">
            <input
              id="new-user-nickname"
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="الدور" htmlFor="new-user-role">
            <select
              id="new-user-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className={inputClass}
            >
              <option value="CLIENT">{roleLabels.CLIENT}</option>
              <option value="MANAGER">{roleLabels.MANAGER}</option>
              <option value="ADMIN">{roleLabels.ADMIN}</option>
            </select>
          </Field>

          {newRole !== 'ADMIN' && (
            <fieldset className="md:col-span-2 lg:col-span-4">
              <legend className="mb-2 text-sm font-medium text-slate-800">الوحدات المسموح بها</legend>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    aria-pressed={newLocationIds.includes(loc.id)}
                    onClick={() => toggleNewLocation(loc.id)}
                    className={chipClass(newLocationIds.includes(loc.id))}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4 md:col-span-2 lg:col-span-4">
            <button type="submit" disabled={isCreating} className={buttonClass('primary', 'w-full sm:w-auto')}>
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              {isCreating ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
            </button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <CardTitle aside={<span className="text-sm text-slate-600">{users.length} مستخدم</span>}>الحسابات الحالية</CardTitle>
        <div className="relative overflow-x-auto">
          {loading && users.length === 0 ? (
            <TableSkeleton rows={4} cols={3} />
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد مستخدمون بعد" />
          ) : (
            <table className="w-full min-w-[720px]">
              <thead className={theadClass}>
                <tr>
                  <th className={th}>المستخدم</th>
                  <th className={th + ' w-44'}>الدور</th>
                  <th className={th}>الوحدات المسموح بها</th>
                  <th className={th + ' w-16'}><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="align-top hover:bg-slate-50">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        {user.avatar_base64 ? (
                          <img src={user.avatar_base64} alt="" className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                            {(user.nickname || user.email).charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{user.nickname || user.email.split('@')[0]}</div>
                          <div className="truncate text-xs text-slate-600" dir="ltr">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      <label htmlFor={`role-${user.id}`} className="sr-only">دور {user.email}</label>
                      <select
                        id={`role-${user.id}`}
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as Role)}
                        className={inputClass + ' py-1.5'}
                      >
                        <option value="ADMIN">{roleLabels.ADMIN}</option>
                        <option value="MANAGER">{roleLabels.MANAGER}</option>
                        <option value="CLIENT">{roleLabels.CLIENT}</option>
                      </select>
                    </td>
                    <td className={td}>
                      {user.role === 'ADMIN' ? (
                        <span className="text-slate-600">كل الوحدات</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {locations.map(loc => {
                            const hasAccess = !!user.locationIds?.includes(loc.id);
                            return (
                              <button
                                key={loc.id}
                                aria-pressed={hasAccess}
                                onClick={() => handleToggleLocationAccess(user, loc.id)}
                                className={chipClass(hasAccess)}
                              >
                                {loc.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className={td + ' text-left'}>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className={iconButtonClass('danger')}
                        aria-label={`حذف ${user.email}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

export default UserManagement;
