import { createServerFn } from "@tanstack/react-start";
import type { BoundingBox, GeoPoint } from "./types";
import { CATEGORY_BY_KEY, type OsmKey } from "./categories";

const UA = "SinalZeroLeadScanner/1.0 (lead prospecting tool)";
const NO_WEBSITE_FILTER = "__NO_WEBSITE__";

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

interface NominatimResult { lat: string; lon: string; osm_type?: string; osm_id?: number; display_name?: string; boundingbox?: [string,string,string,string]; }

export const geocodeCityServer = createServerFn({ method: "POST" })
  .validator((data: { country: string; state?: string | null; city: string }) => data)
  .handler(async ({ data }): Promise<GeoPoint> => {
    const query = data.state ? `${data.city}, ${data.state}, ${data.country}` : `${data.city}, ${data.country}`;
    const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?format=json&limit=8&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json", "User-Agent": UA } }, 20000);
    if (!response.ok) throw new Error(`Não foi possível localizar "${data.city}" agora (código ${response.status}). Tente novamente em alguns segundos.`);
    const results = (await response.json()) as NominatimResult[];
    const chosen = results.find((r) => r.osm_type === "relation") ?? results[0];
    if (!chosen) throw new Error(`"${data.city}" não foi encontrada. Tente sem bairro e sem abreviações, ou escolha uma cidade vizinha.`);
    let areaId: number | null = null;
    if (chosen.osm_id) {
      if (chosen.osm_type === "relation") areaId = 3600000000 + chosen.osm_id;
      else if (chosen.osm_type === "way") areaId = 2400000000 + chosen.osm_id;
    }
    const bb = chosen.boundingbox;
    return { lat: Number.parseFloat(chosen.lat), lon: Number.parseFloat(chosen.lon), areaId, displayName: chosen.display_name ?? null, boundingBox: bb ? { south: Number.parseFloat(bb[0]!), north: Number.parseFloat(bb[1]!), west: Number.parseFloat(bb[2]!), east: Number.parseFloat(bb[3]!) } : null };
  });

const OVERPASS_MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.openstreetmap.fr/api/interpreter"];

export interface OverpassElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string,string>; }

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function buildSelectors(categories: string[]): string[] {
  const byKey = new Map<OsmKey, Set<string>>();
  for (const key of categories) {
    if (key === NO_WEBSITE_FILTER) continue;
    const def = CATEGORY_BY_KEY[key];
    if (!def) continue;
    const set = byKey.get(def.osmKey) ?? new Set<string>();
    for (const value of def.osmValue.split(";")) { if (value.trim()) set.add(value.trim()); }
    byKey.set(def.osmKey, set);
  }
  return [...byKey.entries()].map(([osmKey, values]) => `["${osmKey}"~"^(${[...values].map(escapeRegex).join("|")})$"]`);
}

function hasWebsite(tags: Record<string,string>): boolean {
  return ["website", "contact:website", "url"].some((key) => {
    const value = tags[key];
    return Boolean(value && value.trim());
  });
}

export const searchOverpassServer = createServerFn({ method: "POST" })
  .validator((data: { area: BoundingBox; areaId?: number | null; categories: string[] }) => data)
  .handler(async ({ data }): Promise<{ elements: OverpassElement[]; exact: boolean }> => {
    const wantsNoWebsite = data.categories.includes(NO_WEBSITE_FILTER);
    const selectors = buildSelectors(data.categories);
    if (selectors.length === 0) return { elements: [], exact: false };
    const bbox = `${data.area.south},${data.area.west},${data.area.north},${data.area.east}`;
    const buildQuery = (useArea: boolean) => {
      const scope = useArea ? "(area.searchArea)" : `(${bbox})`;
      const head = useArea ? `area(${data.areaId})->.searchArea;\n` : "";
      const body = selectors.map((sel) => `  nwr${sel}${scope};`).join("\n");
      return `[out:json][timeout:90];\n${head}(\n${body}\n);\nout tags center 3000;`;
    };
    const attempts: { query:string; exact:boolean }[] = [];
    if (data.areaId) attempts.push({ query: buildQuery(true), exact: true });
    attempts.push({ query: buildQuery(false), exact: false });
    const errors: string[] = [];
    for (const attempt of attempts) {
      for (const mirror of OVERPASS_MIRRORS) {
        try {
          const response = await fetchWithTimeout(mirror, { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded", "User-Agent":UA}, body:`data=${encodeURIComponent(attempt.query)}` }, 95000);
          if (!response.ok) { errors.push(`${mirror}: ${response.status}`); continue; }
          const json = (await response.json()) as { elements?: OverpassElement[] };
          let elements = json.elements ?? [];
          if (wantsNoWebsite) elements = elements.filter((element) => !hasWebsite(element.tags ?? {}));
          if (elements.length === 0 && attempt.exact) break;
          return { elements, exact: attempt.exact };
        } catch (error) { errors.push(`${mirror}: ${(error as Error).message}`); }
      }
    }
    throw new Error(`Os servidores do OpenStreetMap estão sobrecarregados agora. Tente novamente em alguns segundos. (${errors.slice(0,3).join(" | ")})`);
  });
