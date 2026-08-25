import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Radar, ScanLine } from "lucide-react";

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
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import {
  fetchCountries,
  fetchStates,
  fetchCitiesByState,
  fetchCitiesByCountry,
  geocodeCity,
  searchOverpass,
} from "@/lib/apis";
import { processOverpassResults } from "@/lib/lead-qualification";
import {
  getSavedLeads,
  saveLead,
  removeLead,
  isLeadSaved,
} from "@/lib/store";
import type {
  CategoryKey,
  City,
  Country,
  Establishment,
  SavedLead,
  State,
} from "@/lib/types";

import { CategoryChips } from "@/components/sinal-zero/CategoryChips";
import { ExportCsvButton } from "@/components/sinal-zero/ExportCsvButton";
import { LeadCard } from "@/components/sinal-zero/LeadCard";
import { RadarAnimation } from "@/components/sinal-zero/RadarAnimation";
import { SavedLeadsDrawer } from "@/components/sinal-zero/SavedLeadsDrawer";
import { SignalBadge } from "@/components/sinal-zero/SignalBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sinal Zero — Encontre restaurantes sem presença digital" },
      {
        name: "description",
        content:
          "Ferramenta gratuita de prospecção para encontrar restaurantes, lanchonetes, cafés, bares e pubs sem site, Instagram ou e-mail. Caçando quem não emite sinal digital.",
      },
      {
        property: "og:title",
        content: "Sinal Zero — Encontre restaurantes sem presença digital",
      },
      {
        property: "og:description",
        content:
          "Ferramenta gratuita de prospecção para encontrar restaurantes, lanchonetes, cafés, bares e pubs sem site, Instagram ou e-mail.",
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

  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  const [categories, setCategories] = useState<CategoryKey[]>(DEFAULT_CATEGORIES);
  const [radius, setRadius] = useState<number>(2000);

  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [results, setResults] = useState<Establishment[]>([]);
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load countries and saved leads on client only
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

  // Load states when country changes
  useEffect(() => {
    if (!selectedCountry) {
      setStates([]);
      setSelectedState("");
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
            // Country has no states; load cities directly
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
          setError("Não foi possível carregar estados. Tentando carregar cidades do país.");
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

  // Load cities when state changes
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

  const counts = useMemo(() => {
    return {
      zero: results.filter((r) => r.level === "zero").length,
      weak: results.filter((r) => r.level === "weak").length,
      full: results.filter((r) => r.level === "full").length,
    };
  }, [results]);

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
      const geo = await geocodeCity(
        selectedCountry,
        selectedState || null,
        selectedCity
      );
      const data = await searchOverpass(geo.lat, geo.lon, radius, categories);
      const processed = processOverpassResults(data.elements, categories);
      setResults(processed);
      if (processed.length === 0) {
        setError(
          "Nenhum estabelecimento encontrado nesta área. Tente aumentar o raio ou mudar a categoria."
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao escanear área.";
      setError(message);
    } finally {
      setScanning(false);
    }
  };

  const handleToggleSave = (lead: Establishment) => {
    if (isLeadSaved(lead.id)) {
      removeLead(lead.id);
    } else {
      saveLead(lead);
    }
    setSavedLeads(getSavedLeads());
  };

  const sortedResults = useMemo(() => {
    const order: Record<"zero" | "weak" | "full", number> = {
      zero: 0,
      weak: 1,
      full: 2,
    };
    return [...results].sort((a, b) => order[a.level] - order[b.level]);
  }, [results]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Radar className="h-6 w-6 text-signal-zero" />
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Sinal <span className="text-gradient-signal">Zero</span>
              </h1>
            </div>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Caçando restaurantes, lanchonetes, cafés, bares e pubs sem presença digital.
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Control panel */}
        <Card className="mb-6 border-border bg-card/80 backdrop-blur">
          <CardContent className="space-y-5 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  País
                </Label>
                <Select
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                  disabled={loadingCountries}
                >
                  <SelectTrigger id="country" className="bg-background">
                    <SelectValue placeholder="Selecione o país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingCountries && <Skeleton className="h-4 w-24" />}
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label htmlFor="state" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estado
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
                          ? "País sem estados"
                          : "Selecione o estado"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingStates && <Skeleton className="h-4 w-24" />}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                    {cities.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingCities && <Skeleton className="h-4 w-24" />}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Categorias
              </Label>
              <CategoryChips value={categories} onChange={setCategories} />
            </div>

            {/* Radius */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Raio de busca
                </Label>
                <span className="font-mono text-sm text-signal-zero">
                  {(radius / 1000).toFixed(1)} km
                </span>
              </div>
              <Slider
                value={[radius]}
                onValueChange={(v) => setRadius(v[0] ?? 500)}
                min={500}
                max={8000}
                step={500}
                className="py-2"
              />
            </div>

            {/* Scan button */}
            <Button
              onClick={handleScan}
              disabled={scanning || !selectedCountry || !selectedCity}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              {scanning ? (
                <>
                  <ScanLine className="h-4 w-4 animate-pulse" />
                  Escaneando área...
                </>
              ) : (
                <>
                  <Radar className="h-4 w-4" />
                  Escanear área
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error */}
        {error && !scanning && (
          <Alert className="mb-6 border-destructive/30 bg-destructive/10 text-foreground">
            <MapPin className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-sm font-semibold">Atenção</AlertTitle>
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Radar animation */}
        {scanning && (
          <div className="mb-8 flex flex-col items-center justify-center py-8">
            <RadarAnimation size={180} />
            <p className="mt-4 text-sm text-muted-foreground">
              Geocodificando e varrendo o território...
            </p>
          </div>
        )}

        {/* Dashboard */}
        {results.length > 0 && !scanning && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card className="border-signal-zero/30 bg-signal-zero/10">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-signal-zero">{counts.zero}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-signal-zero/80">
                  Sinal Zero
                </p>
              </CardContent>
            </Card>
            <Card className="border-signal-weak/30 bg-signal-weak/10">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-signal-weak">{counts.weak}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-signal-weak/80">
                  Sinal Fraco
                </p>
              </CardContent>
            </Card>
            <Card className="border-cyan/30 bg-cyan/10">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-cyan">{counts.full}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-cyan/80">
                  Sinal Pleno
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !scanning && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Resultados ({results.length})
              </h2>
              <span className="text-xs text-muted-foreground">
                Ordenados do lead mais quente ao mais digitalizado
              </span>
            </div>
            {sortedResults.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                saved={isLeadSaved(lead.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!scanning && results.length === 0 && !error && (
          <div className="mt-12 text-center">
            <Radar className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">
              Selecione uma cidade e clique em "Escanear área" para encontrar leads.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
