import {
  Accessibility,
  Bike,
  Clock,
  ExternalLink,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShoppingBag,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Establishment } from "@/lib/types";
import { SignalBadge } from "./SignalBadge";

interface LeadCardProps {
  lead: Establishment;
  saved: boolean;
  onToggleSave: (lead: Establishment) => void;
}

const YES_NO: Record<string, string> = {
  yes: "Sim",
  no: "Não",
  only: "Somente",
  limited: "Limitado",
  designated: "Sim",
  outside: "Área externa",
};

function label(value: string | null): string | null {
  if (!value) return null;
  return YES_NO[value] ?? value;
}

export function LeadCard({ lead, saved, onToggleSave }: LeadCardProps) {
  const { contact, details } = lead;

  const infoRows: { icon: typeof Clock; text: string }[] = [];
  if (details.cuisine)
    infoRows.push({ icon: UtensilsCrossed, text: details.cuisine });
  if (details.openingHours)
    infoRows.push({ icon: Clock, text: details.openingHours });
  const facilities = [
    details.delivery && `Delivery: ${label(details.delivery)}`,
    details.takeaway && `Retirada: ${label(details.takeaway)}`,
    details.outdoorSeating && `Mesas na rua: ${label(details.outdoorSeating)}`,
    details.capacity && `${details.capacity} lugares`,
  ].filter(Boolean) as string[];
  if (facilities.length)
    infoRows.push({ icon: ShoppingBag, text: facilities.join(" · ") });
  if (details.wheelchair)
    infoRows.push({
      icon: Accessibility,
      text: `Acessibilidade: ${label(details.wheelchair)}`,
    });
  if (details.brand || details.operator)
    infoRows.push({
      icon: Bike,
      text: `Operado por ${details.operator ?? details.brand}`,
    });

  return (
    <Card
      className={cn(
        "group overflow-hidden border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        lead.level === "zero" && "border-signal-zero/30 shadow-signal-zero/10"
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-card-foreground">
                {lead.name}
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {lead.category}
              </Badge>
              {lead.contactable && (
                <Badge className="bg-signal-zero/15 text-[10px] text-signal-zero">
                  Contatável
                </Badge>
              )}
            </div>
            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">
                {lead.address || "Endereço não cadastrado no OpenStreetMap"}
              </span>
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
              {lead.lat.toFixed(5)}, {lead.lon.toFixed(5)}
              {details.postcode ? ` · CEP ${details.postcode}` : ""}
            </p>
          </div>
          <div className="shrink-0">
            <SignalBadge level={lead.level} />
          </div>
        </div>

        {/* Ficha estilo Google Maps */}
        {infoRows.length > 0 && (
          <div className="mt-3 space-y-1 rounded-lg border border-border/60 bg-background/50 p-3">
            {infoRows.map((row, i) => (
              <p
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <row.icon className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
                <span className="break-words">{row.text}</span>
              </p>
            ))}
          </div>
        )}

        {/* Canais de contato */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {contact.whatsappUrl && (
            <a
              href={contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-signal-zero/40 bg-signal-zero/10 px-2 py-1 text-xs text-signal-zero transition-colors hover:bg-signal-zero/20"
            >
              <Phone className="h-3 w-3" />
              WhatsApp {contact.phoneRaw}
            </a>
          )}
          {!contact.whatsappUrl && contact.phoneRaw && (
            <a
              href={`tel:${contact.phoneDigits}`}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
            >
              <Phone className="h-3 w-3" />
              {contact.phoneRaw}
            </a>
          )}
          {contact.instagramUrl && (
            <a
              href={contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1 text-xs text-cyan transition-colors hover:bg-cyan/20"
            >
              <Instagram className="h-3 w-3" />
              {contact.instagramHandle}
            </a>
          )}
          {contact.websiteUrl && (
            <a
              href={contact.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1 text-xs text-cyan"
            >
              <Globe className="h-3 w-3" />
              Site
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1 text-xs text-cyan"
            >
              <Mail className="h-3 w-3" />
              E-mail
            </a>
          )}
        </div>

        {/* Ações */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={saved ? "secondary" : "default"}
            onClick={() => onToggleSave(lead)}
            className={cn(
              "text-xs",
              saved && "bg-primary/20 text-primary hover:bg-primary/30"
            )}
          >
            {saved ? "Salvo" : "Salvar lead"}
          </Button>
          <Button size="sm" variant="outline" asChild className="gap-1 text-xs">
            <a href={lead.googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <Star className="h-3 w-3" />
              Ver avaliações
            </a>
          </Button>
          <Button size="sm" variant="ghost" asChild className="gap-1 text-xs">
            <a href={lead.directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-3 w-3" />
              Rota
            </a>
          </Button>
          <Button size="sm" variant="ghost" asChild className="gap-1 text-xs">
            <a href={lead.osmUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              OSM
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
