import { Check, Globe, Instagram, Mail, Phone, X } from "lucide-react";
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

export function LeadCard({ lead, saved, onToggleSave }: LeadCardProps) {
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    lead.name
  )}`;

  const badgeItems = [
    { key: "site", label: "Site", ok: lead.signals.website },
    { key: "instagram", label: "Instagram", ok: lead.signals.instagram },
    { key: "phone", label: "Telefone", ok: lead.signals.phone },
  ] as const;

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
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {lead.address || "Endereço não disponível"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
              {lead.lat.toFixed(5)}, {lead.lon.toFixed(5)}
            </p>
          </div>
          <div className="shrink-0">
            <SignalBadge level={lead.level} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {badgeItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                item.ok
                  ? "border-cyan/30 bg-cyan/10 text-cyan"
                  : "border-muted-foreground/20 bg-muted/40 text-muted-foreground"
              )}
            >
              {item.ok ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {item.key === "site" && <Globe className="h-3 w-3" />}
              {item.key === "instagram" && <Instagram className="h-3 w-3" />}
              {item.key === "phone" && <Phone className="h-3 w-3" />}
              <span>{item.label}</span>
            </div>
          ))}
          {lead.signals.email && (
            <div className="flex items-center gap-1 rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1 text-xs text-cyan">
              <Mail className="h-3 w-3" />
              <span>Email</span>
            </div>
          )}
        </div>

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
          <Button
            size="sm"
            variant="outline"
            asChild
            className="text-xs"
          >
            <a
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Verificar agora
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
