"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";

type PaymentRequisiteCopyButtonProps = {
  displayValue: string;
};

export function PaymentRequisiteCopyButton({
  displayValue,
}: PaymentRequisiteCopyButtonProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function copyDisplayValue() {
    startTransition(() => {
      void navigator.clipboard.writeText(displayValue).then(() => {
        setHasCopied(true);
        window.setTimeout(() => setHasCopied(false), 1800);
      });
    });
  }

  return (
    <Button
      aria-label="Скопіювати реквізити"
      disabled={isPending}
      onClick={copyDisplayValue}
      size="sm"
      type="button"
      variant="outline"
    >
      {hasCopied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {hasCopied ? "Скопійовано" : "Копіювати"}
    </Button>
  );
}
