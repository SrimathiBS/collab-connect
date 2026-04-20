import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export const TagInput = ({ value, onChange, placeholder }: Props) => {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t || value.includes(t) || t.length > 30) return;
    onChange([...value, t]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
        {value.map((t) => (
          <Badge key={t} className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 gap-1">
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="opacity-70 hover:opacity-100"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => draft && add(draft)}
        placeholder={placeholder ?? "Type and press Enter…"}
      />
    </div>
  );
};
