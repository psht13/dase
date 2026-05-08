"use client";

import type {
  BaseSyntheticEvent,
  ReactNode,
  Ref,
} from "react";
import { useCallback, useId, useRef, useState } from "react";
import type {
  FieldErrors,
  FieldPath,
  FieldValues,
  SubmitErrorHandler,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/cn";

const defaultValidationMessage = "Заповніть обов’язкові поля цього кроку";

export type MultiStepFormStep<TFieldValues extends FieldValues = FieldValues> = {
  description?: ReactNode;
  fields: readonly FieldPath<TFieldValues>[];
  id: string;
  title: ReactNode;
};

type UseMultiStepFormOptions<TFieldValues extends FieldValues> = {
  finalValidationMessage?: string;
  form: UseFormReturn<TFieldValues>;
  initialStepIndex?: number;
  steps: readonly MultiStepFormStep<TFieldValues>[];
  validationMessage?: string;
};

export function useMultiStepForm<TFieldValues extends FieldValues>({
  finalValidationMessage = defaultValidationMessage,
  form,
  initialStepIndex = 0,
  steps,
  validationMessage = defaultValidationMessage,
}: UseMultiStepFormOptions<TFieldValues>) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    clampStepIndex(initialStepIndex, steps.length),
  );
  const [stepErrorMessage, setStepErrorMessage] = useState<string | null>(null);
  const currentStep = steps[currentStepIndex] ?? steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex >= Math.max(steps.length - 1, 0);

  const focusStepHeading = useCallback(() => {
    window.setTimeout(() => {
      headingRef.current?.focus();
    }, 0);
  }, []);

  const focusField = useCallback(
    (fieldName: FieldPath<TFieldValues>) => {
      window.setTimeout(() => {
        form.setFocus(fieldName);
      }, 0);
    },
    [form],
  );

  const focusFirstInvalidField = useCallback(
    (
      fields: readonly FieldPath<TFieldValues>[],
      errors?: FieldErrors<TFieldValues>,
    ) => {
      const invalidField =
        findFirstErrorField(fields, errors) ??
        fields.find((field) => form.getFieldState(field).invalid);

      if (invalidField) {
        focusField(invalidField);
        return;
      }

      focusStepHeading();
    },
    [focusField, focusStepHeading, form],
  );

  const revalidateAndFocusFields = useCallback(
    (
      fields: readonly FieldPath<TFieldValues>[],
      errors?: FieldErrors<TFieldValues>,
    ) => {
      window.setTimeout(() => {
        void form
          .trigger([...fields], {
            shouldFocus: true,
          })
          .then(() => {
            focusFirstInvalidField(fields, errors);
          });
      }, 0);
    },
    [focusFirstInvalidField, form],
  );

  const moveToStep = useCallback(
    (stepIndex: number) => {
      setCurrentStepIndex(clampStepIndex(stepIndex, steps.length));
      focusStepHeading();
    },
    [focusStepHeading, steps.length],
  );

  const validateStep = useCallback(
    async (stepIndex = currentStepIndex) => {
      const step = steps[stepIndex];

      if (!step || step.fields.length === 0) {
        setStepErrorMessage(null);
        return true;
      }

      const isValid = await form.trigger([...step.fields], {
        shouldFocus: true,
      });

      if (!isValid) {
        setStepErrorMessage(validationMessage);
        focusFirstInvalidField(step.fields);
        return false;
      }

      setStepErrorMessage(null);
      return true;
    },
    [
      currentStepIndex,
      focusFirstInvalidField,
      form,
      steps,
      validationMessage,
    ],
  );

  const goNext = useCallback(async () => {
    const isCurrentStepValid = await validateStep(currentStepIndex);

    if (!isCurrentStepValid) {
      return false;
    }

    if (!isLastStep) {
      moveToStep(currentStepIndex + 1);
    }

    return true;
  }, [currentStepIndex, isLastStep, moveToStep, validateStep]);

  const goBack = useCallback(() => {
    setStepErrorMessage(null);

    if (!isFirstStep) {
      moveToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, isFirstStep, moveToStep]);

  const validateAllSteps = useCallback(async () => {
    for (const [stepIndex, step] of steps.entries()) {
      if (step.fields.length === 0) {
        continue;
      }

      const isValid = await form.trigger([...step.fields], {
        shouldFocus: false,
      });

      if (!isValid) {
        setStepErrorMessage(finalValidationMessage);
        setCurrentStepIndex(stepIndex);
        revalidateAndFocusFields(step.fields);
        return false;
      }
    }

    setStepErrorMessage(null);
    return true;
  }, [finalValidationMessage, form, revalidateAndFocusFields, steps]);

  const handleSubmit = useCallback(
    (
      onValid: SubmitHandler<TFieldValues>,
      onInvalid?: SubmitErrorHandler<TFieldValues>,
    ) => {
      const submitFinalStep = form.handleSubmit(onValid, (errors, event) => {
        const invalidStepIndex = findFirstInvalidStepIndex(steps, errors);

        setStepErrorMessage(finalValidationMessage);

        if (invalidStepIndex >= 0) {
          const invalidStepFields = steps[invalidStepIndex]?.fields ?? [];

          setCurrentStepIndex(invalidStepIndex);
          revalidateAndFocusFields(invalidStepFields, errors);
        } else {
          focusStepHeading();
        }

        onInvalid?.(errors, event);
      });

      return async (event?: BaseSyntheticEvent) => {
        if (!isLastStep) {
          event?.preventDefault();
          await goNext();
          return;
        }

        await submitFinalStep(event);
      };
    },
    [
      finalValidationMessage,
      focusStepHeading,
      form,
      goNext,
      isLastStep,
      revalidateAndFocusFields,
      steps,
    ],
  );

  return {
    currentStep,
    currentStepIndex,
    goBack,
    goNext,
    handleSubmit,
    headingRef,
    isFirstStep,
    isLastStep,
    progressLabel: `Крок ${currentStepIndex + 1} з ${steps.length}`,
    setCurrentStepIndex: moveToStep,
    stepErrorMessage,
    validateAllSteps,
    validateStep,
  };
}

type StepperStep = {
  id: string;
  title: ReactNode;
};

type StepperProps = {
  className?: string;
  currentStepIndex: number;
  steps: readonly StepperStep[];
};

export function Stepper({ className, currentStepIndex, steps }: StepperProps) {
  return (
    <nav
      aria-label="Прогрес форми"
      className={cn("grid min-w-0 gap-3", className)}
    >
      <p
        aria-live="polite"
        className="text-sm font-medium text-muted-foreground"
      >
        Крок {currentStepIndex + 1} з {steps.length}
      </p>
      <ol className="grid min-w-0 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {steps.map((step, index) => (
          <StepIndicator
            key={step.id}
            label={step.title}
            status={getStepStatus(index, currentStepIndex)}
            stepNumber={index + 1}
            totalSteps={steps.length}
          />
        ))}
      </ol>
    </nav>
  );
}

type StepIndicatorProps = {
  className?: string;
  label: ReactNode;
  status: "completed" | "current" | "upcoming";
  stepNumber: number;
  totalSteps: number;
};

export function StepIndicator({
  className,
  label,
  status,
  stepNumber,
  totalSteps,
}: StepIndicatorProps) {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  return (
    <li className={cn("min-w-0", className)}>
      <span
        aria-current={isCurrent ? "step" : undefined}
        className={cn(
          "grid min-h-11 min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 rounded-md border px-3 py-2 text-left",
          isCurrent
            ? "border-primary bg-primary/10 text-foreground"
            : "border-border/80 bg-card/80 text-muted-foreground",
          isCompleted ? "border-accent bg-accent/30 text-foreground" : null,
        )}
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
            isCurrent
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background",
            isCompleted ? "border-accent bg-accent text-accent-foreground" : null,
          )}
        >
          {stepNumber}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="text-xs font-medium">
            Крок {stepNumber} з {totalSteps}
          </span>
          <span className="break-words text-sm font-medium leading-5">
            {label}
          </span>
        </span>
      </span>
    </li>
  );
}

type StepCardProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  errorMessage?: string | null;
  headingId?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  title: ReactNode;
};

export function StepCard({
  children,
  className,
  description,
  errorMessage,
  headingId,
  headingRef,
  title,
}: StepCardProps) {
  const generatedId = useId();
  const resolvedHeadingId = headingId ?? `${generatedId}-heading`;
  const descriptionId = description
    ? `${resolvedHeadingId}-description`
    : undefined;
  const errorId = errorMessage ? `${resolvedHeadingId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  return (
    <section
      aria-describedby={describedBy || undefined}
      aria-labelledby={resolvedHeadingId}
      className={cn(
        "grid min-w-0 gap-5 rounded-md border border-border/80 bg-card/95 p-4 text-card-foreground shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="grid min-w-0 gap-2">
        <h2
          className="break-words font-display text-xl font-semibold leading-tight text-foreground"
          id={resolvedHeadingId}
          ref={headingRef}
          tabIndex={-1}
        >
          {title}
        </h2>
        {description ? (
          <p
            className="text-sm leading-6 text-muted-foreground"
            id={descriptionId}
          >
            {description}
          </p>
        ) : null}
        {errorMessage ? (
          <p
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            id={errorId}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type StepActionsProps = {
  backLabel?: string;
  className?: string;
  isFirstStep: boolean;
  isLastStep: boolean;
  isPending?: boolean;
  nextLabel?: string;
  onBack: () => void;
  onNext: () => Promise<boolean> | boolean | void;
  submitLabel?: ReactNode;
};

export function StepActions({
  backLabel = "Назад",
  className,
  isFirstStep,
  isLastStep,
  isPending = false,
  nextLabel = "Далі",
  onBack,
  onNext,
  submitLabel = "Завершити",
}: StepActionsProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col-reverse gap-3 sm:flex-row sm:justify-between",
        className,
      )}
    >
      <Button
        disabled={isFirstStep || isPending}
        onClick={onBack}
        type="button"
        variant="outline"
      >
        {backLabel}
      </Button>
      {isLastStep ? (
        <Button disabled={isPending} key="submit" type="submit">
          {submitLabel}
        </Button>
      ) : (
        <Button
          disabled={isPending}
          key="next"
          onClick={(event) => {
            event.preventDefault();
            void onNext();
          }}
          type="button"
        >
          {nextLabel}
        </Button>
      )}
    </div>
  );
}

type FormSummaryItem = {
  id: string;
  label: ReactNode;
  value: ReactNode;
};

type FormSummaryCardProps = {
  children?: ReactNode;
  className?: string;
  items?: readonly FormSummaryItem[];
  title?: ReactNode;
};

export function FormSummaryCard({
  children,
  className,
  items = [],
  title = "Підсумок",
}: FormSummaryCardProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "grid min-w-0 gap-4 rounded-md border border-border/80 bg-background p-4",
        className,
      )}
    >
      <h3
        className="break-words font-display text-lg font-semibold text-foreground"
        id={headingId}
      >
        {title}
      </h3>
      {items.length ? (
        <dl className="grid min-w-0 gap-3">
          {items.map((item) => (
            <div
              className="grid min-w-0 gap-1 border-b border-border/70 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
              key={item.id}
            >
              <dt className="text-sm font-medium text-muted-foreground">
                {item.label}
              </dt>
              <dd className="min-w-0 break-words text-sm text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}

function getStepStatus(
  stepIndex: number,
  currentStepIndex: number,
): "completed" | "current" | "upcoming" {
  if (stepIndex < currentStepIndex) {
    return "completed";
  }

  if (stepIndex === currentStepIndex) {
    return "current";
  }

  return "upcoming";
}

function clampStepIndex(stepIndex: number, stepCount: number) {
  if (stepCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(stepIndex, 0), stepCount - 1);
}

function findFirstInvalidStepIndex<TFieldValues extends FieldValues>(
  steps: readonly MultiStepFormStep<TFieldValues>[],
  errors: FieldErrors<TFieldValues>,
) {
  return steps.findIndex((step) =>
    step.fields.some((field) => hasErrorForPath(errors, field)),
  );
}

function findFirstErrorField<TFieldValues extends FieldValues>(
  fields: readonly FieldPath<TFieldValues>[],
  errors?: FieldErrors<TFieldValues>,
) {
  if (!errors) {
    return undefined;
  }

  return fields.find((field) => hasErrorForPath(errors, field));
}

function hasErrorForPath<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  fieldName: FieldPath<TFieldValues>,
) {
  const segments = String(fieldName)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".");
  let current: unknown = errors;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return false;
    }

    if (!(segment in current)) {
      return false;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return Boolean(current);
}
