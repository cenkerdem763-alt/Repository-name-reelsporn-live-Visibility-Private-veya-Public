import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CONTENT_BUCKET = "content";
const MAX_IMAGE_BYTES = 8_000_000;
const FETCH_TIMEOUT_MS = 10_000;

function readEnvFile() {
  try {
    return Object.fromEntries(
      readFileSync(".env", "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const [key, ...valueParts] = line.split("=");
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          return [key, value];
        }),
    );
  } catch {
    return {};
  }
}

function getServiceRoleKey(projectRef) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;

  const raw = execFileSync(
    "supabase",
    ["projects", "api-keys", "--project-ref", projectRef, "-o", "json"],
    { encoding: "utf8" },
  );
  const keys = JSON.parse(raw);
  const serviceRole = keys.find((key) => key.id === "service_role" || key.name === "service_role");
  if (!serviceRole?.api_key || serviceRole.api_key.includes("··")) {
    throw new Error("Service role key could not be read from Supabase CLI.");
  }
  return serviceRole.api_key;
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function safeRemoteUrl(value) {
  const url = new URL(value.startsWith("//") ? `https:${value}` : value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http(s) artwork urls are allowed");
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("[") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("Local and private network artwork urls are not allowed");
  }
  return url.toString();
}

function isRelativeOrAlreadyManaged(value, supabaseUrl) {
  if (!value || value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.toString().startsWith(`${supabaseUrl}/storage/v1/object/public/${CONTENT_BUCKET}/`);
  } catch {
    return false;
  }
}

function extensionFrom(contentType, url) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  const ext = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return ext && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext) ? ext : "jpg";
}

async function fetchImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; VizyonKeyfiArtworkBackfill/1.0)",
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) throw new Error(`Artwork returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Artwork is not an image (${contentType || "unknown content type"})`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error("Artwork is too large");

  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) throw new Error("Artwork is empty");
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("Artwork is too large");

  return { buffer, contentType };
}

async function cacheArtwork(supabase, supabaseUrl, titleId, kind, rawUrl) {
  const sourceUrl = (rawUrl || "").trim();
  if (!sourceUrl) return { kind, status: "broken", url: "", reason: `${kind} URL missing.` };
  if (isRelativeOrAlreadyManaged(sourceUrl, supabaseUrl)) {
    return { kind, status: "healthy", url: sourceUrl, sourceUrl };
  }

  try {
    const remoteUrl = safeRemoteUrl(sourceUrl);
    const image = await fetchImage(remoteUrl);
    const ext = extensionFrom(image.contentType, remoteUrl);
    const safeTitleId = titleId.replace(/[^a-z0-9_-]/gi, "-").slice(0, 96);
    const path = `titles/${safeTitleId}/${kind}.${ext}`;
    const { error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .upload(path, new Blob([image.buffer], { type: image.contentType }), {
        contentType: image.contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path);
    return { kind, status: "cached", url: data.publicUrl, sourceUrl: remoteUrl };
  } catch (error) {
    return {
      kind,
      status: "broken",
      url: "",
      sourceUrl,
      reason: error instanceof Error ? error.message : "Artwork could not be cached",
    };
  }
}

async function main() {
  const env = { ...readEnvFile(), ...process.env };
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const projectRef = env.VITE_SUPABASE_PROJECT_ID || new URL(supabaseUrl).hostname.split(".")[0];
  const serviceRoleKey = getServiceRoleKey(projectRef);
  const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 1000);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: items, error } = await supabase
    .from("titles")
    .select("id,title,poster_url,backdrop_url,poster_source_url,backdrop_source_url,artwork_status")
    .neq("artwork_status", "cached")
    .limit(limit);

  if (error) throw error;
  const counts = { cached: 0, healthy: 0, warning: 0, broken: 0 };

  for (const item of items || []) {
    const posterUrl = item.poster_source_url || item.poster_url;
    const backdropUrl = item.backdrop_source_url || item.backdrop_url || posterUrl;
    const poster = await cacheArtwork(supabase, supabaseUrl, item.id, "poster", posterUrl);
    const backdrop =
      backdropUrl === posterUrl && poster.url
        ? { kind: "backdrop", status: poster.status, url: poster.url, sourceUrl: poster.sourceUrl, reason: poster.reason }
        : await cacheArtwork(supabase, supabaseUrl, item.id, "backdrop", backdropUrl);
    const status =
      poster.status === "broken"
        ? "broken"
        : backdrop.status === "broken"
          ? "warning"
          : poster.status === "cached" || backdrop.status === "cached"
            ? "cached"
            : "healthy";
    const reasons = [poster.reason, backdrop.reason].filter(Boolean).join(" ");
    const now = new Date().toISOString();
    const updatePayload = {
      poster_url: poster.url || item.poster_url,
      backdrop_url: backdrop.url || poster.url || item.backdrop_url || item.poster_url,
      poster_source_url: poster.sourceUrl || item.poster_source_url || item.poster_url || null,
      backdrop_source_url: backdrop.sourceUrl || item.backdrop_source_url || item.backdrop_url || poster.sourceUrl || item.poster_url || null,
      artwork_status: status,
      artwork_checked_at: now,
      artwork_cached_at: status === "cached" ? now : null,
      artwork_error: reasons || null,
      publication_status: status === "broken" ? "unpublished" : "published",
    };

    const { error: updateError } = await supabase.from("titles").update(updatePayload).eq("id", item.id);
    if (updateError) throw updateError;

    counts[status] += 1;
    const label = status.padEnd(7);
    console.log(`${label} ${item.id}`);
  }

  console.log(
    `Done. cached=${counts.cached} healthy=${counts.healthy} warning=${counts.warning} broken=${counts.broken}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
