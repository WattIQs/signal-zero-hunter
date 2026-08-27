import { Filter, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CategoryChips } from "@/components/sinal-zero/CategoryChips";
import type { CategoryKey } from "@/lib/types";

interface FilterDrawerProps {
  open: boolean;
  categories: CategoryKey[];
  onCategoriesChange: (categories: CategoryKey[]) => void;
  onlyLowSignal: boolean;
  onOnlyLowSignalChange: (value: boolean) => void;
  onlyContactable: boolean;
  onOnlyContactableChange: (value: boolean) => void;
  onClose: () => void;
  onReset: () => void;
}

export function FilterDrawer({
  open,
  categories,
  onCategoriesChange,
  onlyLowSignal,
  onOnlyLowSignalChange,
  onlyContactable,
  onOnlyContactableChange,
  onClose,
  onReset,
}: FilterDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Fechar filtros"
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        aria-label="Filtros de busca"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Filtros</h2>
              <p className="text-xs text-muted-foreground">Refine os leads encontrados</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <section className="space-y-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categorias
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Escolha quais tipos de negócio entram na varredura.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-3">
              <CategoryChips value={categories} onChange={onCategoriesChange} />
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Qualificação
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Mostre somente oportunidades que fazem sentido para prospecção.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
                <div className="pr-3">
                  <p className="text-sm font-medium">Somente contatáveis</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Exige telefone, WhatsApp ou Instagram disponível.
                  </p>
                </div>
                <Switch
                  checked={onlyContactable}
                  onCheckedChange={onOnlyContactableChange}
                  aria-label="Somente leads contatáveis"
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
                <div className="pr-3">
                  <p className="text-sm font-medium">Somente sinal zero/fraco</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Oculta negócios que já possuem presença digital completa.
                  </p>
                </div>
                <Switch
                  checked={onlyLowSignal}
                  onCheckedChange={onOnlyLowSignalChange}
                  aria-label="Somente leads com sinal zero ou fraco"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onReset}>
              Limpar filtros
            </Button>
            <Button className="flex-1 gap-2" onClick={onClose}>
              <Filter className="h-4 w-4" />
              Aplicar
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
