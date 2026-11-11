import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "video.other";
  robots?: string;
  jsonLd?: Record<string, unknown>;
};

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.reelsporn.live").replace(/\/$/, "");

function absoluteUrl(value = "/") {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

function setJsonLd(value?: Record<string, unknown>) {
  const id = "reelsporn-seo-jsonld";
  const current = document.getElementById(id);
  if (!value) {
    current?.remove();
    return;
  }

  const element = current || document.createElement("script");
  element.id = id;
  element.type = "application/ld+json";
  element.textContent = JSON.stringify(value);
  if (!current) document.head.appendChild(element);
}

export function Seo({
  title,
  description,
  path = "/",
  image = "/content/hero-1.jpg",
  type = "website",
  robots = "index,follow",
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const url = absoluteUrl(path);
    const imageUrl = absoluteUrl(image);

    document.title = title;
    setCanonical(url);
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", imageUrl);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
    setJsonLd(jsonLd);
  }, [description, image, jsonLd, path, robots, title, type]);

  return null;
}
