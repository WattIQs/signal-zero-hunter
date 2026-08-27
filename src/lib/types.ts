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
  /** ID de área do Overpass (limite administrativo exato), quando disponível. */
  areaId?: number | null;
  displayName?: string | null;
}

export interface EstablishmentSignals {
  website: boolean;
  instagram: boolean;
  facebook: boolean;
  email: boolean;
  phone: boolean;
}

export interface EstablishmentContact {
  phoneRaw: string | null;
  phoneDigits: string | null;
  whatsappUrl: string | null;
  instagramHandle: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteUrl: string | null;
  email: string | null;
}

export interface EstablishmentDetails {
  cuisine: string | null;
  openingHours: string | null;
  priceRange: string | null;
  street: string | null;
  housenumber: string | null;
  neighbourhood: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  takeaway: string | null;
  delivery: string | null;
  outdoorSeating: string | null;
  wheelchair: string | null;
  smoking: string | null;
  vegetarian: string | null;
  airConditioning: string | null;
  capacity: string | null;
  brand: string | null;
  operator: string | null;
  payment: string | null;
  internetAccess: string | null;
}

export interface Establishment {
  id: string;
  osmType: string;
  osmId: number;
  name: string;
  category: string;
  categoryGroup: string;
  address: string;
  hasAddress: boolean;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  signals: EstablishmentSignals;
  contact: EstablishmentContact;
  details: EstablishmentDetails;
  contactable: boolean;
  hasWhatsapp: boolean;
  hasInstagram: boolean;
  signalCount: number;
  /** 0-100: quão promissor é o lead. */
  score: number;
  level: SignalLevel;
  googleMapsUrl: string;
  googleSearchUrl: string;
  osmUrl: string;
  directionsUrl: string;
}

export interface SavedLead extends Establishment {
  savedAt: string;
}

export type CategoryKey = string;
