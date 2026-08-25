export type SignalLevel = "zero" | "weak" | "full";

export interface Country {
  name: string;
}

export interface State {
  name: string;
}

export interface City {
  name: string;
}

export interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
  boundingBox?: BoundingBox | null;
}

export interface EstablishmentSignals {
  website: boolean;
  instagram: boolean;
  facebook: boolean;
  email: boolean;
  phone: boolean;
}

export interface Establishment {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  signals: EstablishmentSignals;
  signalCount: number;
  level: SignalLevel;
}

export interface SavedLead extends Establishment {
  savedAt: string;
}

export type CategoryKey = "restaurant" | "fast_food" | "cafe" | "bar" | "pub";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  restaurant: "Restaurante",
  fast_food: "Lanchonete",
  cafe: "Café",
  bar: "Bar",
  pub: "Pub",
};

export const CATEGORY_AMENITY: Record<CategoryKey, string> = {
  restaurant: "restaurant",
  fast_food: "fast_food",
  cafe: "cafe",
  bar: "bar",
  pub: "pub",
};
