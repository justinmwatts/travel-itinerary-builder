import { env } from "../config/env";

// Pexels cover resolution. The key is server-side only; the browser renders from
// our stored URL, never from a client-side provider call (design.md section 9).
// Results are cached by normalized query so repeat locations are free and the
// 200/hour, 20,000/month limits are respected. Misses are cached too, so a
// location with no photo is not re-queried.
export interface ResolvedImage {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

interface PexelsPhoto {
  url: string;
  photographer: string;
  alt: string | null;
  src: { landscape?: string; large?: string; original?: string };
}
interface PexelsSearchResponse {
  photos?: PexelsPhoto[];
}

const cache = new Map<string, ResolvedImage | null>();

export async function resolvePexelsImage(query: string): Promise<ResolvedImage | null> {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  if (!env.PEXELS_KEY) {
    cache.set(key, null);
    return null;
  }

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");

    const res = await fetch(url, { headers: { Authorization: env.PEXELS_KEY } });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data = (await res.json()) as PexelsSearchResponse;
    const photo = data.photos?.[0];
    const src = photo?.src.landscape ?? photo?.src.large ?? photo?.src.original;
    if (!photo || !src) {
      cache.set(key, null);
      return null;
    }

    const resolved: ResolvedImage = {
      url: src,
      alt: photo.alt ?? query,
      credit: photo.photographer,
      creditUrl: photo.url,
    };
    cache.set(key, resolved);
    return resolved;
  } catch {
    cache.set(key, null);
    return null;
  }
}
