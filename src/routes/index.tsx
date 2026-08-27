import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Radar, ScanLine, SlidersHorizontal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  fetchCitiesByCountry,
  fetchCitiesByState,
  fetchCountries,
  fetchStates,
} from "@/lib/apis";
import { geocodeCityServer, searchOverpassServer } from "@/lib/geo.functions";
import { processOverpassResults } from "@/lib/lead-qualification";
import { getSavedLeads, isLeadSaved, removeLead, saveLead } from "@/lib/store";
import type {
  CategoryKey,
  City,
  Country,
  Establishment,
  SavedLead,
  State,
} from "@/lib/types";
import { ExportCsvButton } from "@/components/sinal-zero/ExportCsvButton";
import { FilterDrawer } from "@/components/sinal-zero/FilterDrawer";
import { LeadCard } from "@/components/sinal-zero/LeadCard";
import { RadarAnimation } from "@/components/sinal-zero/RadarAnimation";
import { SavedLeadsDrawer } from "@/components/sinal-zero/SavedLeadsDrawer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sinal Zero — Encontre negócios com baixa presença digital" },
      {
        name: "description",
        content:
          "Ferramenta de prospecção para encontrar negócios com baixa presença digital e identificar oportunidades de abordagem.",
      },
      {
        property: "og:title",
        content: "Sinal Zero — Encontre negócios com baixa presença digital",
      },
      {
        property: "og:description",
        content:
          "Encontre empresas com pouca presença digital, qualifique os leads e agilize sua prospecção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_CATEGORIES: CategoryKey[] = [
  "restaurant",
  "fast_food",
  "cafe",
  "bar",
  "pub",
];

function Index() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [categories, setCategories] = useState<CategoryKey[]>(DEFAULT_CATEGORIES);
  const [onlyLowSignal, setOnlyLowSignal] = useState(true);
  const [onlyContactable, setOnlyContactable] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [results, setResults] = useState<Establishment[]>([]);
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    fetchCountries()
      .then((data) => {
        if (!cancelled) setCountries(data);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar a lista de países.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });

    setSavedLeads(getSavedLeads());
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCountry) {
      setStates([]);
      setSelectedState("");
      setCities([]);
      setSelectedCity("");
      return;
    }

    let cancelled = false;
    setLoadingStates(true);
    setSelectedState("");
    setCities([]);
    setSelectedCity("");

    fetchStates(selectedCountry)
      .then((data) => {
        if (!cancelled) {
          setStates(data);
          if (data.length === 0) {
            setLoadingCities(true);
            fetchCitiesByCountry(selectedCountry)
              .then((citiesData) => {
                if (!cancelled) setCities(citiesData);
              })
              .catch(() => {
                if (!cancelled) setError("Não foi possível carregar cidades deste país.");
              })
              .finally(() => {
                if (!cancelled) setLoadingCities(false);
              });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível carregar estados. Tentando cidades do país.");
          setLoadingCities(true);
          fetchCitiesByCountry(selectedCountry)
            .then((citiesData) => {
              if (!cancelled) setCities(citiesData);
            })
            .catch(() => {
              if (!cancelled) setError("Não foi possível carregar cidades deste país.");
            })
            .finally(() => {
              if (!cancelled) setLoadingCities(false);
            });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedCountry || !selectedState) {
      if (states.length > 0) setCities([]);
      return;
    }

    let cancelled = false;
    setLoadingCities(true);
    setSelectedCity("");

    fetchCitiesByState(selectedCountry, selectedState)
      .then((data) => {
        if (!cancelled) setCities(data);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar cidades deste estado.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCountry, selectedState, states.length]);

  const counts = useMemo(
    () => ({
      total: results.length,
      zero: results.filter((r) => r.level === "zero").length,
      weak: results.filter((r) => r.level === "weak").length,
      contactable: results.filter((r) => r.contactable).length,
    }),
    [results],
  );

  const activeFilterCount =
    (onlyLowSignal ? 1 : 0) +
    (onlyContactable ? 1 : 0) +
    (categories.length !== DEFAULT_CATEGORIES.length ? 1 : 0);

  const resetFilters = () => {
    setCategories(DEFAULT_CATEGORIES);
    setOnlyLowSignal(true);
    setOnlyContactable(true);
  };

  const handleScan = async () => {
    if (!selectedCountry || !selectedCity) {
      setError("Selecione país e cidade para escanear.");
      return;
    }
    if (categories.length === 0) {
      setError("Selecione pelo menos uma categoria.");
      return;
    }

    setError(null);
    setScanning(true);
    setResults([]);

    try {
      const geo = await geocodeCityServer({
        data: {
          country: selectedCountry,
          state: selectedState || null,
          city: selectedCity,
        },
      });

      const delta = 0.09;
      const area =
        geo.boundingBox ?? {
          south: geo.lat - delta,
          north: geo.lat + delta,
          west: geo.lon - delta,
          east: geo.lon + delta,
        };

      const data = await searchOverpassServer({
        data: {
          area,
          ...(geo.areaId != null ? { areaId: geo.areaId } : {}),
          categories,
        },
      });

      const processed = processOverpassResults(data.elements);
      setResults(processed);
      if (processed.length === 0) {
        setError("Nenhum estabelecimento encontrado. Tente outra categoria ou cidade.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao escanear área.");
    } finally {
      setScanning(false);
    }
  };

  const handleToggleSave = (lead: Establishment) => {
    if (isLeadSaved(lead.id)) removeLead(lead.id);
    else saveLead(lead);
    setSavedLeads(getSavedLeads());
  };

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (onlyLowSignal) filtered = filtered.filter((lead) => lead.level !== "full");
    if (onlyContactable) filtered = filtered.filter((lead) => lead.contactable);

    return [...filtered].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.level !== b.level) return a.level === "zero" ? -1 : 1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [results, onlyLowSignal, onlyContactable]);

  const locationLabel = [selectedCity, selectedState, selectedCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Radar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                    Sinal <span className="text-gradient-signal">Zero</span>
                  </h1>
                  <span className="hidden rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline-flex">
                    Lead Hunter
                  </span>
                </div>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Encontre negócios com baixa presença digital e transforme sinais fracos em oportunidades de prospecção.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <SavedLeadsDrawer
                leads={savedLeads}
                onRemove={(id) => {
                  removeLead(id);
                  setSavedLeads(getSavedLeads());
                }}
              />
              <ExportCsvButton />
            </div>
          </header>

          <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    País
                  </Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={loadingCountries}>
                    <SelectTrigger id="country" className="bg-background">
                      <SelectValue placeholder="Selecione o país" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.name} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingCountries && <Skeleton className="h-3 w-20" />}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estado / região
                  </Label>
                  <Select
                    value={selectedState}
                    onValueChange={setSelectedState}
                    disabled={!selectedCountry || loadingStates || states.length === 0}
                  >
                    <SelectTrigger id="state" className="bg-background">
                      <SelectValue
                        placeholder={
                          states.length === 0 && selectedCountry
                            ? "Sem região disponível"
                            : "Selecione a região"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.name} value={state.name}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingStates && <Skeleton className="h-3 w-20" />}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cidade
                  </Label>
                  <Select
                    value={selectedCity}
                    onValueChange={setSelectedCity}
                    disabled={!selectedCountry || loadingCities || cities.length === 0}
                  >
                    <SelectTrigger id="city" className="bg-background">
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.name} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingCities && <Skeleton className="h-3 w-20" />}
                </div>

                <Button
                  onClick={handleScan}
                  disabled={scanning || !selectedCountry || !selectedCity}
                  className="h-10 gap-2 md:px-5"
                >
                  {scanning ? (
                    <>
                      <ScanLine className="h-4 w-4 animate-pulse" />
                      Escaneando
                    </>
                  ) : (
                    <>
                      <Radar className="h-4 w-4" />
                      Escanear
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {locationLabel || "Escolha uma localização para começar"}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-2"
                  onClick={() => setFilterOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && !scanning && (
            <Alert className="mt-4 border-destructive/25 bg-destructive/10">
              <MapPin className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-sm">Atenção</AlertTitle>
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {scanning && (
            <div className="flex flex-col items-center justify-center py-12">
              <RadarAnimation size={170} />
              <p className="mt-4 text-sm font-medium text-foreground">Varrendo a região...</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Geocodificando e procurando estabelecimentos no OpenStreetMap.
              </p>
            </div>
          )}

          {results.length > 0 && !scanning && (
            <section className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard value={counts.total} label="Encontrados" />
                <StatCard value={counts.zero} label="Sinal zero" emphasis="zero" />
                <StatCard value={counts.weak} label="Sinal fraco" emphasis="weak" />
                <StatCard value={counts.contactable} label="Contatáveis" emphasis="contactable" />
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">Oportunidades</h2>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {filteredResults.length} exibidos
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ordenados pelo potencial de prospecção, com os melhores leads primeiro.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Sinal Zero</span>
                  <span>→</span>
                  <span>Contato</span>
                  <span>→</span>
                  <span>Score</span>
                </div>
              </div>

              {filteredResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
                  <p className="text-sm font-medium">Nenhum lead passou pelos filtros.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Abra “Filtros” e amplie os resultados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      saved={isLeadSaved(lead.id)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {!scanning && results.length === 0 && !error && (
            <div className="px-4 py-16 text-center md:py-20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <Radar className="h-8 w-8 text-primary/60" />
              </div>
              <h2 className="mt-5 text-lg font-semibold">Pronto para caçar oportunidades?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Escolha uma localização, ajuste os filtros e escaneie a área para encontrar negócios com sinais digitais fracos.
              </p>
            </div>
          )}
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        categories={categories}
        onCategoriesChange={setCategories}
        onlyLowSignal={onlyLowSignal}
        onOnlyLowSignalChange={setOnlyLowSignal}
        onlyContactable={onlyContactable}
        onOnlyContactableChange={setOnlyContactable}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
      />
    </>
  );
}

function StatCard({
  value,
  label,
  emphasis,
}: {
  value: number;
  label: string;
  emphasis?: "zero" | "weak" | "contactable";
}) {
  const valueClass =
    emphasis === "zero"
      ? "text-signal-zero"
      : emphasis === "weak"
        ? "text-signal-weak"
        : emphasis === "contactable"
          ? "text-primary"
          : "text-foreground";

  return (
    <Card className="border-border bg-card/80 shadow-sm">
      <CardContent className="p-4">
        <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}
