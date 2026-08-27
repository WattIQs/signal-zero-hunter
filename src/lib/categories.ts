export type OsmKey = "amenity" | "shop" | "leisure" | "tourism" | "office" | "healthcare" | "craft";

export interface CategoryDef {
  key: string;
  label: string;
  group: string;
  osmKey: OsmKey;
  osmValue: string;
}

export const CATEGORY_GROUPS = [
  "Alimentação",
  "Fitness & Esporte",
  "Pets",
  "Papelaria & Gráfica",
  "Beleza & Estética",
  "Saúde",
  "Automotivo",
  "Comércio",
  "Serviços",
  "Educação & Hospedagem",
] as const;

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

function def(key: string, label: string, group: CategoryGroup, osmKey: OsmKey, osmValue?: string): CategoryDef {
  return { key, label, group, osmKey, osmValue: osmValue ?? key };
}

export const CATEGORIES: CategoryDef[] = [
  def("restaurant", "Restaurante", "Alimentação", "amenity"),
  def("fast_food", "Lanchonete", "Alimentação", "amenity"),
  def("cafe", "Café", "Alimentação", "amenity"),
  def("bar", "Bar", "Alimentação", "amenity"),
  def("pub", "Pub", "Alimentação", "amenity"),
  def("ice_cream", "Sorveteria", "Alimentação", "amenity"),
  def("bakery", "Padaria", "Alimentação", "shop"),
  def("confectionery", "Doceria", "Alimentação", "shop"),
  def("butcher", "Açougue", "Alimentação", "shop"),
  def("greengrocer", "Hortifruti", "Alimentação", "shop"),
  def("alcohol", "Adega", "Alimentação", "shop"),
  def("gym", "Academia", "Fitness & Esporte", "leisure", "fitness_centre"),
  def("sports_centre", "Centro esportivo", "Fitness & Esporte", "leisure"),
  def("pitch", "Quadra / campo", "Fitness & Esporte", "leisure"),
  def("swimming_pool", "Piscina / natação", "Fitness & Esporte", "leisure"),
  def("dance", "Escola de dança", "Fitness & Esporte", "leisure"),
  def("sports_shop", "Loja de esportes", "Fitness & Esporte", "shop", "sports"),
  def("bicycle", "Bicicletaria", "Fitness & Esporte", "shop"),
  def("pet", "Pet shop", "Pets", "shop"),
  def("pet_grooming", "Banho e tosa", "Pets", "shop"),
  def("veterinary", "Veterinário", "Pets", "amenity"),
  def("stationery", "Papelaria", "Papelaria & Gráfica", "shop"),
  def("copyshop", "Gráfica rápida", "Papelaria & Gráfica", "shop"),
  def("books", "Livraria", "Papelaria & Gráfica", "shop"),
  def("printer_ink", "Cartuchos / toner", "Papelaria & Gráfica", "shop"),
  def("newsagent", "Banca / revistaria", "Papelaria & Gráfica", "shop"),
  def("hairdresser", "Salão / barbearia", "Beleza & Estética", "shop"),
  def("beauty", "Estética", "Beleza & Estética", "shop"),
  def("cosmetics", "Cosméticos", "Beleza & Estética", "shop"),
  def("massage", "Massagem", "Beleza & Estética", "shop"),
  def("tattoo", "Tatuagem", "Beleza & Estética", "shop"),
  def("nails", "Manicure", "Beleza & Estética", "shop", "beauty;nails"),
  def("pharmacy", "Farmácia", "Saúde", "amenity"),
  def("dentist", "Dentista", "Saúde", "amenity"),
  def("clinic", "Clínica", "Saúde", "amenity"),
  def("doctors", "Consultório", "Saúde", "amenity"),
  def("optician", "Ótica", "Saúde", "shop"),
  def("physiotherapist", "Fisioterapia", "Saúde", "healthcare"),
  def("psychotherapist", "Psicologia", "Saúde", "healthcare"),
  def("medical_supply", "Produtos médicos", "Saúde", "shop"),
  def("car_repair", "Oficina mecânica", "Automotivo", "shop"),
  def("car_wash", "Lava-rápido", "Automotivo", "amenity"),
  def("car_parts", "Autopeças", "Automotivo", "shop"),
  def("tyres", "Borracharia", "Automotivo", "shop"),
  def("motorcycle_repair", "Oficina de moto", "Automotivo", "shop"),
  def("car", "Concessionária / revenda", "Automotivo", "shop"),
  def("clothes", "Roupas", "Comércio", "shop"),
  def("shoes", "Calçados", "Comércio", "shop"),
  def("jewelry", "Joalheria / bijuteria", "Comércio", "shop"),
  def("florist", "Floricultura", "Comércio", "shop"),
  def("hardware", "Ferragens", "Comércio", "shop"),
  def("doityourself", "Material de construção", "Comércio", "shop"),
  def("furniture", "Móveis", "Comércio", "shop"),
  def("mobile_phone", "Celulares", "Comércio", "shop"),
  def("computer", "Informática", "Comércio", "shop"),
  def("electronics", "Eletrônicos", "Comércio", "shop"),
  def("supermarket", "Supermercado", "Comércio", "shop"),
  def("convenience", "Mercadinho", "Comércio", "shop"),
  def("gift", "Presentes", "Comércio", "shop"),
  def("toys", "Brinquedos", "Comércio", "shop"),
  def("variety_store", "Loja de R$ 1,99", "Comércio", "shop"),
  def("laundry", "Lavanderia", "Serviços", "shop"),
  def("dry_cleaning", "Tinturaria", "Serviços", "shop"),
  def("travel_agency", "Agência de viagens", "Serviços", "shop"),
  def("photo", "Estúdio fotográfico", "Serviços", "shop"),
  def("tailor", "Costureira / alfaiate", "Serviços", "shop"),
  def("locksmith", "Chaveiro", "Serviços", "shop"),
  def("estate_agent", "Imobiliária", "Serviços", "office"),
  def("lawyer", "Advocacia", "Serviços", "office"),
  def("accountant", "Contabilidade", "Serviços", "office"),
  def("carpenter", "Marcenaria", "Serviços", "craft"),
  def("electrician", "Eletricista", "Serviços", "craft"),
  def("language_school", "Escola de idiomas", "Educação & Hospedagem", "amenity"),
  def("driving_school", "Autoescola", "Educação & Hospedagem", "amenity"),
  def("music_school", "Escola de música", "Educação & Hospedagem", "amenity"),
  def("kindergarten", "Creche / berçário", "Educação & Hospedagem", "amenity"),
  def("hotel", "Hotel", "Educação & Hospedagem", "tourism"),
  def("guest_house", "Pousada", "Educação & Hospedagem", "tourism"),
];

export const CATEGORY_BY_KEY: Record<string, CategoryDef> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const CATEGORIES_BY_GROUP: Record<string, CategoryDef[]> = CATEGORY_GROUPS.reduce((acc, group) => {
  acc[group] = CATEGORIES.filter((c) => c.group === group);
  return acc;
}, {} as Record<string, CategoryDef[]>);

export function labelFromTags(tags: Record<string, string>): string {
  const keys: OsmKey[] = ["amenity", "shop", "leisure", "tourism", "office", "healthcare", "craft"];
  for (const key of keys) {
    const raw = tags[key];
    if (!raw) continue;
    const match = CATEGORIES.find((c) => c.osmKey === key && c.osmValue.split(";").includes(raw));
    if (match) return match.label;
    return raw.replace(/_/g, " ");
  }
  return "Estabelecimento";
}
