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
  align?: "start" | "center" | "end" | "between";
  children: ReactNode;
  className?: string;
  mobile?: "stack" | "row";
  size?: "compact" | "default";
  sticky?: boolean;
};

const actionAlignmentClassNames: Record<
  NonNullable<ActionBarProps["align"]>,
  string
> = {
  between: "sm:justify-between",
  center: "sm:justify-center",
  end: "sm:justify-end",
  start: "sm:justify-start",
};

const actionSizingClassNames: Record<
  NonNullable<ActionBarProps["size"]>,
  string
> = {
  compact:
    "[&>a]:min-w-0 [&>button]:min-w-0 [&>form>button]:min-w-0 [&>form]:min-w-0",
  default:
    "sm:[&>a]:min-w-36 sm:[&>button]:min-w-36 sm:[&>form>button]:min-w-36",
};

const directActionWidthClassName =
  "[&>a]:w-full [&>button]:w-full [&>form>button]:w-full [&>form]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto sm:[&>form>button]:w-auto sm:[&>form]:w-auto";

const nestedActionWidthClassName =
  "[&>a]:w-full [&>button]:w-full [&>form>button]:w-full [&>form]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto sm:[&>form>button]:w-auto sm:[&>form]:w-auto";

export function ActionBar({
  align = "end",
  children,
  className,
  mobile = "stack",
  size = "default",
  sticky = false,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-3 [&_:where(a,button)]:min-h-11",
        mobile === "stack"
          ? cn("flex-col sm:flex-row sm:items-center", directActionWidthClassName)
          : "flex-row flex-wrap items-center",
        actionAlignmentClassNames[align],
        actionSizingClassNames[size],
        sticky
          ? "-mx-4 sticky bottom-0 z-20 border-t border-border/80 bg-card/95 px-4 py-3 shadow-lg sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
          : null,
        className,
      )}
    >
      {children}
    </div>
  );
}

type FormActionsProps = {
  className?: string;
  compact?: boolean;
  destructiveActions?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  sticky?: boolean;
};

export function FormActions({
  className,
  compact = false,
  destructiveActions,
  primaryAction,
  secondaryActions,
  sticky = false,
}: FormActionsProps) {
  const groupClassName = cn(
    "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center",
    nestedActionWidthClassName,
    compact ? actionSizingClassNames.compact : actionSizingClassNames.default,
  );

  return (
    <footer
      className={cn(
        "min-w-0 border-t border-border/70 pt-4",
        sticky
          ? "-mx-4 sticky bottom-0 z-20 border-border/80 bg-card/95 px-4 pb-3 shadow-lg sm:static sm:m-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:shadow-none"
          : null,
        className,
      )}
    >
      <ActionBar
        className="flex-col-reverse sm:flex-row"
        size={compact ? "compact" : "default"}
      >
        {destructiveActions ? (
          <div className={cn(groupClassName, "sm:mr-auto")}>
            {destructiveActions}
          </div>
        ) : null}
        {secondaryActions ? (
          <div className={groupClassName}>{secondaryActions}</div>
        ) : null}
        {primaryAction ? <div className={groupClassName}>{primaryAction}</div> : null}
      </ActionBar>
    </footer>
  );
}
