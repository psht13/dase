import { cn } from "@/shared/utils/cn";

type ActionFeedbackMessageProps = {
  className?: string;
  kind: "error" | "pending" | "success";
  message: string;
};

export function ActionFeedbackMessage({
  className,
  kind,
  message,
}: ActionFeedbackMessageProps) {
  return (
    <p
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : null,
        kind === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : null,
        kind === "pending" ? "border-border bg-muted text-foreground" : null,
        className,
      )}
      role={kind === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
