import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

interface CategoryChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(
      (category) =>
        category.label.toLowerCase().includes(q) ||
        category.group.toLowerCase().includes(q) ||
        category.key.toLowerCase().includes(q),
    );
  }, [query]);

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);
  };

  const selectAll = () => onChange(CATEGORIES.map((category) => category.key));
  const clear = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar categoria..."
            className="h-9 bg-background pl-8 text-xs"
          />
        </div>
        <Badge variant="secondary" className="shrink-0 h-7 px-2 text-[11px]">
          {value.length} selecionadas
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Escolha uma ou mais categorias para a varredura.
        </p>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={selectAll}>
            Todas
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={clear} disabled={value.length === 0}>
            <X className="h-3 w-3" /> Limpar
          </Button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background/40 p-3">
        {filtered.length === 0 ? (
          <p className="py-5 text-center text-xs text-muted-foreground">Nenhuma categoria encontrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((category) => {
              const active = value.includes(category.key);
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => toggle(category.key)}
                  aria-pressed={active}
                  title={category.group}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                    active
                      ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_var(--color-primary)]"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                  {category.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
