import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { buildRowsFromTitles, fallbackRows, fallbackTitles, fetchJsonTitles, mapTitle, temporaryTestTitles, type Title, type Row } from "@/data/content";
import {
  buildWordPressRows,
  fetchWordPressTitle,
  fetchWordPressTitles,
  hasWordPressConfig,
} from "@/integrations/wordpress/client";

const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const useLocalJson = import.meta.env.VITE_CONTENT_SOURCE === "json" || (!hasSupabaseConfig && !hasWordPressConfig);
type ContentRowItem = Tables<"content_row_items"> & { titles: Tables<"titles"> | null };
type TitleQueryOptions = { includeBroken?: boolean };

function withoutBrokenTitles(titles: Title[], includeBroken = false) {
  return includeBroken
    ? titles
    : titles.filter((title) =>
        (title.publicationStatus ?? "published") === "published" &&
        title.playbackStatus !== "broken" &&
        title.artworkStatus !== "broken"
      );
}

async function fetchBackupTitles(includeBroken = false) {
  if (hasSupabaseConfig) {
    const { data, error } = await supabase.from("titles").select("*").order("created_at", { ascending: false });
    if (error) {
      console.warn("Using fallback titles because Supabase titles failed:", error.message);
      return withoutBrokenTitles(fallbackTitles, includeBroken);
    }

    const titles = (data ?? []).map(mapTitle);
    return withoutBrokenTitles(titles.length ? titles : fallbackTitles, includeBroken);
  }

  try {
    return withoutBrokenTitles(await fetchJsonTitles(), includeBroken);
  } catch (error) {
    console.warn("Using fallback titles because local JSON titles failed:", error);
    return withoutBrokenTitles(fallbackTitles, includeBroken);
  }
}

async function fetchWordPressTitlesOnly(includeBroken = false) {
  try {
    const titles = withoutBrokenTitles(await fetchWordPressTitles(), includeBroken);
    return titles.length ? titles : temporaryTestTitles;
  } catch (error) {
    console.warn("WordPress titles failed:", error);
    return temporaryTestTitles;
  }
}

async function buildSupabaseRowsFromTitles() {
  return buildRowsFromTitles(await fetchBackupTitles());
}

export function useAllTitles(options: TitleQueryOptions = {}) {
  const includeBroken = options.includeBroken ?? false;
  return useQuery({
    queryKey: ["titles", hasWordPressConfig ? "wordpress" : "supabase", includeBroken ? "all" : "playable"],
    queryFn: async (): Promise<Title[]> => {
      if (useLocalJson) {
        return withoutBrokenTitles(await fetchJsonTitles(), includeBroken);
      }

      if (hasWordPressConfig) {
        return fetchWordPressTitlesOnly(includeBroken);
      }

      return fetchBackupTitles(includeBroken);
    },
  });
}

export function useTitle(id: string | undefined) {
  return useQuery({
    queryKey: ["title", hasWordPressConfig ? "wordpress" : "supabase", id],
    enabled: !!id,
    queryFn: async (): Promise<Title | null> => {
      if (useLocalJson) {
        const titles = await fetchJsonTitles();
        return titles.find((title) => title.id === id) ?? null;
      }

      if (hasWordPressConfig) {
        return (await fetchWordPressTitle(id!)) ?? temporaryTestTitles.find((title) => title.id === id) ?? null;
      }

      const { data, error } = await supabase.from("titles").select("*").eq("id", id!).maybeSingle();
      if (error) {
        console.warn("Using fallback title because Supabase title failed:", error.message);
        return fallbackTitles.find((title) => title.id === id) ?? null;
      }
      const title = data ? mapTitle(data) : (hasSupabaseConfig ? null : fallbackTitles.find((title) => title.id === id) ?? null);
      return title &&
        (title.publicationStatus ?? "published") === "published" &&
        title.playbackStatus !== "broken" &&
        title.artworkStatus !== "broken"
        ? title
        : null;
    },
  });
}

export function useFeaturedTitles() {
  return useQuery({
    queryKey: ["featured-titles", hasWordPressConfig ? "wordpress" : "supabase"],
    queryFn: async (): Promise<Title[]> => {
      if (useLocalJson) {
        const titles = await fetchJsonTitles();
        return titles.filter((title) => title.featured);
      }

      if (hasWordPressConfig) {
        const titles = await fetchWordPressTitlesOnly();
        return titles.filter((title) => title.featured);
      }

      const { data, error } = await supabase.from("titles").select("*").eq("featured", true).order("match_score", { ascending: false });
      if (error) {
        console.warn("Using fallback featured titles because Supabase featured titles failed:", error.message);
        return withoutBrokenTitles(fallbackTitles.filter((title) => title.featured));
      }
      const titles = (data ?? []).map(mapTitle);
      return withoutBrokenTitles(hasSupabaseConfig ? titles : fallbackTitles.filter((title) => title.featured));
    },
  });
}

export function useContentRows() {
  return useQuery({
    queryKey: ["content-rows", hasWordPressConfig ? "wordpress" : "supabase"],
    queryFn: async (): Promise<Row[]> => {
      if (useLocalJson) {
        const titles = await fetchJsonTitles();
        return buildRowsFromTitles(titles);
      }

      if (hasWordPressConfig) {
        const titles = await fetchWordPressTitlesOnly();
        return buildWordPressRows(titles);
      }

      const { data: rows, error: e1 } = await supabase.from("content_rows").select("id, title, position").order("position");
      if (e1) {
        console.warn("Using Supabase titles because content rows failed:", e1.message);
        return hasSupabaseConfig ? buildSupabaseRowsFromTitles() : fallbackRows;
      }

      if (!rows?.length) {
        return hasSupabaseConfig
          ? buildSupabaseRowsFromTitles()
          : buildRowsFromTitles(withoutBrokenTitles(fallbackRows.flatMap((row) => row.items)));
      }

      const { data: items, error: e2 } = await supabase
        .from("content_row_items")
        .select("row_id, position, titles(*)")
        .order("position");
      if (e2) {
        console.warn("Using Supabase titles because content row items failed:", e2.message);
        return hasSupabaseConfig ? buildSupabaseRowsFromTitles() : fallbackRows;
      }

      const mappedRows = rows.map((r) => ({
        title: r.title,
        items: ((items ?? []) as ContentRowItem[])
          .filter((it): it is ContentRowItem & { titles: Tables<"titles"> } => it.row_id === r.id && Boolean(it.titles))
          .map((it) => mapTitle(it.titles))
          .filter((title) =>
            (title.publicationStatus ?? "published") === "published" &&
            title.playbackStatus !== "broken" &&
            title.artworkStatus !== "broken"
          ),
      }));
      if (hasSupabaseConfig && !mappedRows.some((row) => row.items.length)) {
        return buildSupabaseRowsFromTitles();
      }

      return hasSupabaseConfig
        ? mappedRows
        : mappedRows.some((row) => row.items.length)
          ? mappedRows
          : fallbackRows;
    },
  });
}
