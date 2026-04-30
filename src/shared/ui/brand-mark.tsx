import { cn } from "@/shared/utils/cn";

type BrandMarkProps = {
  className?: string;
  markClassName?: string;
  subtitle?: string;
};

export function BrandMark({
  className,
  markClassName,
  subtitle,
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-14 shrink-0 place-items-center rounded-full bg-background text-center font-display text-base font-semibold leading-[0.85] text-foreground shadow-sm ring-1 ring-border",
          markClassName,
        )}
      >
        <span>
          DA
          <br />
          SE
        </span>
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-semibold leading-none text-foreground">
          Dase
        </span>
        {subtitle ? (
          <span className="mt-1 block text-xs font-medium text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
