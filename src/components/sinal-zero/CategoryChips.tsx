import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  CATEGORIES_BY_GROUP,
  CATEGORY_BY_KEY,
  CATEGORY_GROUPS,
} from "@/lib/categories";

interface CategoryChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([CATEGORY_GROUPS[0]]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  const toggle = (key: string) => {
    onChange(
      value.includes(key) ? value.filter((k) => k !== key) : [...value, key]
    );
  };

  const toggleGroup = (group: string) => {
    const keys = (CATEGORIES_BY_GROUP[group] ?? []).map((c) => c.key);
    const allOn = keys.every((k) => value.includes(k));
    onChange(
      allOn
        ? value.filter((k) => !keys.includes(k))
        : [...new Set([...value, ...keys])]
    );
  };

  const Chip = ({ keyName }: { keyName: string }) => {
    const def = CATEGORY_BY_KEY[keyName];
    if (!def) return null;
    const active = value.includes(keyName);
    return (
      <button
        type="button"
        onClick={() => toggle(keyName)}
        aria-pressed={active}
        className={cn(
          "group inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
          active
            ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_var(--color-primary)]"
            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground"
        )}
      >
        {active && <Check className="h-3 w-3" />}
        {def.label}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categoria (academia, pet shop, papelaria...)"
            className="h-9 bg-background pl-8 text-xs"
          />
        </div>
        <Badge variant="secondary" className="h-7 gap-1 px-2 text-[11px]">
          {value.length} selecionadas
        </Badge>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => onChange([])}
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      {filtered ? (
        <div className="flex flex-wrap gap-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma categoria com esse nome.
            </p>
          ) : (
            filtered.map((c) => <Chip key={c.key} keyName={c.key} />)
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {CATEGORY_GROUPS.map((group) => {
            const items = CATEGORIES_BY_GROUP[group] ?? [];
            const selected = items.filter((c) => value.includes(c.key)).length;
            const open = openGroups.includes(group);
            return (
              <div
                key={group}
                className="overflow-hidden rounded-lg border border-border/70 bg-background/40"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) =>
                        prev.includes(group)
                          ? prev.filter((g) => g !== group)
                          : [...prev, group]
                      )
                    }
                    className="flex flex-1 items-center gap-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-300",
                        open ? "rotate-0" : "-rotate-90"
                      )}
                    />
                    {group}
                    {selected > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">
                        {selected}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="text-[10px] uppercase tracking-wider text-primary/80 transition-colors hover:text-primary"
                  >
                    {selected === items.length ? "remover" : "tudo"}
                  </button>
                </div>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    open
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-wrap gap-2 px-3 pb-3">
                      {items.map((c) => (
                        <Chip key={c.key} keyName={c.key} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
