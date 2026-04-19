import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  available: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  available: !!supabase,

  initialize: async () => {
    if (!supabase) { set({ loading: false }); return; }
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) return "Auth not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signUpWithEmail: async (email, password) => {
    if (!supabase) return "Auth not configured";
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
