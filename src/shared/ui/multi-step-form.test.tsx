import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  FormSummaryCard,
  StepActions,
  StepCard,
  Stepper,
  type MultiStepFormStep,
  WizardPageLayout,
  WizardStepper,
  useMultiStepForm,
} from "@/shared/ui/multi-step-form";

const demoSchema = z.object({
  email: z.string().trim().email("Вкажіть коректний email"),
  name: z.string().trim().min(2, "Вкажіть ім’я"),
});

type DemoValues = z.infer<typeof demoSchema>;

const demoSteps = [
  {
    fields: ["name"],
    id: "contact",
    title: "Контакти",
  },
  {
    fields: ["email"],
    id: "communication",
    title: "Зв’язок",
  },
  {
    fields: [],
    id: "summary",
    title: "Перевірка",
  },
] satisfies readonly MultiStepFormStep<DemoValues>[];

type DemoMultiStepFormProps = {
  initialStepIndex?: number;
  onSubmit: (values: DemoValues) => void;
};

function DemoMultiStepForm({
  initialStepIndex = 0,
  onSubmit,
}: DemoMultiStepFormProps) {
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const form = useForm<DemoValues>({
    defaultValues: {
      email: "",
      name: "",
    },
    resolver: zodResolver(demoSchema),
  });
  const stepper = useMultiStepForm({
    form,
    initialStepIndex,
    steps: demoSteps,
  });
  const name = form.watch("name");
  const email = form.watch("email");

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={stepper.handleSubmit(onSubmit)}
    >
      <Stepper
        currentStepIndex={stepper.currentStepIndex}
        steps={demoSteps}
      />
      <StepCard
        errorMessage={stepper.stepErrorMessage}
        headingRef={stepper.headingRef}
        title={stepper.currentStep.title}
      >
        {stepper.currentStep.id === "contact" ? (
          <div className="grid gap-2">
            <label htmlFor="demo-name">Ім’я</label>
            <input
              aria-describedby={
                form.formState.errors.name ? "demo-name-error" : undefined
              }
              aria-invalid={Boolean(form.formState.errors.name)}
              id="demo-name"
              {...form.register("name")}
            />
            <FieldError
              id="demo-name-error"
              message={form.formState.errors.name?.message}
            />
          </div>
        ) : null}

        {stepper.currentStep.id === "communication" ? (
          <div className="grid gap-2">
            <label htmlFor="demo-email">Email</label>
            <input
              aria-describedby={
                form.formState.errors.email ? "demo-email-error" : undefined
              }
              aria-invalid={Boolean(form.formState.errors.email)}
              id="demo-email"
              {...form.register("email")}
            />
            <FieldError
              id="demo-email-error"
              message={form.formState.errors.email?.message}
            />
          </div>
        ) : null}

        {stepper.currentStep.id === "summary" ? (
          <div className="grid gap-3">
            <FormSummaryCard
              items={[
                { id: "name", label: "Ім’я", value: name || "Не вказано" },
                { id: "email", label: "Email", value: email || "Не вказано" },
              ]}
              title="Підсумок"
            />
            <button
              onClick={async () => {
                const isValid = await stepper.validateAllSteps();
                setReviewMessage(
                  isValid ? "Усі кроки заповнені" : "Перевірте кроки",
                );
              }}
              type="button"
            >
              Перевірити
            </button>
            {reviewMessage ? (
              <p aria-live="polite" role="status">
                {reviewMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </StepCard>
      <StepActions
        isFirstStep={stepper.isFirstStep}
        isLastStep={stepper.isLastStep}
        onBack={stepper.goBack}
        onNext={stepper.goNext}
        submitLabel="Завершити"
      />
    </form>
  );
}

describe("multi-step form foundation", () => {
  it("announces progress and marks the current step", () => {
    render(<DemoMultiStepForm onSubmit={vi.fn()} />);

    expect(screen.getAllByText("Крок 1 із 3")[0]).toBeVisible();
    const progress = screen.getByRole("navigation", {
      name: "Прогрес форми",
    });
    const currentStep = within(progress).getByText("Контакти");

    expect(currentStep.closest("[aria-current='step']")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Назад" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Далі" })).toBeEnabled();
  });

  it("renders compact wizard layout state and consistent action buttons", () => {
    const { container } = render(
      <WizardPageLayout
        message={<p role="status">Чернетку збережено</p>}
        stepper={
          <WizardStepper
            currentStepIndex={1}
            desktopLayout="rail"
            steps={demoSteps}
          />
        }
      >
        <StepCard title="Зв’язок">
          <p>Поля кроку</p>
        </StepCard>
        <StepActions
          isFirstStep={false}
          isLastStep={false}
          onBack={vi.fn()}
          onNext={vi.fn()}
          secondaryAction={<a href="/dashboard/products">Скасувати</a>}
        />
      </WizardPageLayout>,
    );

    const progress = screen.getByRole("navigation", {
      name: "Прогрес форми",
    });

    expect(within(progress).getAllByText("Крок 2 із 3")[0]).toBeVisible();
    expect(
      within(progress).getByText("Зв’язок").closest("[aria-current='step']"),
    ).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Чернетку збережено");
    expect(screen.getByRole("button", { name: "Далі" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Назад" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Скасувати" })).toBeVisible();
    expect(container.querySelector("footer")).toHaveClass("border-t");
    expect(container.querySelector("footer > div")).toHaveClass(
      "flex-col-reverse",
    );
    expect(container.querySelector("footer > div")).toHaveClass(
      "sm:justify-end",
    );
  });

  it("validates only the current step before moving forward", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DemoMultiStepForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(
      await screen.findByText("Заповніть обов’язкові поля цього кроку"),
    ).toBeVisible();
    expect(screen.getByText("Вкажіть ім’я")).toBeVisible();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText("Ім’я")).toHaveFocus());
  });

  it("preserves values and focuses the step heading when navigating", async () => {
    const user = userEvent.setup();
    render(<DemoMultiStepForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Ім’я"), "Олена");
    await user.click(screen.getByRole("button", { name: "Далі" }));

    const communicationHeading = await screen.findByRole("heading", {
      name: "Зв’язок",
    });

    await waitFor(() => expect(communicationHeading).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(await screen.findByLabelText("Ім’я")).toHaveValue("Олена");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Контакти" })).toHaveFocus(),
    );
  });

  it("turns early form submit attempts into next-step validation", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DemoMultiStepForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Ім’я"), "Олена");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Зв’язок" }),
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prevents final submit until all required fields are valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DemoMultiStepForm initialStepIndex={2} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Завершити" }));

    expect(
      await screen.findByText("Заповніть обов’язкові поля цього кроку"),
    ).toBeVisible();
    expect(await screen.findByText("Вкажіть ім’я")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Контакти" })).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText("Ім’я")).toHaveFocus());
  });

  it("submits the complete form only from the final step", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DemoMultiStepForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Ім’я"), "Олена");
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.type(await screen.findByLabelText("Email"), "olena@example.com");
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(await screen.findByText("Підсумок")).toBeVisible();
    expect(screen.getByText("olena@example.com")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Перевірити" }));
    expect(await screen.findByText("Усі кроки заповнені")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Завершити" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          email: "olena@example.com",
          name: "Олена",
        },
        expect.anything(),
      ),
    );
  });
});

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p aria-live="polite" className="text-sm text-destructive" id={id}>
      {message}
    </p>
  );
}
