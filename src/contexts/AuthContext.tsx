import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, Location } from '../types';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  locations: Location[];
  activeLocationId: string | null;
  setActiveLocationId: (id: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLocations([]);
        setActiveLocationId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch visible locations
      if (profileData.role === 'ADMIN') {
        const { data: allLocs } = await supabase.from('locations').select('*');
        if (allLocs) {
          setLocations(allLocs);
          if (allLocs.length > 0) setActiveLocationId(allLocs[0].id);
        }
      } else if (profileData.locationIds && profileData.locationIds.length > 0) {
        const { data: userLocs } = await supabase
          .from('locations')
          .select('*')
          .in('id', profileData.locationIds);
          
        if (userLocs) {
          setLocations(userLocs);
          if (userLocs.length > 0) setActiveLocationId(userLocs[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err.message);
      toast.error('فشل في جلب بيانات المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, locations, activeLocationId, setActiveLocationId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
