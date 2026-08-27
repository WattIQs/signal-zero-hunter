import type { CategoryKey, City, Country, GeoPoint, State } from "./types";
import { CATEGORY_BY_KEY } from "./categories";

const DEFAULT_RETRIES = 3;
const INITIAL_DELAY_MS = 500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delayMs?: number; context?: string } = {}
): Promise<T> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  let delay = options.delayMs ?? INITIAL_DELAY_MS;
  const context = options.context ? ` (${options.context})` : "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try { return await fn(); } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Tentativa ${attempt} falhou${context}. Retentando em ${delay}ms...`);
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error(`Falha após ${retries} tentativas${context}`);
}

const FALLBACK_COUNTRIES: Country[] = [
  { name: "Brazil" }, { name: "United States" }, { name: "Argentina" },
  { name: "Portugal" }, { name: "Spain" }, { name: "Mexico" },
  { name: "Chile" }, { name: "Colombia" }, { name: "France" }, { name: "Italy" },
];

export async function fetchCountries(): Promise<Country[]> {
  return fetchWithRetry(async () => {
    const response = await fetch("https://countries.dev/countries?fields=name&sort=name");
    if (!response.ok) throw new Error(`Erro ao carregar países: ${response.status}`);
    const data = (await response.json()) as { name: string }[] | Country[];
    if (!Array.isArray(data) || data.length === 0) throw new Error("Resposta de países vazia ou inválida");
    return data.map((item) => ({ name: item.name }));
  }, { context: "lista de países" }).catch(() => FALLBACK_COUNTRIES);
}

export async function fetchStates(country: string): Promise<State[]> {
  return fetchWithRetry(async () => {
    const response = await fetch("https://countriesnow.space/api/v0.1/countries/states", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country }) });
    const data = (await response.json()) as { error?: boolean; msg?: string; data?: { states?: { name: string }[] } };
    if (data.error) throw new Error(data.msg || "Erro ao carregar estados");
    return (data.data?.states ?? []).map((s) => ({ name: s.name }));
  }, { context: `estados de ${country}` });
}

export async function fetchCitiesByState(country: string, state: string): Promise<City[]> {
  return fetchWithRetry(async () => {
    const response = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country, state }) });
    const data = (await response.json()) as { error?: boolean; msg?: string; data?: string[] };
    if (data.error) throw new Error(data.msg || "Erro ao carregar cidades");
    return (data.data ?? []).map((name) => ({ name }));
  }, { context: `cidades de ${state}, ${country}` });
}

export async function fetchCitiesByCountry(country: string): Promise<City[]> {
  return fetchWithRetry(async () => {
    const response = await fetch("https://countriesnow.space/api/v0.1/countries/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country }) });
    const data = (await response.json()) as { error?: boolean; msg?: string; data?: string[] };
    if (data.error) throw new Error(data.msg || "Erro ao carregar cidades do país");
    return (data.data ?? []).map((name) => ({ name }));
  }, { context: `cidades do país ${country}` });
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

export async function geocodeCity(country: string, state: string | null, city: string): Promise<GeoPoint> {
  const query = state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
  return fetchWithRetry(async () => {
    const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, { headers: { Accept: "application/json" } }, 12000);
    if (!response.ok) throw new Error(`Nominatim respondeu ${response.status}`);
    const results = (await response.json()) as { lat: string; lon: string; boundingbox?: [string, string, string, string] }[];
    const first = results?.[0];
    if (!first) throw new Error("Cidade não encontrada. Tente simplificar o nome (sem bairro ou acentos).");
    const bb = first.boundingbox;
    return { lat: Number.parseFloat(first.lat), lon: Number.parseFloat(first.lon), boundingBox: bb ? { south: Number.parseFloat(bb[0]), north: Number.parseFloat(bb[1]), west: Number.parseFloat(bb[2]), east: Number.parseFloat(bb[3]) } : null };
  }, { retries: 2, context: "geocodificação da cidade" });
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildOverpassQuery(area: { south: number; north: number; west: number; east: number }, categories: CategoryKey[]): string {
  const bbox = `${area.south},${area.west},${area.north},${area.east}`;
  const selected = categories.map((key) => CATEGORY_BY_KEY[key]).filter(Boolean);
  if (selected.length === 0) throw new Error("Selecione ao menos uma categoria válida.");

  const filters = new Map<string, Set<string>>();
  for (const category of selected) {
    const values = filters.get(category.osmKey) ?? new Set<string>();
    for (const value of category.osmValue.split(";")) values.add(value);
    filters.set(category.osmKey, values);
  }

  const queries: string[] = [];
  for (const [osmKey, values] of filters) {
    const pattern = [...values].map(escapeRegex).join("|");
    const filter = `["${osmKey}"~"^(${pattern})$"]`;
    queries.push(`node${filter}(${bbox});`, `way${filter}(${bbox});`, `relation${filter}(${bbox});`);
  }
  return `[out:json][timeout:60];\n(\n${queries.join("\n")}\n);\nout center tags 400;\n`;
}

export async function searchOverpass(area: { south: number; north: number; west: number; east: number }, categories: CategoryKey[]): Promise<{ elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] }> {
  const query = buildOverpassQuery(area, categories);
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      return await fetchWithRetry(async () => {
        const response = await fetchWithTimeout(mirror, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent(query)}` }, 60000);
        if (!response.ok) throw new Error(`Overpass respondeu ${response.status}`);
        return (await response.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
      }, { retries: 2, context: `Overpass ${mirror}` });
    } catch (error) { console.warn(`Mirror falhou: ${mirror}`, error); }
  }
  throw new Error("Nenhum espelho do Overpass respondeu. Tente novamente em alguns segundos.");
}
