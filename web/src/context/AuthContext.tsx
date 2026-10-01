"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

export interface Business {
  id: string;
  name: string;
  activity_type: string | null;
  is_demo: boolean;
}

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  business: Business | null;
  loading: boolean;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
}

const defaultClient = createClient();

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  business: null,
  loading: true,
  supabase: defaultClient,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadUserData = useCallback(
    async (currentUser: User) => {
      try {
        const [profileRes, businessRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, email, avatar_url")
            .eq("id", currentUser.id)
            .maybeSingle(),
          supabase
            .from("businesses")
            .select("id, name, activity_type, is_demo")
            .eq("owner_id", currentUser.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data as Profile);
        }

        if (businessRes.data) {
          setBusiness(businessRes.data as Business);
        } else {
          // Si el usuario no tiene negocio aún, aprovisionar uno por defecto
          const defaultName = profileRes.data?.display_name
            ? `Negocio de ${profileRes.data.display_name}`
            : "Mi Negocio";
          const { data: newBiz } = await supabase
            .from("businesses")
            .insert([{
              owner_id: currentUser.id,
              name: defaultName,
              legal_form: "autonomo",
              activity_type: "servicios",
              region: "madrid",
              currency: "EUR",
              environment: "PRODUCTION",
              is_demo: false,
            }])
            .select("id, name, activity_type, is_demo")
            .single();

          if (newBiz) {
            setBusiness(newBiz as Business);
          }
        }
      } catch (e) {
        console.warn("Error loading user data:", e);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadUserData(s.user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadUserData(s.user);
      } else {
        setProfile(null);
        setBusiness(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, supabase.auth]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, business, loading, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
