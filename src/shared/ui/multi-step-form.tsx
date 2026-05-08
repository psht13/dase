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
import { FormActions } from "@/shared/ui/page-layout";
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
    progressLabel: `Крок ${currentStepIndex + 1} із ${steps.length}`,
    setCurrentStepIndex: moveToStep,
    stepErrorMessage,
    validateAllSteps,
    validateStep,
  };
}

type WizardPageLayoutProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  message?: ReactNode;
  stepper: ReactNode;
  stepperClassName?: string;
  variant?: "sidebar" | "stacked";
};

export function WizardPageLayout({
  children,
  className,
  contentClassName,
  message,
  stepper,
  stepperClassName,
  variant = "sidebar",
}: WizardPageLayoutProps) {
  const hasSidebar = variant === "sidebar";

  return (
    <div
      className={cn(
        "mx-auto grid w-full min-w-0 gap-4",
        hasSidebar
          ? "max-w-6xl lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]"
          : "max-w-4xl",
        className,
      )}
    >
      {message ? (
        <div className={cn("min-w-0", hasSidebar ? "lg:col-span-2" : null)}>
          {message}
        </div>
      ) : null}
      <div
        className={cn(
          "min-w-0",
          hasSidebar ? "lg:sticky lg:top-24" : null,
          stepperClassName,
        )}
      >
        {stepper}
      </div>
      <div className={cn("grid min-w-0 gap-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

type StepperStep = {
  id: string;
  title: ReactNode;
};

type WizardStepperProps = {
  className?: string;
  currentStepIndex: number;
  desktopLayout?: "inline" | "rail";
  steps: readonly StepperStep[];
};

export function WizardStepper({
  className,
  currentStepIndex,
  desktopLayout = "inline",
  steps,
}: WizardStepperProps) {
  return (
    <nav
      aria-label="Прогрес форми"
      className={cn("grid min-w-0 gap-2", className)}
    >
      <p
        aria-live="polite"
        className="text-sm font-medium text-muted-foreground"
      >
        Крок {currentStepIndex + 1} із {steps.length}
      </p>
      <ol
        className={cn(
          "grid min-w-0 gap-1.5",
          desktopLayout === "rail"
            ? "sm:grid-cols-2 lg:grid-cols-1"
            : "sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]",
        )}
      >
        {steps.map((step, index) => (
          <WizardStepIndicator
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

export function Stepper(props: WizardStepperProps) {
  return <WizardStepper {...props} />;
}

type WizardStepIndicatorProps = {
  className?: string;
  label: ReactNode;
  status: "completed" | "current" | "upcoming";
  stepNumber: number;
  totalSteps: number;
};

export function WizardStepIndicator({
  className,
  label,
  status,
  stepNumber,
  totalSteps,
}: WizardStepIndicatorProps) {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  return (
    <li className={cn("min-w-0", className)}>
      <span
        aria-current={isCurrent ? "step" : undefined}
        className={cn(
          "flex min-h-10 min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
          isCurrent
            ? "border-primary/70 bg-primary/5 text-foreground"
            : "border-border/80 bg-card/80 text-muted-foreground",
          isCompleted ? "border-border bg-muted/70 text-foreground" : null,
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
            isCurrent
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background",
            isCompleted ? "border-foreground/20 bg-foreground/10" : null,
          )}
        >
          {stepNumber}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="text-xs font-medium">
            Крок {stepNumber} із {totalSteps}
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

export function WizardStepCard({
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
        "grid min-w-0 gap-4 rounded-md border border-border/80 bg-card/95 p-4 text-card-foreground shadow-sm md:p-5 lg:gap-5",
        className,
      )}
    >
      <div className="grid min-w-0 gap-2">
        <h2
          className="break-words font-display text-lg font-semibold leading-tight text-foreground sm:text-xl"
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

export function StepCard(props: StepCardProps) {
  return <WizardStepCard {...props} />;
}

type WizardActionsProps = {
  className?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
};

export function WizardActions({
  className,
  primaryAction,
  secondaryActions,
}: WizardActionsProps) {
  return (
    <FormActions
      className={className}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
    />
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
  secondaryAction?: ReactNode;
  showBackButton?: boolean;
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
  secondaryAction,
  showBackButton = true,
  submitLabel = "Завершити",
}: StepActionsProps) {
  const primaryAction = isLastStep ? (
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
  );

  return (
    <WizardActions
      className={className}
      primaryAction={primaryAction}
      secondaryActions={
        showBackButton || secondaryAction ? (
          <>
            {showBackButton ? (
              <Button
                className="w-full sm:w-auto"
                disabled={isFirstStep || isPending}
                onClick={onBack}
                type="button"
                variant="outline"
              >
                {backLabel}
              </Button>
            ) : null}
            {secondaryAction}
          </>
        ) : undefined
      }
    />
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
