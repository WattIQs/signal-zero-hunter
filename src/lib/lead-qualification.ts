import type { CategoryKey, Establishment, SignalLevel } from "./types";

function getTag(tags: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = tags[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function classifySignals(tags: Record<string, string>) {
  const website =
    getTag(tags, ["website", "contact:website"]) !== null;
  const instagram =
    getTag(tags, ["contact:instagram"]) !== null;
  const facebook =
    getTag(tags, ["contact:facebook"]) !== null;
  const email =
    getTag(tags, ["email", "contact:email"]) !== null;
  const phone =
    getTag(tags, ["phone", "contact:phone"]) !== null;

  const signalCount = [website, instagram, facebook, email].filter(Boolean).length;

  let level: SignalLevel;
  if (signalCount === 0) level = "zero";
  else if (signalCount === 1) level = "weak";
  else level = "full";

  return { signals: { website, instagram, facebook, email, phone }, signalCount, level };
}

function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  const street = tags["addr:street"];
  const housenumber = tags["addr:housenumber"];
  if (street) {
    parts.push(housenumber ? `${street}, ${housenumber}` : street);
  }
  const city = tags["addr:city"];
  if (city) parts.push(city);
  const state = tags["addr:state"];
  if (state) parts.push(state);
  const postcode = tags["addr:postcode"];
  if (postcode) parts.push(postcode);

  return parts.join(" — ") || "";
}

function normalizeCategory(raw: string): string {
  const map: Record<string, string> = {
    restaurant: "Restaurante",
    fast_food: "Lanchonete",
    cafe: "Café",
    bar: "Bar",
    pub: "Pub",
  };
  return map[raw] || raw;
}

export function processOverpassResults(
  elements: {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }[],
  _categories: CategoryKey[]
): Establishment[] {
  const results: Establishment[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags["name"]?.trim();
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const categoryRaw = tags["amenity"] ?? "restaurant";
    const { signals, signalCount, level } = classifySignals(tags);

    results.push({
      id: `${el.type}-${el.id}`,
      name,
      category: normalizeCategory(categoryRaw),
      address: buildAddress(tags),
      lat,
      lon,
      tags,
      signals,
      signalCount,
      level,
    });
  }

  return results;
}
