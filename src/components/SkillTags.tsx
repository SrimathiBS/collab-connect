import { Badge } from "@/components/ui/badge";

export const SkillTags = ({ skills, max }: { skills: string[]; max?: number }) => {
  const list = max ? skills.slice(0, max) : skills;
  const extra = max && skills.length > max ? skills.length - max : 0;
  if (!skills?.length) return <span className="text-xs text-muted-foreground">No skills listed</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((s) => (
        <Badge
          key={s}
          variant="secondary"
          className="bg-accent/40 text-accent-foreground border border-primary/20 hover:bg-accent/60"
        >
          {s}
        </Badge>
      ))}
      {extra > 0 && (
        <Badge variant="outline" className="text-muted-foreground">
          +{extra}
        </Badge>
      )}
    </div>
  );
};
