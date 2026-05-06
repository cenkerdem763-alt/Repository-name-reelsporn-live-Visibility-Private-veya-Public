import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type WatchProfile = { id: string; name: string; color: string; kids: boolean };
type Progress = { id: string; progress: number; updatedAt: number };

type Ctx = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: WatchProfile | null;
  setProfile: (p: WatchProfile | null) => void;
  watchProfiles: WatchProfile[];
  refreshWatchProfiles: () => Promise<void>;
  createWatchProfile: (name: string, color: string, kids?: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (titleId: string) => Promise<void>;
  watchlist: string[];
  toggleWatchlist: (titleId: string) => Promise<void>;
  continueWatching: Progress[];
  updateProgress: (titleId: string, progress: number) => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);
const PROFILE_KEY = "streamtr.activeProfile";

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<WatchProfile | null>(() => {
    try { const v = localStorage.getItem(PROFILE_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
  });
  const [watchProfiles, setWatchProfiles] = useState<WatchProfile[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [continueWatching, setCW] = useState<Progress[]>([]);

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) {
        setProfileState(null);
        localStorage.removeItem(PROFILE_KEY);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s); setUser(s?.user ?? null); setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const setProfile = (p: WatchProfile | null) => {
    setProfileState(p);
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
  };

  const refreshWatchProfiles = useCallback(async () => {
    if (!user) { setWatchProfiles([]); return; }
    const { data } = await supabase.from("watch_profiles").select("*").order("created_at");
    setWatchProfiles((data ?? []) as WatchProfile[]);
  }, [user]);

  const createWatchProfile = async (name: string, color: string, kids = false) => {
    if (!user) return;
    const { error } = await supabase.from("watch_profiles").insert({ user_id: user.id, name, color, kids });
    if (error) {
      console.error("Watch profile create failed:", error);
      throw error;
    }
    await refreshWatchProfiles();
  };

  // Load watch profiles when user changes
  useEffect(() => { refreshWatchProfiles(); }, [refreshWatchProfiles]);

  // Load profile-scoped data
  const loadProfileData = useCallback(async () => {
    if (!user || !profile) {
      setFavorites([]); setWatchlist([]); setCW([]);
      return;
    }
    const [fav, wl, cw] = await Promise.all([
      supabase.from("favorites").select("title_id").eq("watch_profile_id", profile.id),
      supabase.from("watchlist").select("title_id").eq("watch_profile_id", profile.id),
      supabase.from("watch_progress").select("title_id, progress, updated_at").eq("watch_profile_id", profile.id).order("updated_at", { ascending: false }),
    ]);
    setFavorites((fav.data ?? []).map((r: any) => r.title_id));
    setWatchlist((wl.data ?? []).map((r: any) => r.title_id));
    setCW((cw.data ?? []).map((r: any) => ({ id: r.title_id, progress: r.progress, updatedAt: new Date(r.updated_at).getTime() })));
  }, [user, profile]);

  useEffect(() => { loadProfileData(); }, [loadProfileData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/profiller` },
    });
    return error ? { error: error.message } : {};
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const toggleFavorite = async (titleId: string) => {
    if (!user || !profile) return;
    if (favorites.includes(titleId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("watch_profile_id", profile.id).eq("title_id", titleId);
      setFavorites((f) => f.filter((x) => x !== titleId));
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, watch_profile_id: profile.id, title_id: titleId });
      setFavorites((f) => [...f, titleId]);
    }
  };

  const toggleWatchlist = async (titleId: string) => {
    if (!user || !profile) return;
    if (watchlist.includes(titleId)) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("watch_profile_id", profile.id).eq("title_id", titleId);
      setWatchlist((f) => f.filter((x) => x !== titleId));
    } else {
      await supabase.from("watchlist").insert({ user_id: user.id, watch_profile_id: profile.id, title_id: titleId });
      setWatchlist((f) => [...f, titleId]);
    }
  };

  const updateProgress = async (titleId: string, progress: number) => {
    if (!user || !profile) return;
    if (progress <= 0 || progress >= 0.98) {
      await supabase.from("watch_progress").delete().eq("user_id", user.id).eq("watch_profile_id", profile.id).eq("title_id", titleId);
      setCW((cw) => cw.filter((p) => p.id !== titleId));
      return;
    }
    await supabase.from("watch_progress").upsert(
      { user_id: user.id, watch_profile_id: profile.id, title_id: titleId, progress, updated_at: new Date().toISOString() },
      { onConflict: "user_id,watch_profile_id,title_id" }
    );
    setCW((cw) => [{ id: titleId, progress, updatedAt: Date.now() }, ...cw.filter((p) => p.id !== titleId)].slice(0, 12));
  };

  return (
    <AppContext.Provider value={{
      loading, user, session, profile, setProfile, watchProfiles, refreshWatchProfiles, createWatchProfile,
      signIn, signUp, logout, favorites, toggleFavorite, watchlist, toggleWatchlist,
      continueWatching, updateProgress,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
