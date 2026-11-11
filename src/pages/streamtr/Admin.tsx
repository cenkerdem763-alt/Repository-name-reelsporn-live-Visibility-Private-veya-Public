import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Film, ShieldAlert, Upload,
  RefreshCw, CheckCircle2, AlertTriangle, CircleOff, RotateCcw, Eye, EyeOff, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAllTitles } from "@/hooks/useContent";
import { useApp } from "@/contexts/AppContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { normalizePlayableSource, type Title } from "@/data/content";
import type { Tables } from "@/integrations/supabase/types";
import { VideoRecorderUpload } from "@/components/streamtr/VideoRecorderUpload";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getEmbedSource(value: string) {
  return value.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || value;
}

function normalizeSource(value: string | undefined) {
  return getEmbedSource(value || "").trim().replace(/\/+$/, "");
}

function getSourceKeys(value: string | undefined) {
  const raw = normalizeSource(value);
  const playable = normalizeSource(normalizePlayableSource(value));
  return [raw, playable].filter(Boolean);
}

function getEntrySourceKeys(entry: BulkEntry) {
  return [entry.source, ...getSourceKeys(entry.raw)].filter(Boolean);
}



type CsvImportRow = {
  title: string;
  videoUrl: string;
  embedUrl: string;
  posterUrl: string;
  duration: string;
  tags: string[];
  categories: string[];
  sourceId: string;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsvText(text: string): CsvImportRow[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '""';
      index += 1;
      continue;
    }
    if (char === '"') quoted = !quoted;
    if (char === '\n' && !quoted) {
      if (current.trim()) records.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) records.push(current);
  if (records.length < 2) return [];

  const headers = parseCsvLine(records[0]).map((value) => value.trim().toLowerCase());
  const column = (name: string) => headers.indexOf(name);
  const titleIndex = column("title");
  const videoIndex = column("video_url");
  const embedIndex = column("embed_url");
  const posterIndex = column("poster_url");
  const durationIndex = column("duration");
  const tagsIndex = column("tags");
  const categoriesIndex = column("categories");
  const sourceIdIndex = column("source_id");

  if (titleIndex < 0 || (videoIndex < 0 && embedIndex < 0)) {
    throw new Error("CSV içinde title ve video_url/embed_url kolonları bulunamadı.");
  }

  return records.slice(1).map((record) => {
    const cells = parseCsvLine(record);
    const get = (index: number) => index >= 0 ? String(cells[index] || "").trim() : "";
    return {
      title: get(titleIndex),
      videoUrl: get(videoIndex),
      embedUrl: get(embedIndex),
      posterUrl: get(posterIndex),
      duration: get(durationIndex),
      tags: get(tagsIndex).split(";").map((value) => value.trim()).filter(Boolean),
      categories: get(categoriesIndex).split(";").map((value) => value.trim()).filter(Boolean),
      sourceId: get(sourceIdIndex),
    };
  }).filter((row) => row.title && (row.embedUrl || row.videoUrl));
}

function formatCsvDuration(value: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  if (!minutes) return `${rest}sn`;
  return rest ? `${minutes}dk ${rest}sn` : `${minutes}dk`;
}

type BulkEntry = {
  raw: string;
  source: string;
  title?: string;
  description?: string;
  poster?: string;
  genres?: string[];
  preview?: string;
};

type VideoMetadata = {
  title?: string;
  description?: string;
  poster?: string;
  genres?: string[];
  preview?: string;
};

type SourceEntry = {
  url: string;
  title?: string;
  description?: string;
  poster?: string;
  preview?: string;
  genres?: string[];
};

type SourceImportResponse = {
  entries?: SourceEntry[];
  error?: string;
};

type PlaybackCheckResponse = {
  status?: "healthy" | "warning" | "broken";
  reason?: string;
  checkedAt?: string;
  checkedUrl?: string;
  error?: string;
};

type ArtworkManageResponse = {
  status?: Title["artworkStatus"];
  reason?: string;
  publicationStatus?: Title["publicationStatus"];
  error?: string;
};

type MaintenanceRun = Tables<"content_maintenance_runs">;

function getHostLabel(value: string) {
  try {
    const host = new URL(getEmbedSource(value)).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "Kaynak";
  } catch {
    return "Kaynak";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(value: number | null | undefined) {
  if (!value) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} sn`;
}

function getRunResults(run: MaintenanceRun) {
  return Array.isArray(run.results) ? (run.results as Array<Record<string, unknown>>) : [];
}

function parseBulkLines(value: string) {
  const seen = new Set<string>();

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): BulkEntry => {
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          raw: parts[1],
          source: normalizeSource(parts[1]),
          title: parts[0],
          poster: parts[2],
          genres: parts[3]?.split(",").map((genre) => genre.trim()).filter(Boolean),
          preview: parts[4],
        };
      }

      return {
        raw: line,
        source: normalizeSource(line),
      };
    })
    .filter((entry) => {
      const source = entry.source;
      if (!source || seen.has(source)) return false;
      seen.add(source);
      return true;
    });
}

async function fetchVideoMetadata(source: string): Promise<VideoMetadata | null> {
  try {
    const { data, error } = await supabase.functions.invoke<VideoMetadata>("fetch-video-metadata", {
      body: { url: source },
    });

    if (error) {
      console.warn("Video metadata could not be fetched:", error.message);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.warn("Video metadata could not be fetched:", error);
    return null;
  }
}

async function fetchVideoSource(sourceUrl: string, include: string, limit: number): Promise<SourceEntry[]> {
  const { data, error } = await supabase.functions.invoke<SourceImportResponse>("fetch-video-source", {
    body: { url: sourceUrl, include, limit },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data?.entries ?? [];
}

function mergeEntryMetadata(entry: BulkEntry, metadata: VideoMetadata | null): BulkEntry {
  if (!metadata) return entry;

  return {
    ...entry,
    title: entry.title || metadata.title,
    description: entry.description || metadata.description,
    poster: entry.poster || metadata.poster,
    genres: entry.genres?.length ? entry.genres : metadata.genres,
    preview: entry.preview || metadata.preview,
  };
}

function sourceEntryToBulkEntry(entry: SourceEntry): BulkEntry {
  return {
    raw: entry.url,
    source: normalizeSource(entry.url),
    title: entry.title,
    description: entry.description,
    poster: entry.poster,
    genres: entry.genres,
    preview: entry.preview,
  };
}

function getPlaybackStatusConfig(status: Title["playbackStatus"]) {
  switch (status) {
    case "healthy":
      return {
        label: "Sağlam",
        icon: CheckCircle2,
        className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      };
    case "warning":
      return {
        label: "Şüpheli",
        icon: AlertTriangle,
        className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      };
    case "broken":
      return {
        label: "Pasif",
        icon: CircleOff,
        className: "border-destructive/35 bg-destructive/10 text-destructive",
      };
    default:
      return {
        label: "Kontrolsüz",
        icon: RefreshCw,
        className: "border-white/12 bg-white/[0.045] text-muted-foreground",
      };
  }
}

function PlaybackStatusBadge({ item }: { item: Title }) {
  const config = getPlaybackStatusConfig(item.playbackStatus);
  const Icon = config.icon;

  return (
    <span
      title={item.playbackError || item.playbackCheckedAt || undefined}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function getArtworkStatusConfig(status: Title["artworkStatus"]) {
  switch (status) {
    case "cached":
      return {
        label: "Storage",
        icon: ImageIcon,
        className: "border-sky-400/30 bg-sky-400/10 text-sky-300",
      };
    case "healthy":
      return {
        label: "Sağlam",
        icon: CheckCircle2,
        className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      };
    case "warning":
      return {
        label: "Şüpheli",
        icon: AlertTriangle,
        className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
      };
    case "broken":
      return {
        label: "Bozuk",
        icon: CircleOff,
        className: "border-destructive/35 bg-destructive/10 text-destructive",
      };
    default:
      return {
        label: "Kontrolsüz",
        icon: RefreshCw,
        className: "border-white/12 bg-white/[0.045] text-muted-foreground",
      };
  }
}

function ArtworkStatusBadge({ item }: { item: Title }) {
  const config = getArtworkStatusConfig(item.artworkStatus);
  const Icon = config.icon;

  return (
    <span
      title={item.artworkError || item.artworkCheckedAt || undefined}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function PublicationStatusBadge({ item }: { item: Title }) {
  const isPublished = (item.publicationStatus ?? "published") === "published";
  const Icon = isPublished ? Eye : EyeOff;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${
        isPublished
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-white/12 bg-white/[0.045] text-muted-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {isPublished ? "Yayında" : "Kapalı"}
    </span>
  );
}

export default function Admin() {
  const { user } = useApp();
  const qc = useQueryClient();
  const { data: items = [] } = useAllTitles({ includeBroken: true });
  const isAdmin = useIsAdmin();
  const { data: maintenanceRuns = [] } = useQuery({
    queryKey: ["content-maintenance-runs"],
    enabled: isAdmin === true,
    queryFn: async (): Promise<MaintenanceRun[]> => {
      const { data, error } = await supabase
        .from("content_maintenance_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
  });
  const [tab, setTab] = useState<"icerik" | "bakim" | "kullanici" | "kategori" | "istatistik">("icerik");
  const [editing, setEditing] = useState<Title | null>(null);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvSaving, setCsvSaving] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvImportRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [artworkId, setArtworkId] = useState<string | null>(null);
  const [cachingAllArtwork, setCachingAllArtwork] = useState(false);
  const [draftVideoUrl, setDraftVideoUrl] = useState("");
  const [draftPreviewUrl, setDraftPreviewUrl] = useState("");
  const latestRun = maintenanceRuns[0];

  useEffect(() => {
    if (!open) return;
    setDraftVideoUrl(editing?.videoUrl || "");
    setDraftPreviewUrl(editing?.previewUrl || "");
  }, [editing?.id, editing?.previewUrl, editing?.videoUrl, open]);

  const stats = [
    { label: "Toplam İçerik", value: items.length, icon: Film },
    {
      label: "Yayında",
      value: items.filter((item) =>
        (item.publicationStatus ?? "published") === "published" &&
        item.playbackStatus !== "broken" &&
        item.artworkStatus !== "broken"
      ).length,
      icon: CheckCircle2,
    },
    { label: "Yayından Kalkmış", value: items.filter((item) => (item.publicationStatus ?? "published") !== "published").length, icon: EyeOff },
    { label: "Storage Görsel", value: items.filter((item) => item.artworkStatus === "cached").length, icon: ImageIcon },
  ];

  const save = async (form: FormData) => {
    const id = editing?.id || `${slugify(form.get("title") as string) || "video"}-${Date.now().toString(36)}`;
    const posterUrl = String(form.get("poster_url") || editing?.poster || "");
    const backdropUrl = String(form.get("backdrop_url") || editing?.backdrop || "");
    const artworkChanged = Boolean(editing && (posterUrl !== editing.poster || backdropUrl !== editing.backdrop));
    const payload = {
      id,
      title: String(form.get("title") || "Yeni İçerik"),
      description: String(form.get("description") || ""),
      year: Number(form.get("year") || 2025),
      duration: String(form.get("duration") || "1s 30dk"),
      rating: String(form.get("rating") || "13+"),
      type: (form.get("type") as "film" | "dizi") || "film",
      genres: String(form.get("genres") || "Dram").split(",").map((s) => s.trim()).filter(Boolean),
      poster_url: posterUrl,
      backdrop_url: backdropUrl,
      video_url: normalizePlayableSource(String(form.get("video_url") || editing?.videoUrl || "")) || "",
      trailer_url: String(form.get("preview_url") || editing?.previewUrl || form.get("video_url") || editing?.videoUrl || ""),
      featured: form.get("featured") === "on",
      match_score: editing?.match ?? 90,
      publication_status: String(form.get("publication_status") || editing?.publicationStatus || "published"),
      artwork_status: artworkChanged ? "unchecked" : editing?.artworkStatus || "unchecked",
      artwork_error: artworkChanged ? null : editing?.artworkError || null,
      poster_source_url: artworkChanged ? null : editing?.posterSourceUrl || null,
      backdrop_source_url: artworkChanged ? null : editing?.backdropSourceUrl || null,
    };
    const { error } = await supabase.from("titles").upsert(payload);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["titles"] });
    qc.invalidateQueries({ queryKey: ["featured-titles"] });
    qc.invalidateQueries({ queryKey: ["content-rows"] });
    toast({ title: editing ? "Güncellendi" : "Eklendi" });
    setEditing(null); setOpen(false);
  };

  const bulkSave = async (form: FormData) => {
    const lines = parseBulkLines(String(form.get("embed_lines") || ""));
    if (!lines.length) {
      toast({ title: "Link yok", description: "En az bir embed URL veya iframe kodu ekle.", variant: "destructive" });
      return;
    }

    const existingSources = new Set(items.flatMap((item) => [...getSourceKeys(item.videoUrl), ...getSourceKeys(item.trailerUrl)]));
    const newEntries = lines.filter((entry) => getEntrySourceKeys(entry).every((source) => !existingSources.has(source)));

    if (!newEntries.length) {
      toast({ title: "Yeni içerik yok", description: "Bu embedlerin tamamı zaten ekli.", variant: "destructive" });
      return;
    }

    setBulkSaving(true);
    try {
      const shouldFetchMetadata = form.get("auto_metadata") === "on";
      const enrichedEntries = shouldFetchMetadata
        ? await Promise.all(newEntries.map(async (entry) => mergeEntryMetadata(entry, await fetchVideoMetadata(entry.source))))
        : newEntries;

      const sourceName = String(form.get("source_name") || "").trim();
      const titlePrefix = String(form.get("title_prefix") || "Video").trim() || "Video";
      const titleMode = String(form.get("title_mode") || "auto");
      const defaultGenres = String(form.get("genres") || "Yeni")
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean);
      const defaultPoster = String(form.get("poster_url") || "").trim();
      const defaultBackdrop = String(form.get("backdrop_url") || defaultPoster).trim();
      const defaultPreview = String(form.get("preview_url") || "").trim();
      const now = Date.now().toString(36);

      const payloads = enrichedEntries.map((entry, index) => {
        const number = items.length + index + 1;
        const hostLabel = sourceName || getHostLabel(entry.source);
        const title =
          entry.title ||
          (titleMode === "source" ? `${hostLabel} Video ${number}` : `${titlePrefix} ${number}`);
        const id = `${slugify(title)}-${now}-${index}`;
        const poster = entry.poster || defaultPoster;

        return {
          id,
          title,
          description: String(form.get("description") || entry.description || "").trim(),
          year: Number(form.get("year") || new Date().getFullYear()),
          duration: String(form.get("duration") || "").trim(),
          rating: String(form.get("rating") || "18+").trim(),
          type: (form.get("type") as "film" | "dizi") || "film",
          genres: entry.genres?.length ? entry.genres : defaultGenres,
          poster_url: poster,
          backdrop_url: defaultBackdrop || poster,
          video_url: normalizePlayableSource(entry.raw) || entry.raw,
          trailer_url: entry.preview || defaultPreview || "",
          featured: form.get("featured") === "on",
          match_score: 90,
          publication_status: "published",
          artwork_status: "unchecked",
        };
      });

      const { error } = await supabase.from("titles").insert(payloads);
      if (error) {
        toast({ title: "Toplu ekleme hatası", description: error.message, variant: "destructive" });
        return;
      }

      await qc.invalidateQueries({ queryKey: ["titles"] });
      await qc.invalidateQueries({ queryKey: ["featured-titles"] });
      await qc.invalidateQueries({ queryKey: ["content-rows"] });
      toast({
        title: `${payloads.length} video eklendi`,
        description: lines.length - newEntries.length ? `${lines.length - newEntries.length} tekrar atlandı.` : undefined,
      });
      setBulkOpen(false);
    } finally {
      setBulkSaving(false);
    }
  };

  const importCsv = async () => {
    if (!csvRows.length) {
      toast({ title: "CSV boş", description: "Önce bir CSV dosyası seç.", variant: "destructive" });
      return;
    }

    const existingSources = new Set(items.flatMap((item) => [...getSourceKeys(item.videoUrl), ...getSourceKeys(item.trailerUrl)]));
    const seen = new Set(existingSources);
    const freshRows = csvRows.filter((row) => {
      const source = normalizePlayableSource(row.embedUrl || row.videoUrl) || row.embedUrl || row.videoUrl;
      const keys = getSourceKeys(source);
      if (!keys.length || keys.some((key) => seen.has(key))) return false;
      keys.forEach((key) => seen.add(key));
      return true;
    });

    if (!freshRows.length) {
      toast({ title: "Yeni içerik yok", description: "CSV içindeki videoların tamamı zaten ekli.", variant: "destructive" });
      return;
    }

    setCsvSaving(true);
    try {
      const now = Date.now().toString(36);
      const payloads = freshRows.map((row, index) => {
        const source = normalizePlayableSource(row.embedUrl || row.videoUrl) || row.embedUrl || row.videoUrl;
        const genres = row.categories.length ? row.categories : row.tags.slice(0, 6);
        return {
          id: `${slugify(row.title) || "video"}-${row.sourceId || now}-${index}`,
          title: row.title,
          description: "",
          year: new Date().getFullYear(),
          duration: formatCsvDuration(row.duration),
          rating: "18+",
          type: "film" as const,
          genres: genres.length ? genres : ["Yeni"],
          poster_url: row.posterUrl,
          backdrop_url: row.posterUrl,
          video_url: source,
          trailer_url: "",
          featured: false,
          match_score: 90,
          publication_status: "published",
          artwork_status: "unchecked",
        };
      });

      const chunkSize = 100;
      for (let start = 0; start < payloads.length; start += chunkSize) {
        const { error } = await supabase.from("titles").insert(payloads.slice(start, start + chunkSize));
        if (error) throw error;
      }

      await qc.invalidateQueries({ queryKey: ["titles"] });
      await qc.invalidateQueries({ queryKey: ["featured-titles"] });
      await qc.invalidateQueries({ queryKey: ["content-rows"] });
      toast({
        title: `${payloads.length} video CSV'den eklendi`,
        description: csvRows.length - freshRows.length ? `${csvRows.length - freshRows.length} tekrar atlandı.` : csvFileName,
      });
      setCsvOpen(false);
      setCsvRows([]);
      setCsvFileName("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "CSV içe aktarılamadı.";
      toast({ title: "CSV içe aktarma hatası", description: message, variant: "destructive" });
    } finally {
      setCsvSaving(false);
    }
  };

  const sourceSave = async (form: FormData) => {
    const sourceUrl = String(form.get("source_url") || "").trim();
    if (!sourceUrl) {
      toast({ title: "Kaynak URL yok", description: "RSS, sitemap, JSON veya izinli liste sayfası URL'si ekle.", variant: "destructive" });
      return;
    }

    setSourceSaving(true);
    try {
      const limit = Number(form.get("limit") || 25);
      const include = String(form.get("include") || "").trim();
      const sourceEntries = await fetchVideoSource(sourceUrl, include, limit);
      const lines = sourceEntries.map(sourceEntryToBulkEntry).filter((entry) => entry.source);

      if (!lines.length) {
        toast({ title: "Video bulunamadı", description: "Kaynakta okunabilir embed/video linki yok veya filtre çok dar.", variant: "destructive" });
        return;
      }

      const existingSources = new Set(items.flatMap((item) => [...getSourceKeys(item.videoUrl), ...getSourceKeys(item.trailerUrl)]));
      const newEntries = lines.filter((entry) => getEntrySourceKeys(entry).every((source) => !existingSources.has(source)));

      if (!newEntries.length) {
        toast({ title: "Yeni içerik yok", description: "Kaynakta bulunan videoların tamamı zaten ekli.", variant: "destructive" });
        return;
      }

      const shouldFetchMetadata = form.get("auto_metadata") === "on";
      const enrichedEntries = shouldFetchMetadata
        ? await Promise.all(newEntries.map(async (entry) => mergeEntryMetadata(entry, await fetchVideoMetadata(entry.source))))
        : newEntries;

      const sourceName = String(form.get("source_name") || "").trim();
      const titlePrefix = String(form.get("title_prefix") || "Video").trim() || "Video";
      const titleMode = String(form.get("title_mode") || "auto");
      const defaultGenres = String(form.get("genres") || "Yeni")
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean);
      const defaultPoster = String(form.get("poster_url") || "").trim();
      const defaultBackdrop = String(form.get("backdrop_url") || defaultPoster).trim();
      const defaultPreview = String(form.get("preview_url") || "").trim();
      const now = Date.now().toString(36);

      const payloads = enrichedEntries.map((entry, index) => {
        const number = items.length + index + 1;
        const hostLabel = sourceName || getHostLabel(entry.source);
        const title =
          entry.title ||
          (titleMode === "source" ? `${hostLabel} Video ${number}` : `${titlePrefix} ${number}`);
        const id = `${slugify(title)}-${now}-${index}`;
        const poster = entry.poster || defaultPoster;

        return {
          id,
          title,
          description: String(form.get("description") || entry.description || "").trim(),
          year: Number(form.get("year") || new Date().getFullYear()),
          duration: String(form.get("duration") || "").trim(),
          rating: String(form.get("rating") || "18+").trim(),
          type: (form.get("type") as "film" | "dizi") || "film",
          genres: entry.genres?.length ? entry.genres : defaultGenres,
          poster_url: poster,
          backdrop_url: defaultBackdrop || poster,
          video_url: normalizePlayableSource(entry.raw) || entry.raw,
          trailer_url: entry.preview || defaultPreview || "",
          featured: form.get("featured") === "on",
          match_score: 90,
          publication_status: "published",
          artwork_status: "unchecked",
        };
      });

      const { error } = await supabase.from("titles").insert(payloads);
      if (error) {
        toast({ title: "Kaynak ekleme hatası", description: error.message, variant: "destructive" });
        return;
      }

      await qc.invalidateQueries({ queryKey: ["titles"] });
      await qc.invalidateQueries({ queryKey: ["featured-titles"] });
      await qc.invalidateQueries({ queryKey: ["content-rows"] });
      toast({
        title: `${payloads.length} video eklendi`,
        description: lines.length - newEntries.length ? `${lines.length - newEntries.length} tekrar atlandı.` : "Otomatik kaynak içeriğe işlendi.",
      });
      setSourceOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kaynak okunamadı.";
      toast({ title: "Kaynak taranamadı", description: message, variant: "destructive" });
    } finally {
      setSourceSaving(false);
    }
  };

  const setPlaybackStatus = async (
    item: Title,
    status: NonNullable<Title["playbackStatus"]>,
    errorText = "",
    checkedAt: string | null = new Date().toISOString(),
  ) => {
    const { error } = await supabase
      .from("titles")
      .update({
        playback_status: status,
        playback_checked_at: checkedAt,
        playback_error: errorText || null,
        publication_status: status === "broken" ? "unpublished" : item.publicationStatus || "published",
      })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Durum güncellenemedi", description: error.message, variant: "destructive" });
      return false;
    }

    await qc.invalidateQueries({ queryKey: ["titles"] });
    await qc.invalidateQueries({ queryKey: ["title", item.id] });
    await qc.invalidateQueries({ queryKey: ["featured-titles"] });
    await qc.invalidateQueries({ queryKey: ["content-rows"] });
    return true;
  };

  const setPublicationStatus = async (item: Title, status: NonNullable<Title["publicationStatus"]>) => {
    const { error } = await supabase
      .from("titles")
      .update({ publication_status: status })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Yayın durumu güncellenemedi", description: error.message, variant: "destructive" });
      return false;
    }

    await qc.invalidateQueries({ queryKey: ["titles"] });
    await qc.invalidateQueries({ queryKey: ["title", item.id] });
    await qc.invalidateQueries({ queryKey: ["featured-titles"] });
    await qc.invalidateQueries({ queryKey: ["content-rows"] });
    toast({ title: status === "published" ? "Yayına alındı" : "Yayından kaldırıldı" });
    return true;
  };

  const cacheArtwork = async (item: Title, quiet = false) => {
    const posterUrl = item.posterSourceUrl || item.poster;
    const backdropUrl = item.backdropSourceUrl || item.backdrop || posterUrl;
    if (!posterUrl || posterUrl === "/placeholder.svg") {
      if (!quiet) toast({ title: "Poster yok", description: "Önce poster URL ekle.", variant: "destructive" });
      return "broken";
    }

    setArtworkId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke<ArtworkManageResponse>("manage-title-artwork", {
        body: {
          titleId: item.id,
          posterUrl,
          backdropUrl,
          publishOnSuccess: true,
        },
      });
      const status = data?.status || "broken";
      const reason = error?.message || data?.error || data?.reason || "Görsel kontrol edilemedi.";

      await qc.invalidateQueries({ queryKey: ["titles"] });
      await qc.invalidateQueries({ queryKey: ["title", item.id] });
      await qc.invalidateQueries({ queryKey: ["featured-titles"] });
      await qc.invalidateQueries({ queryKey: ["content-rows"] });

      if (!quiet) {
        toast({
          title: status === "cached" ? "Görsel storage'a alındı" : status === "broken" ? "Görsel bozuk" : "Görsel kontrol edildi",
          description: reason,
          variant: status === "broken" ? "destructive" : undefined,
        });
      }

      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Görsel kontrol edilemedi.";
      if (!quiet) toast({ title: "Görsel kontrol edilemedi", description: message, variant: "destructive" });
      return "broken";
    } finally {
      setArtworkId(null);
    }
  };

  const cacheAllArtwork = async () => {
    const candidates = items.filter((item) => item.poster && item.poster !== "/placeholder.svg");
    if (!candidates.length) {
      toast({ title: "Kontrol edilecek görsel yok", variant: "destructive" });
      return;
    }

    setCachingAllArtwork(true);
    try {
      const counts = { cached: 0, healthy: 0, warning: 0, broken: 0, unchecked: 0 };
      for (const item of candidates) {
        const status = await cacheArtwork(item, true);
        counts[status as keyof typeof counts] += 1;
      }
      toast({
        title: "Görsel sabitleme tamam",
        description: `${counts.cached} storage, ${counts.healthy} sağlam, ${counts.warning} şüpheli, ${counts.broken} yayından kaldırıldı.`,
      });
    } finally {
      setCachingAllArtwork(false);
    }
  };

  const checkPlayback = async (item: Title, quiet = false) => {
    const source = item.videoUrl || item.trailerUrl;
    if (!source) {
      await setPlaybackStatus(item, "broken", "Video/embed URL yok.");
      if (!quiet) toast({ title: "Pasife alındı", description: "Video/embed URL yok.", variant: "destructive" });
      return "broken";
    }

    setCheckingId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke<PlaybackCheckResponse>("check-video-source", {
        body: { url: source, strictMediaCheck: false },
      });
      const status = data?.status || "broken";
      const reason = error?.message || data?.error || data?.reason || "Kaynak kontrol edilemedi.";
      const checkedAt = data?.checkedAt || new Date().toISOString();
      await setPlaybackStatus(item, status, reason, checkedAt);
      if (!quiet) {
        toast({
          title: status === "healthy" ? "Video sağlam" : status === "warning" ? "Video şüpheli" : "Video pasife alındı",
          description: reason,
          variant: status === "broken" ? "destructive" : undefined,
        });
      }
      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kaynak kontrol edilemedi.";
      await setPlaybackStatus(item, "broken", message);
      if (!quiet) toast({ title: "Video pasife alındı", description: message, variant: "destructive" });
      return "broken";
    } finally {
      setCheckingId(null);
    }
  };

  const checkAllPlayback = async () => {
    const candidates = items.filter((item) => item.videoUrl || item.trailerUrl);
    if (!candidates.length) {
      toast({ title: "Kontrol edilecek video yok", variant: "destructive" });
      return;
    }

    setCheckingAll(true);
    try {
      const counts = { healthy: 0, warning: 0, broken: 0 };
      for (const item of candidates) {
        const status = await checkPlayback(item, true);
        counts[status as keyof typeof counts] += 1;
      }
      toast({
        title: "Kaynak kontrolü tamam",
        description: `${counts.healthy} sağlam, ${counts.warning} şüpheli, ${counts.broken} pasif.`,
      });
    } finally {
      setCheckingAll(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Bu içeriği silmek istediğinden emin misin?")) return;
    const previousTitles = qc.getQueryData<Title[]>(["titles"]);
    qc.setQueryData<Title[]>(["titles"], (current) => current?.filter((item) => item.id !== id) ?? []);
    const { error, data } = await supabase.from("titles").delete().eq("id", id).select("id");
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }
    if (!data?.length) {
      toast({
        title: "Silinemedi",
        description: "Veritabanı kaydı silmedi. Admin rolü veya delete policy eksik olabilir.",
        variant: "destructive",
      });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }

    const { data: stillExists, error: verifyError } = await supabase
      .from("titles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (verifyError) {
      toast({ title: "Kontrol edilemedi", description: verifyError.message, variant: "destructive" });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }
    if (stillExists) {
      toast({
        title: "Silinemedi",
        description: "Kayıt silme isteğinden sonra veritabanında hâlâ duruyor.",
        variant: "destructive",
      });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }

    await qc.invalidateQueries({ queryKey: ["titles"] });
    await qc.invalidateQueries({ queryKey: ["title", id] });
    await qc.invalidateQueries({ queryKey: ["featured-titles"] });
    await qc.invalidateQueries({ queryKey: ["content-rows"] });
    toast({ title: "Silindi" });
  };

  if (isAdmin === null) {
    return <div className="pt-32 px-10 text-muted-foreground">Yetki kontrol ediliyor...</div>;
  }
  if (!isAdmin) {
    return (
      <div className="pt-32 px-10 max-w-xl mx-auto text-center space-y-4">
        <ShieldAlert className="h-14 w-14 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">Yetkin yok</h1>
        <p className="text-muted-foreground">
          Yönetim paneline erişmek için <strong>admin</strong> rolüne ihtiyacın var.
          Bir yetkili sana rol vermelidir veya geliştirici aşağıdaki SQL ile ilk admini atayabilir.
        </p>
        <pre className="text-left text-xs bg-card border border-border rounded p-4 overflow-x-auto">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${user?.id ?? "<KULLANICI_ID>"}', 'admin')
ON CONFLICT DO NOTHING;`}
        </pre>
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 md:px-10 pb-20">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Yönetim Paneli</h1>
          <p className="text-muted-foreground text-sm">İçerikleri ve platformu yönet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />Yeni İçerik
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "İçeriği Düzenle" : "Yeni İçerik Ekle"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3">
                <Input name="title" defaultValue={editing?.title} placeholder="Başlık" required />
                <Textarea name="description" defaultValue={editing?.description} placeholder="Açıklama" rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <Input name="year" type="number" defaultValue={editing?.year ?? 2025} placeholder="Yıl" />
                  <Input name="duration" defaultValue={editing?.duration} placeholder="Süre" />
                  <Input name="rating" defaultValue={editing?.rating ?? "18+"} placeholder="Yaş Sınırı" />
                  <select name="type" defaultValue={editing?.type ?? "film"} className="h-10 rounded-md bg-input border border-border px-3">
                    <option value="film">Video</option><option value="dizi">Seri</option>
                  </select>
                  <select name="publication_status" defaultValue={editing?.publicationStatus ?? "published"} className="h-10 rounded-md bg-input border border-border px-3">
                    <option value="published">Yayında</option>
                    <option value="unpublished">Yayından kaldırıldı</option>
                    <option value="draft">Taslak</option>
                  </select>
                </div>
                <Input name="genres" defaultValue={editing?.genres.join(", ")} placeholder="Türler (virgülle)" />
                <Input name="poster_url" defaultValue={editing?.poster} placeholder="Poster URL" />
                <Input name="backdrop_url" defaultValue={editing?.backdrop} placeholder="Arka plan URL" />
                <Textarea
                  name="video_url"
                  value={draftVideoUrl}
                  onChange={(event) => setDraftVideoUrl(event.target.value)}
                  placeholder='Video URL, embed URL veya iframe kodu. Örn: /videos/ornek.mp4 ya da <iframe src="..."></iframe>'
                  rows={3}
                />
                <VideoRecorderUpload
                  onUploaded={(url) => {
                    setDraftVideoUrl(url);
                    setDraftPreviewUrl((current) => current || url);
                  }}
                />
                <Input
                  name="preview_url"
                  value={draftPreviewUrl}
                  onChange={(event) => setDraftPreviewUrl(event.target.value)}
                  placeholder="Önizleme MP4 URL (hover için)"
                />
                <label className="flex items-center gap-3">
                  <Switch name="featured" defaultChecked={editing?.featured} />
                  <span className="text-sm">Ana sayfa hero slider'da göster</span>
                </label>
                <DialogFooter>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">Kaydet</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={csvOpen} onOpenChange={(next) => {
            setCsvOpen(next);
            if (!next && !csvSaving) { setCsvRows([]); setCsvFileName(""); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />CSV Yükle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border max-w-xl">
              <DialogHeader><DialogTitle>CSV ile Toplu Video Ekle</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
                  Cleaner çıktısını doğrudan seçebilirsin. Beklenen kolonlar: <strong>title</strong>, <strong>embed_url</strong> veya <strong>video_url</strong>, <strong>poster_url</strong>, <strong>duration</strong>, <strong>tags</strong>, <strong>categories</strong>, <strong>source_id</strong>.
                </div>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={csvSaving}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const rows = parseCsvText(await file.text());
                      setCsvRows(rows);
                      setCsvFileName(file.name);
                      toast({ title: `${rows.length} satır okundu`, description: file.name });
                    } catch (error) {
                      setCsvRows([]);
                      setCsvFileName(file.name);
                      const message = error instanceof Error ? error.message : "CSV okunamadı.";
                      toast({ title: "CSV okunamadı", description: message, variant: "destructive" });
                    }
                  }}
                />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-muted-foreground">Dosya</div>
                    <div className="font-medium truncate">{csvFileName || "Seçilmedi"}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-muted-foreground">Okunan video</div>
                    <div className="font-medium">{csvRows.length}</div>
                  </div>
                </div>
                {csvRows.length > 0 && (
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <div className="font-medium mb-1">İlk kayıt</div>
                    <div className="text-muted-foreground truncate">{csvRows[0].title}</div>
                    <div className="text-xs text-muted-foreground truncate mt-1">{csvRows[0].embedUrl || csvRows[0].videoUrl}</div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCsvOpen(false)} disabled={csvSaving}>Vazgeç</Button>
                <Button onClick={importCsv} disabled={!csvRows.length || csvSaving} className="bg-primary hover:bg-primary/90">
                  {csvSaving ? "Ekleniyor..." : `${csvRows.length || 0} Videoyu Ekle`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
              <s.icon className="h-8 w-8 text-primary" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {[["icerik","İçerikler"],["bakim","Bakım"],["kullanici","Kullanıcılar"],["kategori","Kategoriler"],["istatistik","İstatistikler"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "icerik" && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">İçerik</th>
                <th className="p-3 hidden md:table-cell">Tür</th>
                <th className="p-3 hidden md:table-cell">Yıl</th>
                <th className="p-3 hidden lg:table-cell">Yayın</th>
                <th className="p-3 hidden lg:table-cell">Oynatma</th>
                <th className="p-3 hidden lg:table-cell">Görsel</th>
                <th className="p-3 hidden lg:table-cell">Türler</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="p-3 flex items-center gap-3">
                    <img src={it.poster} alt="" className="h-12 w-9 object-cover rounded" />
                    <div className="font-medium">{it.title}</div>
                  </td>
                  <td className="p-3 hidden md:table-cell uppercase text-xs">{it.type}</td>
                  <td className="p-3 hidden md:table-cell">{it.year}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <PublicationStatusBadge item={it} />
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <PlaybackStatusBadge item={it} />
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <ArtworkStatusBadge item={it} />
                  </td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground text-sm">{it.genres.join(", ")}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Kaynağı kontrol et"
                        disabled={checkingAll || checkingId === it.id}
                        onClick={() => checkPlayback(it)}
                      >
                        <RefreshCw className={`h-4 w-4 ${checkingId === it.id ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Görseli storage'a al"
                        disabled={cachingAllArtwork || artworkId === it.id}
                        onClick={() => cacheArtwork(it)}
                      >
                        <ImageIcon className={`h-4 w-4 ${artworkId === it.id ? "animate-pulse" : "text-sky-300"}`} />
                      </Button>
                      {(it.publicationStatus ?? "published") === "published" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Yayından kaldır"
                          onClick={() => setPublicationStatus(it, "unpublished")}
                        >
                          <EyeOff className="h-4 w-4 text-amber-300" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Yayına al"
                          onClick={() => setPublicationStatus(it, "published")}
                        >
                          <Eye className="h-4 w-4 text-emerald-300" />
                        </Button>
                      )}
                      {it.playbackStatus === "broken" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Oynatmayı tekrar kontrole aç"
                          onClick={() => setPlaybackStatus(it, "unchecked", "Manuel olarak tekrar kontrole açıldı.", null)}
                        >
                          <RotateCcw className="h-4 w-4 text-emerald-300" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(it); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "bakim" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            {[
              ["İşlenen", latestRun?.processed_count ?? 0],
              ["Storage", latestRun?.cached_count ?? 0],
              ["Sağlam", latestRun?.healthy_count ?? 0],
              ["Şüpheli", latestRun?.warning_count ?? 0],
              ["Bozuk", latestRun?.broken_count ?? 0],
              ["Kapalı", latestRun?.unpublished_count ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
            <div>
              <div className="text-sm font-semibold">Son bakım</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {latestRun ? `${formatDateTime(latestRun.started_at)} • ${formatDuration(latestRun.duration_ms)} • ${latestRun.source}` : "Henüz bakım kaydı yok."}
              </div>
            </div>
            <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ["content-maintenance-runs"] })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Kaynak</th>
                  <th className="p-3 hidden md:table-cell">Başlangıç</th>
                  <th className="p-3 hidden md:table-cell">Süre</th>
                  <th className="p-3">Özet</th>
                  <th className="p-3 hidden lg:table-cell">Detay</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRuns.map((run) => {
                  const results = getRunResults(run);
                  return (
                    <tr key={run.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${
                            run.status === "success"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : "border-destructive/35 bg-destructive/10 text-destructive"
                          }`}
                        >
                          {run.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          {run.status === "success" ? "Başarılı" : "Hata"}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-medium">{run.source}</td>
                      <td className="p-3 hidden md:table-cell text-sm text-muted-foreground">{formatDateTime(run.started_at)}</td>
                      <td className="p-3 hidden md:table-cell text-sm text-muted-foreground">{formatDuration(run.duration_ms)}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {run.processed_count} işlenen, {run.cached_count} storage, {run.broken_count} bozuk
                      </td>
                      <td className="p-3 hidden lg:table-cell max-w-md text-xs text-muted-foreground">
                        {run.error_message ? (
                          <span className="text-destructive">{run.error_message}</span>
                        ) : results.length ? (
                          results.slice(0, 3).map((result) => String(result.id || "")).join(", ")
                        ) : (
                          "İşlenecek kayıt yok"
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!maintenanceRuns.length && (
                  <tr>
                    <td className="p-8 text-center text-sm text-muted-foreground" colSpan={6}>
                      Henüz bakım kaydı yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab !== "icerik" && tab !== "bakim" && (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          Bu bölüm yakında.
        </div>
      )}
    </div>
  );
}
