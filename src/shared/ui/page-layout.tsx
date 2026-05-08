import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
};

const maxWidthClassNames: Record<NonNullable<PageShellProps["maxWidth"]>, string> =
  {
    "2xl": "max-w-6xl",
    lg: "max-w-3xl",
    md: "max-w-xl",
    sm: "max-w-md",
    xl: "max-w-4xl",
  };

export function PageShell({
  children,
  className,
  contentClassName,
  id = "main-content",
  maxWidth = "xl",
}: PageShellProps) {
  return (
    <main
      className={cn(
        "min-h-dvh overflow-x-clip bg-[hsl(var(--brand-shell))]",
        className,
      )}
      id={id}
    >
      <section
        className={cn(
          "mx-auto w-full min-w-0 px-4 py-8 sm:px-6 sm:py-10",
          maxWidthClassNames[maxWidth],
          contentClassName,
        )}
      >
        {children}
      </section>
    </main>
  );
}

type PageHeaderProps = {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  titleClassName?: string;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  titleClassName,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "break-words font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <ActionBar>{actions}</ActionBar> : null}
    </header>
  );
}

type ActionBarProps = {
  children: ReactNode;
  className?: string;
};

export function ActionBar({ children, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}
