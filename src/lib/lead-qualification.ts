import type {
  CategoryKey,
  Establishment,
  EstablishmentContact,
  EstablishmentDetails,
  SignalLevel,
} from "./types";

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
  const website = getTag(tags, ["website", "contact:website"]) !== null;
  const instagram =
    getTag(tags, ["contact:instagram", "instagram"]) !== null;
  const facebook = getTag(tags, ["contact:facebook", "facebook"]) !== null;
  const email = getTag(tags, ["email", "contact:email"]) !== null;
  const phone =
    getTag(tags, ["phone", "contact:phone", "contact:mobile", "mobile", "contact:whatsapp"]) !==
    null;

  const signalCount = [website, instagram, facebook, email].filter(Boolean).length;

  let level: SignalLevel;
  if (signalCount === 0) level = "zero";
  else if (signalCount === 1) level = "weak";
  else level = "full";

  return { signals: { website, instagram, facebook, email, phone }, signalCount, level };
}

function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function instagramFromValue(value: string | null): {
  handle: string | null;
  url: string | null;
} {
  if (!value) return { handle: null, url: null };
  const cleaned = value.trim();
  const match = cleaned.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  const handle = match?.[1] ?? cleaned.replace(/^@/, "").split(/[/?\s]/)[0] ?? null;
  if (!handle) return { handle: null, url: null };
  return { handle: `@${handle}`, url: `https://instagram.com/${handle}` };
}

function buildContact(tags: Record<string, string>): EstablishmentContact {
  const phoneRaw = getTag(tags, [
    "contact:whatsapp",
    "contact:mobile",
    "mobile",
    "phone",
    "contact:phone",
  ]);
  const phoneDigits = phoneRaw ? phoneRaw.replace(/\D/g, "") : null;
  const whatsappSource = getTag(tags, ["contact:whatsapp", "whatsapp"]);
  const whatsappDigits = whatsappSource
    ? whatsappSource.replace(/\D/g, "")
    : phoneDigits;

  const ig = instagramFromValue(getTag(tags, ["contact:instagram", "instagram"]));

  return {
    phoneRaw,
    phoneDigits,
    whatsappUrl:
      whatsappDigits && whatsappDigits.length >= 8
        ? `https://wa.me/${whatsappDigits}`
        : null,
    instagramHandle: ig.handle,
    instagramUrl: ig.url,
    facebookUrl: normalizeUrl(getTag(tags, ["contact:facebook", "facebook"])),
    websiteUrl: normalizeUrl(getTag(tags, ["website", "contact:website"])),
    email: getTag(tags, ["email", "contact:email"]),
  };
}

const CUISINE_LABELS: Record<string, string> = {
  pizza: "Pizzaria",
  burger: "Hamburgueria",
  regional: "Regional",
  brazilian: "Brasileira",
  italian: "Italiana",
  japanese: "Japonesa",
  chinese: "Chinesa",
  coffee_shop: "Cafeteria",
  ice_cream: "Sorveteria",
  sandwich: "Sanduíches",
  bakery: "Padaria",
  barbecue: "Churrasco",
  steak_house: "Steakhouse",
  seafood: "Frutos do mar",
  vegetarian: "Vegetariana",
  mexican: "Mexicana",
  arab: "Árabe",
};

function formatCuisine(value: string | null): string | null {
  if (!value) return null;
  return value
    .split(";")
    .map((c) => CUISINE_LABELS[c.trim()] ?? c.trim().replace(/_/g, " "))
    .join(", ");
}

function buildDetails(tags: Record<string, string>): EstablishmentDetails {
  return {
    cuisine: formatCuisine(getTag(tags, ["cuisine"])),
    openingHours: getTag(tags, ["opening_hours"]),
    priceRange: getTag(tags, ["price_range", "price"]),
    street: getTag(tags, ["addr:street"]),
    housenumber: getTag(tags, ["addr:housenumber"]),
    neighbourhood: getTag(tags, ["addr:suburb", "addr:neighbourhood"]),
    city: getTag(tags, ["addr:city"]),
    state: getTag(tags, ["addr:state"]),
    postcode: getTag(tags, ["addr:postcode"]),
    takeaway: getTag(tags, ["takeaway"]),
    delivery: getTag(tags, ["delivery"]),
    outdoorSeating: getTag(tags, ["outdoor_seating"]),
    wheelchair: getTag(tags, ["wheelchair"]),
    smoking: getTag(tags, ["smoking"]),
    vegetarian: getTag(tags, ["diet:vegetarian"]),
    airConditioning: getTag(tags, ["air_conditioning"]),
    capacity: getTag(tags, ["capacity", "capacity:seats"]),
    brand: getTag(tags, ["brand"]),
    operator: getTag(tags, ["operator"]),
  };
}

function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  const street = tags["addr:street"];
  const housenumber = tags["addr:housenumber"];
  if (street) {
    parts.push(housenumber ? `${street}, ${housenumber}` : street);
  }
  const suburb = tags["addr:suburb"] ?? tags["addr:neighbourhood"];
  if (suburb) parts.push(suburb);
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
    const contact = buildContact(tags);
    const details = buildDetails(tags);
    const address = buildAddress(tags);

    results.push({
      id: `${el.type}-${el.id}`,
      osmType: el.type,
      osmId: el.id,
      name,
      category: normalizeCategory(categoryRaw),
      address,
      lat,
      lon,
      tags,
      signals,
      contact,
      details,
      contactable: Boolean(contact.whatsappUrl || contact.instagramUrl),
      signalCount,
      level,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${name} ${address || `${lat},${lon}`}`
      )}`,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    });
  }

  return results;
}
