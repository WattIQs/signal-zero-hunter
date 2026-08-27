import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Radar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCitiesByCountry, fetchCitiesByState, fetchCountries, fetchStates } from "@/lib/apis";
import { geocodeCityServer, searchOverpassServer } from "@/lib/geo.functions";
import { processOverpassResults } from "@/lib/lead-qualification";
import { getSavedLeads, isLeadSaved, removeLead, saveLead } from "@/lib/store";
import type { CategoryKey, City, Country, Establishment, SavedLead, State } from "@/lib/types";
import { CategoryChips } from "@/components/sinal-zero/CategoryChips";
import { ExportCsvButton } from "@/components/sinal-zero/ExportCsvButton";
import { LeadCard } from "@/components/sinal-zero/LeadCard";
import { RadarAnimation } from "@/components/sinal-zero/RadarAnimation";
import { SavedLeadsDrawer } from "@/components/sinal-zero/SavedLeadsDrawer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sinal Zero — Encontre negócios sem presença digital" },
      { name: "description", content: "Ferramenta de prospecção para encontrar estabelecimentos com baixa presença digital." },
      { property: "og:title", content: "Sinal Zero — Encontre negócios sem presença digital" },
      { property: "og:description", content: "Encontre estabelecimentos com baixa presença digital e informações de contato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_CATEGORIES: CategoryKey[] = ["restaurant", "fast_food", "cafe", "bar", "pub"];

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
  const [results, setResults] = useState<Establishment[]>([]);
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    fetchCountries().then((data) => { if (!cancelled) setCountries(data); }).catch(() => {
      if (!cancelled) setError("Não foi possível carregar a lista de países.");
    }).finally(() => { if (!cancelled) setLoadingCountries(false); });
    setSavedLeads(getSavedLeads());
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedCountry) {
      setStates([]); setSelectedState(""); setCities([]); setSelectedCity(""); return;
    }
    let cancelled = false;
    setLoadingStates(true); setSelectedState(""); setCities([]); setSelectedCity("");
    fetchStates(selectedCountry).then((data) => {
      if (cancelled) return;
      setStates(data);
      if (data.length === 0) {
        setLoadingCities(true);
        fetchCitiesByCountry(selectedCountry).then((items) => { if (!cancelled) setCities(items); })
          .catch(() => { if (!cancelled) setError("Não foi possível carregar cidades deste país."); })
          .finally(() => { if (!cancelled) setLoadingCities(false); });
      }
    }).catch(() => {
      if (cancelled) return;
      setError("Não foi possível carregar estados. Tentando carregar cidades do país.");
      setLoadingCities(true);
      fetchCitiesByCountry(selectedCountry).then((items) => { if (!cancelled) setCities(items); })
        .catch(() => { if (!cancelled) setError("Não foi possível carregar cidades deste país."); })
        .finally(() => { if (!cancelled) setLoadingCities(false); });
    }).finally(() => { if (!cancelled) setLoadingStates(false); });
    return () => { cancelled = true; };
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedCountry || !selectedState) return;
    let cancelled = false;
    setLoadingCities(true); setSelectedCity("");
    fetchCitiesByState(selectedCountry, selectedState).then((data) => { if (!cancelled) setCities(data); })
      .catch(() => { if (!cancelled) setError("Não foi possível carregar cidades deste estado."); })
      .finally(() => { if (!cancelled) setLoadingCities(false); });
    return () => { cancelled = true; };
  }, [selectedCountry, selectedState]);

  const counts = useMemo(() => ({
    zero: results.filter((r) => r.level === "zero").length,
    weak: results.filter((r) => r.level === "weak").length,
    contactable: results.filter((r) => r.contactable).length,
  }), [results]);

  const handleScan = async () => {
    if (!selectedCountry || !selectedCity) { setError("Selecione país e cidade para escanear."); return; }
    if (categories.length === 0) { setError("Selecione pelo menos uma categoria."); return; }
    setError(null); setScanning(true); setResults([]);
    try {
      const geo = await geocodeCityServer({ data: { country: selectedCountry, state: selectedState || null, city: selectedCity } });
      const delta = 0.09;
      const area = geo.boundingBox ?? { south: geo.lat - delta, north: geo.lat + delta, west: geo.lon - delta, east: geo.lon + delta };
      const data = await searchOverpassServer({ data: { area, areaId: geo.areaId, categories } });
      const processed = processOverpassResults(data.elements);
      setResults(processed);
      if (processed.length === 0) setError("Nenhum estabelecimento encontrado nesta cidade. Tente outra categoria ou outra cidade.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao escanear área.");
    } finally { setScanning(false); }
  };

  const handleToggleSave = (lead: Establishment) => {
    if (isLeadSaved(lead.id)) removeLead(lead.id); else saveLead(lead);
    setSavedLeads(getSavedLeads());
  };

  const sortedResults = useMemo(() => {
    const order: Record<"zero" | "weak" | "full", number> = { zero: 0, weak: 1, full: 2 };
    let filtered = results;
    if (onlyLowSignal) filtered = filtered.filter((r) => r.level !== "full");
    if (onlyContactable) filtered = filtered.filter((r) => r.contactable);
    return [...filtered].sort((a, b) => b.score - a.score || Number(b.contactable) - Number(a.contactable) || order[a.level] - order[b.level]);
  }, [results, onlyLowSignal, onlyContactable]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><Radar className="h-6 w-6 text-signal-zero" /><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sinal <span className="text-gradient-signal">Zero</span></h1></div>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Encontre negócios com baixa presença digital.</p>
          </div>
          <div className="flex items-center gap-2">
            <SavedLeadsDrawer leads={savedLeads} onRemove={(id) => { removeLead(id); setSavedLeads(getSavedLeads()); }} />
            <ExportCsvButton />
          </div>
        </header>

        <Card className="mb-6 border-border bg-card/80 backdrop-blur"><CardContent className="space-y-5 p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="country" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">País</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={loadingCountries}><SelectTrigger id="country" className="bg-background"><SelectValue placeholder="Selecione o país" /></SelectTrigger><SelectContent>{countries.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>{loadingCountries && <Skeleton className="h-4 w-24" />}</div>
            <div className="space-y-2"><Label htmlFor="state" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</Label>
              <Select value={selectedState} onValueChange={setSelectedState} disabled={!selectedCountry || loadingStates || states.length === 0}><SelectTrigger id="state" className="bg-background"><SelectValue placeholder={states.length === 0 && selectedCountry ? "País sem estados" : "Selecione o estado"} /></SelectTrigger><SelectContent>{states.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>{loadingStates && <Skeleton className="h-4 w-24" />}</div>
            <div className="space-y-2"><Label htmlFor="city" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cidade</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedCountry || loadingCities || cities.length === 0}><SelectTrigger id="city" className="bg-background"><SelectValue placeholder="Selecione a cidade" /></SelectTrigger><SelectContent>{cities.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>{loadingCities && <Skeleton className="h-4 w-24" />}</div>
          </div>

          <div className="space-y-2"><Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categorias</Label><CategoryChips value={categories} onChange={setCategories} /></div>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/60 p-3"><div><Label htmlFor="only-contactable" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Só quem eu consigo contatar</Label><p className="mt-1 text-xs text-muted-foreground/80">Mostra apenas leads com contato direto disponível.</p></div><Switch id="only-contactable" checked={onlyContactable} onCheckedChange={setOnlyContactable} /></div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/60 p-3"><div><Label htmlFor="only-low" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Só quem tem presença fraca</Label><p className="mt-1 text-xs text-muted-foreground/80">Esconde quem já tem presença digital completa.</p></div><Switch id="only-low" checked={onlyLowSignal} onCheckedChange={setOnlyLowSignal} /></div>
          </div>

          <Button onClick={handleScan} disabled={scanning || !selectedCountry || !selectedCity || categories.length === 0} className="w-full">{scanning ? "Escaneando..." : "Escanear cidade"}</Button>
        </Card>

        {error && <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

        {results.length > 0 && <div className="mb-6 grid grid-cols-3 gap-2"><Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{counts.zero}</div><div className="text-xs text-muted-foreground">Sinal zero</div></CardContent></Card><Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{counts.weak}</div><div className="text-xs text-muted-foreground">Sinal fraco</div></CardContent></Card><Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{counts.contactable}</div><div className="text-xs text-muted-foreground">Contatáveis</div></CardContent></Card></div>}

        {scanning && <div className="mb-6"><RadarAnimation /></div>}
        {!scanning && sortedResults.length > 0 && <div className="grid gap-4">{sortedResults.map((lead) => <LeadCard key={lead.id} lead={lead} saved={isLeadSaved(lead.id)} onToggleSave={() => handleToggleSave(lead)} />)}</div>}
      </div>
    </div>
  );
}
