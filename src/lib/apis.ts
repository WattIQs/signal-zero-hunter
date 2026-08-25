import type { CategoryKey, City, Country, GeoPoint, State } from "./types";
import { CATEGORY_AMENITY } from "./types";

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
    try {
      return await fn();
    } catch (error) {
      const isLast = attempt === retries;
      if (isLast) {
        throw error;
      }
      console.warn(`Tentativa ${attempt} falhou${context}. Retentando em ${delay}ms...`);
      await sleep(delay);
      delay *= 2;
    }
  }

  throw new Error(`Falha após ${retries} tentativas${context}`);
}

const FALLBACK_COUNTRIES: Country[] = [
  { name: "Brazil" },
  { name: "United States" },
  { name: "Argentina" },
  { name: "Portugal" },
  { name: "Spain" },
  { name: "Mexico" },
  { name: "Chile" },
  { name: "Colombia" },
  { name: "France" },
  { name: "Italy" },
];

export async function fetchCountries(): Promise<Country[]> {
  return fetchWithRetry(
    async () => {
      const response = await fetch(
        "https://countries.dev/countries?fields=name&sort=name"
      );
      if (!response.ok) {
        throw new Error(`Erro ao carregar países: ${response.status}`);
      }
      const data = (await response.json()) as { name: string }[] | Country[];
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Resposta de países vazia ou inválida");
      }
      return data.map((item) => ({ name: item.name }));
    },
    { context: "lista de países" }
  ).catch(() => {
    console.warn("countries.dev falhou; usando lista de países fallback.");
    return FALLBACK_COUNTRIES;
  });
}

export async function fetchStates(country: string): Promise<State[]> {
  return fetchWithRetry(
    async () => {
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/states",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country }),
        }
      );
      const data = (await response.json()) as {
        error?: boolean;
        msg?: string;
        data?: { states?: { name: string }[] };
      };
      if (data.error) {
        throw new Error(data.msg || "Erro ao carregar estados");
      }
      const states = data.data?.states ?? [];
      return states.map((s) => ({ name: s.name }));
    },
    { context: `estados de ${country}` }
  );
}

export async function fetchCitiesByState(
  country: string,
  state: string
): Promise<City[]> {
  return fetchWithRetry(
    async () => {
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country, state }),
        }
      );
      const data = (await response.json()) as {
        error?: boolean;
        msg?: string;
        data?: string[];
      };
      if (data.error) {
        throw new Error(data.msg || "Erro ao carregar cidades");
      }
      return (data.data ?? []).map((name) => ({ name }));
    },
    { context: `cidades de ${state}, ${country}` }
  );
}

export async function fetchCitiesByCountry(country: string): Promise<City[]> {
  return fetchWithRetry(
    async () => {
      const response = await fetch(
        "https://countriesnow.space/api/v0.1/countries/cities",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country }),
        }
      );
      const data = (await response.json()) as {
        error?: boolean;
        msg?: string;
        data?: string[];
      };
      if (data.error) {
        throw new Error(data.msg || "Erro ao carregar cidades do país");
      }
      return (data.data ?? []).map((name) => ({ name }));
    },
    { context: `cidades do país ${country}` }
  );
}

export async function geocodeCity(
  country: string,
  state: string | null,
  city: string
): Promise<GeoPoint> {
  const query = state
    ? `${city}, ${state}, ${country}`
    : `${city}, ${country}`;

  return fetchWithRetry(
    async () => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "SinalZero/1.0",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Nominatim respondeu ${response.status}`);
      }
      const results = (await response.json()) as {
        lat: string;
        lon: string;
      }[];
      const first = results?.[0];
      if (!first) {
        throw new Error(
          "Cidade não encontrada. Tente simplificar o nome (sem bairro ou acentos)."
        );
      }
      return {
        lat: Number.parseFloat(first.lat),
        lon: Number.parseFloat(first.lon),
      };
    },
    { context: "geocodificação da cidade" }
  );
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

function buildOverpassQuery(
  lat: number,
  lon: number,
  radius: number,
  categories: CategoryKey[]
): string {
  const amenities = categories.map((c) => CATEGORY_AMENITY[c]);
  const amenityFilter = amenities.map((a) => `node["amenity"="${a}"];`).join("\n    ");
  return `
[out:json][timeout:25];
(
  node["amenity"~"^(${amenities.join("|")})$"](around:${radius},${lat},${lon});
  way["amenity"~"^(${amenities.join("|")})$"](around:${radius},${lat},${lon});
  relation["amenity"~"^(${amenities.join("|")})$"](around:${radius},${lat},${lon});
);
out center tags 100;
`;
}

export async function searchOverpass(
  lat: number,
  lon: number,
  radius: number,
  categories: CategoryKey[]
): Promise<{
  elements: {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }[];
}> {
  const query = buildOverpassQuery(lat, lon, radius, categories);

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      return await fetchWithRetry(
        async () => {
          const response = await fetch(mirror, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(query)}`,
          });
          if (!response.ok) {
            throw new Error(`Overpass respondeu ${response.status}`);
          }
          const data = (await response.json()) as {
            elements: {
              type: string;
              id: number;
              lat?: number;
              lon?: number;
              center?: { lat: number; lon: number };
              tags?: Record<string, string>;
            }[];
          };
          return data;
        },
        { context: `Overpass ${mirror}` }
      );
    } catch (error) {
      console.warn(`Mirror falhou: ${mirror}`, error);
    }
  }

  throw new Error(
    "Nenhum espelho do Overpass respondeu. Tente novamente em alguns segundos."
  );
}
