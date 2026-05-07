import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fallbackRows, fallbackTitles, mapTitle, type Title, type Row } from "@/data/content";

const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export function useAllTitles() {
  return useQuery({
    queryKey: ["titles"],
    queryFn: async (): Promise<Title[]> => {
      const { data, error } = await supabase.from("titles").select("*").order("created_at", { ascending: false });
      if (error) {
        console.warn("Using fallback titles because Supabase titles failed:", error.message);
        return fallbackTitles;
      }
      const titles = (data ?? []).map(mapTitle);
      return hasSupabaseConfig ? titles : fallbackTitles;
    },
  });
}

export function useTitle(id: string | undefined) {
  return useQuery({
    queryKey: ["title", id],
    enabled: !!id,
    queryFn: async (): Promise<Title | null> => {
      const { data, error } = await supabase.from("titles").select("*").eq("id", id!).maybeSingle();
      if (error) {
        console.warn("Using fallback title because Supabase title failed:", error.message);
        return fallbackTitles.find((title) => title.id === id) ?? null;
      }
      return data ? mapTitle(data) : (hasSupabaseConfig ? null : fallbackTitles.find((title) => title.id === id) ?? null);
    },
  });
}

export function useFeaturedTitles() {
  return useQuery({
    queryKey: ["featured-titles"],
    queryFn: async (): Promise<Title[]> => {
      const { data, error } = await supabase.from("titles").select("*").eq("featured", true).order("match_score", { ascending: false });
      if (error) {
        console.warn("Using fallback featured titles because Supabase featured titles failed:", error.message);
        return fallbackTitles.filter((title) => title.featured);
      }
      const titles = (data ?? []).map(mapTitle);
      return hasSupabaseConfig ? titles : fallbackTitles.filter((title) => title.featured);
    },
  });
}

export function useContentRows() {
  return useQuery({
    queryKey: ["content-rows"],
    queryFn: async (): Promise<Row[]> => {
      const { data: rows, error: e1 } = await supabase.from("content_rows").select("id, title, position").order("position");
      if (e1) {
        console.warn("Using fallback rows because Supabase content rows failed:", e1.message);
        return fallbackRows;
      }
      if (!rows?.length) return hasSupabaseConfig ? [] : fallbackRows;
      const { data: items, error: e2 } = await supabase
        .from("content_row_items")
        .select("row_id, position, titles(*)")
        .order("position");
      if (e2) {
        console.warn("Using fallback rows because Supabase content row items failed:", e2.message);
        return fallbackRows;
      }
      const mappedRows = rows.map((r) => ({
        title: r.title,
        items: (items ?? [])
          .filter((it: any) => it.row_id === r.id && it.titles)
          .map((it: any) => mapTitle(it.titles)),
      }));
      return hasSupabaseConfig ? mappedRows : (mappedRows.some((row) => row.items.length) ? mappedRows : fallbackRows);
    },
  });
}
