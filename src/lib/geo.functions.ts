import { createServerFn } from "@tanstack/react-start";
import type { BoundingBox, CategoryKey, GeoPoint } from "./types";
import { CATEGORY_AMENITY } from "./types";

const UA = "SinalZeroLeadScanner/1.0 (lead prospecting tool)";

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const geocodeCityServer = createServerFn({ method: "POST" })
  .inputValidator((data: { country: string; state?: string | null; city: string }) => data)
  .handler(async ({ data }): Promise<GeoPoint> => {
    const query = data.state
      ? `${data.city}, ${data.state}, ${data.country}`
      : `${data.city}, ${data.country}`;

    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json", "User-Agent": UA } },
      20000
    );
    if (!response.ok) {
      throw new Error(
        `Não foi possível localizar a cidade agora (código ${response.status}). Tente novamente em alguns segundos.`
      );
    }
    const results = (await response.json()) as {
      lat: string;
      lon: string;
      boundingbox?: [string, string, string, string];
    }[];
    const first = results[0];
    if (!first) {
      throw new Error(
        "Cidade não encontrada. Tente escrever o nome sem bairro e sem abreviações."
      );
    }
    const bb = first.boundingbox;
    return {
      lat: Number.parseFloat(first.lat),
      lon: Number.parseFloat(first.lon),
      boundingBox: bb
        ? {
            south: Number.parseFloat(bb[0]!),
            north: Number.parseFloat(bb[1]!),
            west: Number.parseFloat(bb[2]!),
            east: Number.parseFloat(bb[3]!),
          }
        : null,
    };
  });

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export const searchOverpassServer = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { area: BoundingBox; categories: CategoryKey[] }) => data
  )
  .handler(async ({ data }): Promise<{ elements: OverpassElement[] }> => {
    const { area, categories } = data;
    const amenities = categories.map((c) => CATEGORY_AMENITY[c]);
    const bbox = `${area.south},${area.west},${area.north},${area.east}`;
    const filter = `["amenity"~"^(${amenities.join("|")})$"]`;
    const query = `[out:json][timeout:50];
(
  node${filter}(${bbox});
  way${filter}(${bbox});
);
out tags center 1200;`;

    const errors: string[] = [];
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const response = await fetchWithTimeout(
          mirror,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": UA,
            },
            body: `data=${encodeURIComponent(query)}`,
          },
          55000
        );
        if (!response.ok) {
          errors.push(`${mirror}: ${response.status}`);
          continue;
        }
        const json = (await response.json()) as { elements?: OverpassElement[] };
        return { elements: json.elements ?? [] };
      } catch (error) {
        errors.push(`${mirror}: ${(error as Error).message}`);
      }
    }

    throw new Error(
      `Os servidores do OpenStreetMap estão sobrecarregados agora. Tente novamente em alguns segundos. (${errors.join(" | ")})`
    );
  });
