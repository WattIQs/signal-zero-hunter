import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type CategoryKey } from "@/lib/types";

interface CategoryChipsProps {
  value: CategoryKey[];
  onChange: (value: CategoryKey[]) => void;
}

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <ToggleGroup
      type="multiple"
      value={value}
      onValueChange={(v) => onChange(v as CategoryKey[])}
      className="flex flex-wrap gap-2"
    >
      {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => (
        <ToggleGroupItem
          key={key}
          value={key}
          aria-label={CATEGORY_LABELS[key]}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
            "data-[state=on]:border-primary data-[state=on]:bg-primary/15 data-[state=on]:text-primary",
            "data-[state=off]:border-border data-[state=off]:bg-muted/40 data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted"
          )}
        >
          {CATEGORY_LABELS[key]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
