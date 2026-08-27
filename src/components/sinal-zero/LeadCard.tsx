import { Accessibility, Bike, Clock, ExternalLink, Globe, Instagram, Mail, MapPin, Navigation, Phone, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Establishment } from "@/lib/types";
import { SignalBadge } from "./SignalBadge";

interface LeadCardProps { lead: Establishment; saved: boolean; onToggleSave: (lead: Establishment) => void; }
const YES_NO: Record<string,string> = { yes:"Sim", no:"Não", only:"Somente", limited:"Limitado", designated:"Sim", outside:"Área externa" };
function label(value:string|null):string|null { return value ? (YES_NO[value] ?? value) : null; }

function WhatsAppIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor"><path d="M20.52 3.48A11.83 11.83 0 0 0 12.1 0C5.56 0 .24 5.32.24 11.87c0 2.09.55 4.13 1.59 5.92L.15 24l6.35-1.66a11.84 11.84 0 0 0 5.6 1.41h.01c6.54 0 11.86-5.32 11.86-11.88 0-3.17-1.23-6.14-3.45-8.39ZM12.11 21.73h-.01a9.84 9.84 0 0 1-5.02-1.37l-.36-.21-3.77.99 1-3.67-.24-.38a9.87 9.87 0 0 1-1.51-5.22C2.2 6.42 6.64 1.98 12.1 1.98c2.65 0 5.14 1.03 7.01 2.9a9.87 9.87 0 0 1 2.9 7.02c0 5.46-4.44 9.9-9.9 9.9Zm5.43-7.42c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.77-1.68-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35Z" /></svg>;
}

export function LeadCard({ lead, saved, onToggleSave }: LeadCardProps) {
  const { contact, details } = lead;
  const infoRows: { icon: typeof Clock; text:string }[] = [];
  if (details.cuisine) infoRows.push({ icon: UtensilsCrossed, text: details.cuisine });
  if (details.openingHours) infoRows.push({ icon: Clock, text: details.openingHours });
  const facilities = [details.delivery && `Delivery: ${label(details.delivery)}`, details.takeaway && `Retirada: ${label(details.takeaway)}`, details.outdoorSeating && `Mesas na rua: ${label(details.outdoorSeating)}`, details.capacity && `${details.capacity} lugares`].filter(Boolean) as string[];
  if (facilities.length) infoRows.push({ icon: ShoppingBag, text: facilities.join(" · ") });
  if (details.wheelchair) infoRows.push({ icon: Accessibility, text: `Acessibilidade: ${label(details.wheelchair)}` });
  if (details.brand || details.operator) infoRows.push({ icon: Bike, text: `Operado por ${details.operator ?? details.brand}` });
  const whatsappUrl = contact.whatsappUrl ?? (contact.phoneDigits ? `https://wa.me/${contact.phoneDigits}` : null);

  return (
    <Card className={cn("fade-up group overflow-hidden border bg-card/90 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5", lead.level === "zero" && "border-signal-zero/30 shadow-signal-zero/5")}>
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold tracking-tight text-card-foreground md:text-[17px]">{lead.name}</h3>
              <Badge variant="secondary" className="text-[10px]">{lead.category}</Badge>
              {!contact.websiteUrl && <Badge variant="outline" className="text-[10px]">Sem site</Badge>}
              {lead.contactable && <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">Contatável</Badge>}
            </div>
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="line-clamp-2">{lead.address || "Endereço não cadastrado no OpenStreetMap"}</span></p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/65">{lead.lat.toFixed(5)}, {lead.lon.toFixed(5)}{details.postcode ? ` · CEP ${details.postcode}` : ""}</p>
          </div>
          <div className="shrink-0 self-start"><SignalBadge level={lead.level} /></div>
        </div>

        {infoRows.length > 0 && <div className="mt-3 space-y-1.5 rounded-xl border border-border/70 bg-background/45 p-3">{infoRows.map((row, i) => <p key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><row.icon className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" /><span className="break-words">{row.text}</span></p>)}</div>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp de ${lead.name}`} title="Abrir WhatsApp" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/20 hover:shadow-md hover:shadow-primary/10 active:translate-y-0"><WhatsAppIcon className="h-[18px] w-[18px]" /></a>}
          {contact.phoneRaw && <a href={`tel:${contact.phoneDigits ?? ""}`} aria-label={`Ligar para ${lead.name}`} title="Ligar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground active:translate-y-0"><Phone className="h-4 w-4" /></a>}
          {contact.instagramUrl && <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir Instagram de ${lead.name}`} title="Abrir Instagram" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground active:translate-y-0"><Instagram className="h-4 w-4" /></a>}
          {contact.websiteUrl && <a href={contact.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir site de ${lead.name}`} title="Abrir site" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground active:translate-y-0"><Globe className="h-4 w-4" /></a>}
          {contact.email && <a href={`mailto:${contact.email}`} aria-label={`Enviar e-mail para ${lead.name}`} title="E-mail" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground active:translate-y-0"><Mail className="h-4 w-4" /></a>}

          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant={saved ? "secondary" : "default"} onClick={() => onToggleSave(lead)} className={cn("text-xs transition-all duration-200", saved && "bg-primary/15 text-primary hover:bg-primary/25")}>{saved ? "Salvo" : "Salvar lead"}</Button>
            <Button size="sm" variant="outline" asChild className="gap-1 text-xs transition-all hover:-translate-y-0.5"><a href={lead.googleMapsUrl} target="_blank" rel="noopener noreferrer"><Star className="h-3 w-3" />Avaliações</a></Button>
            <Button size="sm" variant="ghost" asChild className="gap-1 text-xs transition-all hover:-translate-y-0.5"><a href={lead.directionsUrl} target="_blank" rel="noopener noreferrer"><Navigation className="h-3 w-3" />Rota</a></Button>
            <Button size="sm" variant="ghost" asChild className="gap-1 text-xs transition-all hover:-translate-y-0.5"><a href={lead.osmUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" />OSM</a></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
