import Link from "next/link";
import { LoginForm } from "@/modules/users/ui/login-form";
import { BrandMark } from "@/shared/ui/brand-mark";
import { PageHeader, PageShell } from "@/shared/ui/page-layout";

type LoginPageProps = {
  searchParams?: Promise<{
    logout?: string;
    setup?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const loggedOut = params?.logout === "1";
  const setupCreated = params?.setup === "created";

  return (
    <PageShell
      contentClassName="flex min-h-dvh flex-col justify-center gap-6"
      maxWidth="sm"
    >
        <div className="grid gap-3">
          <BrandMark subtitle="вхід власника" />
          <PageHeader
            description="Увійдіть як власник, щоб керувати товарами, замовленнями, оплатами та відправленнями."
            title="Вхід до кабінету"
          />
        </div>

        {setupCreated ? (
          <p
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
            role="status"
          >
            Першого власника створено. Увійдіть із новими даними.
          </p>
        ) : null}

        {loggedOut ? (
          <p
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            role="status"
          >
            Ви вийшли з кабінету.
          </p>
        ) : null}

        <div className="rounded-md border border-border/80 bg-card/95 p-4 shadow-sm sm:p-5">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Перший запуск?{" "}
          <Link
            className="inline-flex min-h-11 items-center font-medium text-foreground underline"
            href="/setup"
          >
            Створити першого власника
          </Link>
        </p>
    </PageShell>
  );
}
