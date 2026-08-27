import { Filter, MapPin, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryChips } from "@/components/sinal-zero/CategoryChips";
import type { CategoryKey, City, Country, State } from "@/lib/types";

interface FilterDrawerProps {
  open: boolean;
  countries: Country[];
  states: State[];
  cities: City[];
  selectedCountry: string;
  selectedState: string;
  selectedCity: string;
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  categories: CategoryKey[];
  onCategoriesChange: (categories: CategoryKey[]) => void;
  onlyLowSignal: boolean;
  onOnlyLowSignalChange: (value: boolean) => void;
  onlyContactable: boolean;
  onOnlyContactableChange: (value: boolean) => void;
  onlyNoWebsite: boolean;
  onOnlyNoWebsiteChange: (value: boolean) => void;
  loadingCountries: boolean;
  loadingStates: boolean;
  loadingCities: boolean;
  onClose: () => void;
  onReset: () => void;
  onScan: () => void;
  scanning: boolean;
}

export function FilterDrawer(props: FilterDrawerProps) {
  if (!props.open) return null;
  const {
    countries, states, cities, selectedCountry, selectedState, selectedCity,
    onCountryChange, onStateChange, onCityChange, categories, onCategoriesChange,
    onlyLowSignal, onOnlyLowSignalChange, onlyContactable, onOnlyContactableChange,
    onlyNoWebsite, onOnlyNoWebsiteChange, loadingCountries, loadingStates, loadingCities,
    onClose, onReset, onScan, scanning,
  } = props;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Fechar configurações" className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl" aria-label="Configuração da busca">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><SlidersHorizontal className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold">Configurar busca</h2><p className="text-xs text-muted-foreground">Tudo em um único menu</p></div></div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto p-5">
          <section className="space-y-4"><div><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Localização</h3></div><p className="mt-1 text-xs text-muted-foreground">Escolha onde procurar.</p></div>
            <div className="space-y-3">
              <div className="space-y-2"><Label htmlFor="drawer-country" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">País</Label><Select value={selectedCountry} onValueChange={onCountryChange} disabled={loadingCountries}><SelectTrigger id="drawer-country" className="bg-background"><SelectValue placeholder="Selecione o país" /></SelectTrigger><SelectContent>{countries.map((country)=><SelectItem key={country.name} value={country.name}>{country.name}</SelectItem>)}</SelectContent></Select>{loadingCountries&&<Skeleton className="h-3 w-24"/>}</div>
              <div className="space-y-2"><Label htmlFor="drawer-state" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado / região</Label><Select value={selectedState} onValueChange={onStateChange} disabled={!selectedCountry||loadingStates||states.length===0}><SelectTrigger id="drawer-state" className="bg-background"><SelectValue placeholder={states.length===0&&selectedCountry?"Sem região disponível":"Selecione a região"}/></SelectTrigger><SelectContent>{states.map((state)=><SelectItem key={state.name} value={state.name}>{state.name}</SelectItem>)}</SelectContent></Select>{loadingStates&&<Skeleton className="h-3 w-24"/>}</div>
              <div className="space-y-2"><Label htmlFor="drawer-city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</Label><Select value={selectedCity} onValueChange={onCityChange} disabled={!selectedCountry||loadingCities||cities.length===0}><SelectTrigger id="drawer-city" className="bg-background"><SelectValue placeholder="Selecione a cidade"/></SelectTrigger><SelectContent>{cities.map((city)=><SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>)}</SelectContent></Select>{loadingCities&&<Skeleton className="h-3 w-24"/>}</div>
            </div>
          </section>
          <section className="space-y-3"><div><h3 className="text-sm font-semibold">Categorias</h3><p className="mt-1 text-xs text-muted-foreground">Nenhuma vem marcada. Escolha pelo menos uma.</p></div><div className="rounded-xl border border-border bg-background/50 p-3"><CategoryChips value={categories} onChange={onCategoriesChange}/></div></section>
          <section className="space-y-3"><div><h3 className="text-sm font-semibold">Qualificação</h3><p className="mt-1 text-xs text-muted-foreground">Refine os leads sem sair deste menu.</p></div>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/50 p-4"><div className="pr-3"><p className="text-sm font-medium">Sem site identificado</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Sem site informado nos dados públicos consultados.</p></div><Switch checked={onlyNoWebsite} onCheckedChange={onOnlyNoWebsiteChange} aria-label="Sem site identificado"/></div>
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/50 p-4"><div className="pr-3"><p className="text-sm font-medium">Somente contatáveis</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Exige telefone, WhatsApp ou Instagram disponível.</p></div><Switch checked={onlyContactable} onCheckedChange={onOnlyContactableChange} aria-label="Somente leads contatáveis"/></div>
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/50 p-4"><div className="pr-3"><p className="text-sm font-medium">Somente sinal zero/fraco</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Oculta negócios com presença digital completa.</p></div><Switch checked={onlyLowSignal} onCheckedChange={onOnlyLowSignalChange} aria-label="Somente leads com sinal zero ou fraco"/></div>
            </div>
          </section>
        </div>
        <div className="border-t border-border p-4"><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={onReset} disabled={scanning}>Limpar</Button><Button className="flex-1 gap-2" onClick={onScan} disabled={scanning||!selectedCountry||!selectedCity||categories.length===0}><Filter className="h-4 w-4"/>{scanning?"Escaneando...":"Aplicar e escanear"}</Button></div></div>
      </aside>
    </div>
  );
}
