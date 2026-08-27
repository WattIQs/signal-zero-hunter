import type {
  Establishment,
  EstablishmentContact,
  EstablishmentDetails,
  SignalLevel,
} from "./types";
import { CATEGORIES, labelFromTags } from "./categories";

function getTag(tags: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = tags[key];
    if (value && value.trim().length > 0) return value.trim();
  }
  return null;
}

export function classifySignals(tags: Record<string, string>) {
  const website = getTag(tags, ["website", "contact:website", "url"]) !== null;
  const instagram = getTag(tags, ["contact:instagram", "instagram"]) !== null;
  const facebook = getTag(tags, ["contact:facebook", "facebook"]) !== null;
  const email = getTag(tags, ["email", "contact:email"]) !== null;
  const phone = getTag(tags, ["phone", "contact:phone", "contact:mobile", "mobile", "contact:whatsapp", "whatsapp"]) !== null;
  const signalCount = [website, instagram, facebook, email].filter(Boolean).length;
  const level: SignalLevel = signalCount === 0 ? "zero" : signalCount === 1 ? "weak" : "full";
  return { signals: { website, instagram, facebook, email, phone }, signalCount, level };
}

function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function instagramFromValue(value: string | null): { handle: string | null; url: string | null } {
  if (!value) return { handle: null, url: null };
  const cleaned = value.trim();
  const match = cleaned.match(/(?:instagram\.com\/|^@)([A-Za-z0-9_.]+)/i);
  const handle = match?.[1] ?? cleaned.split(/[/?\s]/)[0];
  if (!handle) return { handle: null, url: null };
  const normalizedHandle = handle.replace(/^@/, "");
  return { handle: `@${normalizedHandle}`, url: `https://instagram.com/${normalizedHandle}` };
}

function normalizePhoneDigits(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function buildWhatsappUrl(value: string | null): string | null {
  const digits = normalizePhoneDigits(value);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function buildContact(tags: Record<string, string>): EstablishmentContact {
  const phoneRaw = getTag(tags, ["contact:mobile", "mobile", "phone", "contact:phone", "contact:whatsapp", "whatsapp"]);
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  const whatsappRaw = getTag(tags, ["contact:whatsapp", "whatsapp"]);
  const ig = instagramFromValue(getTag(tags, ["contact:instagram", "instagram"]));
  return {
    phoneRaw,
    phoneDigits,
    // Prefer an explicitly tagged WhatsApp number; otherwise expose the published
    // phone through the same direct wa.me action the app historically used.
    whatsappUrl: buildWhatsappUrl(whatsappRaw ?? phoneRaw),
    instagramHandle: ig.handle,
    instagramUrl: ig.url,
    facebookUrl: normalizeUrl(getTag(tags, ["contact:facebook", "facebook"])),
    websiteUrl: normalizeUrl(getTag(tags, ["website", "contact:website", "url"])),
    email: getTag(tags, ["email", "contact:email"]),
  };
}

const CUISINE_LABELS: Record<string, string> = {
  pizza: "Pizzaria", burger: "Hamburgueria", regional: "Regional", brazilian: "Brasileira", italian: "Italiana",
  japanese: "Japonesa", chinese: "Chinesa", coffee_shop: "Cafeteria", ice_cream: "Sorveteria", sandwich: "Sanduíches",
  bakery: "Padaria", barbecue: "Churrasco", steak_house: "Steakhouse", seafood: "Frutos do mar", vegetarian: "Vegetariana",
  mexican: "Mexicana", arab: "Árabe",
};

function formatCuisine(value: string | null): string | null {
  if (!value) return null;
  return value.split(";").map((c) => CUISINE_LABELS[c.trim()] ?? c.trim().replace(/_/g, " ")).join(", ");
}

function paymentSummary(tags: Record<string, string>): string | null {
  const accepted = Object.entries(tags).filter(([key, value]) => key.startsWith("payment:") && value === "yes").map(([key]) => key.replace("payment:", "").replace(/_/g, " "));
  return accepted.length > 0 ? accepted.slice(0, 5).join(", ") : null;
}

function buildDetails(tags: Record<string, string>): EstablishmentDetails {
  return {
    cuisine: formatCuisine(getTag(tags, ["cuisine"])), openingHours: getTag(tags, ["opening_hours"]), priceRange: getTag(tags, ["price_range", "price"]),
    street: getTag(tags, ["addr:street"]), housenumber: getTag(tags, ["addr:housenumber"]), neighbourhood: getTag(tags, ["addr:suburb", "addr:neighbourhood"]),
    city: getTag(tags, ["addr:city"]), state: getTag(tags, ["addr:state"]), postcode: getTag(tags, ["addr:postcode"]), takeaway: getTag(tags, ["takeaway"]),
    delivery: getTag(tags, ["delivery"]), outdoorSeating: getTag(tags, ["outdoor_seating"]), wheelchair: getTag(tags, ["wheelchair"]), smoking: getTag(tags, ["smoking"]),
    vegetarian: getTag(tags, ["diet:vegetarian"]), airConditioning: getTag(tags, ["air_conditioning"]), capacity: getTag(tags, ["capacity", "capacity:seats"]),
    brand: getTag(tags, ["brand"]), operator: getTag(tags, ["operator"]), payment: paymentSummary(tags), internetAccess: getTag(tags, ["internet_access"]),
  };
}

function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  const street = tags["addr:street"]; const housenumber = tags["addr:housenumber"];
  if (street) parts.push(housenumber ? `${street}, ${housenumber}` : street);
  const suburb = tags["addr:suburb"] ?? tags["addr:neighbourhood"]; if (suburb) parts.push(suburb);
  if (tags["addr:city"]) parts.push(tags["addr:city"]); if (tags["addr:state"]) parts.push(tags["addr:state"]); if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  return parts.join(" — ") || "";
}

function groupFromTags(tags: Record<string, string>): string {
  for (const def of CATEGORIES) { const raw = tags[def.osmKey]; if (raw && def.osmValue.split(";").includes(raw)) return def.group; }
  return "Outros";
}

function scoreLead(input: { level: SignalLevel; hasWhatsapp: boolean; hasInstagram: boolean; hasPhone: boolean; hasAddress: boolean; hasHours: boolean }): number {
  let score = input.level === "zero" ? 45 : input.level === "weak" ? 28 : 6;
  if (input.hasWhatsapp) score += 30; else if (input.hasPhone) score += 18;
  if (input.hasInstagram) score += 12; if (input.hasAddress) score += 8; if (input.hasHours) score += 5;
  return Math.min(100, score);
}

export function processOverpassResults(elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[]): Establishment[] {
  const results: Establishment[] = []; const seen = new Set<string>();
  for (const el of elements) {
    const tags = el.tags ?? {}; const name = tags["name"]?.trim(); if (!name) continue;
    const lat = el.lat ?? el.center?.lat; const lon = el.lon ?? el.center?.lon; if (lat == null || lon == null) continue;
    const dedupeKey = `${name.toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`; if (seen.has(dedupeKey)) continue; seen.add(dedupeKey);
    const { signals, signalCount, level } = classifySignals(tags); const contact = buildContact(tags); const details = buildDetails(tags); const address = buildAddress(tags);
    const hasWhatsapp = Boolean(contact.whatsappUrl); const hasInstagram = Boolean(contact.instagramUrl);
    results.push({
      id: `${el.type}-${el.id}`, osmType: el.type, osmId: el.id, name, category: labelFromTags(tags), categoryGroup: groupFromTags(tags), address,
      hasAddress: address.length > 0, lat, lon, tags, signals, contact, details, contactable: hasWhatsapp || hasInstagram || Boolean(contact.phoneRaw), hasWhatsapp, hasInstagram,
      signalCount, score: scoreLead({ level, hasWhatsapp, hasInstagram, hasPhone: Boolean(contact.phoneRaw), hasAddress: address.length > 0, hasHours: Boolean(details.openingHours) }), level,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address || `${lat},${lon}`}`)}`,
      googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(`${name} ${details.city ?? ""} avaliações`)}`,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    });
  }
  return results;
}
