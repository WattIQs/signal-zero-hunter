import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Radar, ScanLine, SlidersHorizontal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/sinal-zero/ExportCsvButton";
import { FilterDrawer } from "@/components/sinal-zero/FilterDrawer";
import { LeadCard } from "@/components/sinal-zero/LeadCard";
import { RadarAnimation } from "@/components/sinal-zero/RadarAnimation";
import { SavedLeadsDrawer } from "@/components/sinal-zero/SavedLeadsDrawer";
import {
  fetchCitiesByCountry,
  fetchCitiesByState,
  fetchCountries,
  fetchStates,
} from "@/lib/apis";
import { geocodeCityServer, searchOverpassServer } from "@/lib/geo.functions";
import { processOverpassResults } from "@/lib/lead-qualification";
import { getSavedLeads, isLeadSaved, removeLead, saveLead } from "@/lib/store";
import type { CategoryKey, City, Country, Establishment, SavedLead, State } from "@/lib/types";

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
        content: "Encontre empresas com pouca presença digital, qualifique os leads e agilize sua prospecção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_CATEGORIES: CategoryKey[] = [];

function Index() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [categories, setCategories] = useState<CategoryKey[]>(DEFAULT_CATEGORIES);
  const [onlyLowSignal, setOnlyLowSignal] = useState(false);
  const [onlyContactable, setOnlyContactable] = useState(false);
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
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
    categories.length +
    (onlyLowSignal ? 1 : 0) +
    (onlyContactable ? 1 : 0) +
    (onlyNoWebsite ? 1 : 0);

  const resetFilters = () => {
    setCategories([]);
    setOnlyLowSignal(false);
    setOnlyContactable(false);
    setOnlyNoWebsite(false);
  };

  const handleScan = async () => {
    if (!selectedCountry || !selectedCity) {
      setFilterOpen(true);
      setError("Escolha país e cidade para escanear.");
      return;
    }
    if (categories.length === 0) {
      setFilterOpen(true);
      setError("Escolha pelo menos uma categoria.");
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
    if (onlyNoWebsite) filtered = filtered.filter((lead) => !lead.signals.website);

    return [...filtered].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.level !== b.level) return a.level === "zero" ? -1 : 1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [results, onlyLowSignal, onlyContactable, onlyNoWebsite]);

  const locationLabel = [selectedCity, selectedState, selectedCountry].filter(Boolean).join(", ");

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">
          <header className="mb-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Radar className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                  Sinal <span className="text-gradient-signal">Zero</span>
                </h1>
                <span className="hidden rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline-flex">
                  Lead Hunter
                </span>
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
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setFilterOpen(true)}
                disabled={scanning}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Configurar busca
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </header>

          <main>
            {!scanning && results.length === 0 && !error && (
              <section className="mx-auto max-w-3xl py-14 text-center md:py-20">
                <div className="soft-float mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-card shadow-lg shadow-primary/5">
                  <Radar className="h-9 w-9 text-primary/70" />
                </div>
                <h2 className="mt-7 text-2xl font-bold tracking-tight md:text-3xl">Pronto para encontrar oportunidades?</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                  Abra <span className="font-medium text-foreground">Configurar busca</span>, escolha localização, categorias e filtros. Depois, mande escanear.
                </p>
                <Button size="lg" className="mt-7 gap-2 shadow-lg shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/15" onClick={() => setFilterOpen(true)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Configurar minha busca
                </Button>
              </section>
            )}

            {error && !scanning && (
              <Alert className="fade-up mb-5 border-destructive/25 bg-destructive/10">
                <AlertTitle className="text-sm">Atenção</AlertTitle>
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {scanning && (
              <div className="fade-up flex flex-col items-center justify-center py-16">
                <RadarAnimation size={170} />
                <p className="mt-4 text-sm font-medium text-foreground">Varrendo a região...</p>
                <p className="mt-1 text-xs text-muted-foreground">Geocodificando e procurando estabelecimentos.</p>
              </div>
            )}

            {results.length > 0 && !scanning && (
              <section className="space-y-5">
                <div className="fade-up flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">Oportunidades</h2>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {filteredResults.length} exibidos
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {locationLabel || "Localização selecionada"} · ordenados pelo potencial de prospecção
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:min-w-[420px]">
                    <StatCard value={counts.total} label="Encontrados" />
                    <StatCard value={counts.zero} label="Sinal zero" emphasis="zero" />
                    <StatCard value={counts.weak} label="Sinal fraco" emphasis="weak" />
                    <StatCard value={counts.contactable} label="Contatáveis" emphasis="contactable" />
                  </div>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="fade-up rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
                    <p className="text-sm font-medium">Nenhum lead passou pelos filtros.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilterOpen(true)}>
                      Abrir configuração
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredResults.map((lead, index) => (
                      <div key={lead.id} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                        <LeadCard
                          lead={lead}
                          saved={isLeadSaved(lead.id)}
                          onToggleSave={handleToggleSave}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        countries={countries}
        states={states}
        cities={cities}
        selectedCountry={selectedCountry}
        selectedState={selectedState}
        selectedCity={selectedCity}
        onCountryChange={setSelectedCountry}
        onStateChange={setSelectedState}
        onCityChange={setSelectedCity}
        categories={categories}
        onCategoriesChange={setCategories}
        onlyLowSignal={onlyLowSignal}
        onOnlyLowSignalChange={setOnlyLowSignal}
        onlyContactable={onlyContactable}
        onOnlyContactableChange={setOnlyContactable}
        onlyNoWebsite={onlyNoWebsite}
        onOnlyNoWebsiteChange={setOnlyNoWebsite}
        loadingCountries={loadingCountries}
        loadingStates={loadingStates}
        loadingCities={loadingCities}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onScan={handleScan}
        scanning={scanning}
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
    <Card className="border-border bg-card/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-3">
        <p className={`text-xl font-bold tracking-tight ${valueClass}`}>{value}</p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
