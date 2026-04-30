import Link from "next/link";
import { LoginForm } from "@/modules/users/ui/login-form";
import { BrandMark } from "@/shared/ui/brand-mark";

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
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
        <div className="grid gap-3">
          <BrandMark subtitle="вхід власника" />
          <h1 className="font-display text-4xl font-semibold">
            Вхід до кабінету
          </h1>
          <p className="text-sm text-muted-foreground">
            Увійдіть як власник, щоб керувати товарами, замовленнями, оплатами
            та відправленнями.
          </p>
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

        <div className="rounded-md border border-border/80 bg-card/95 p-5 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Перший запуск?{" "}
          <Link className="font-medium text-foreground underline" href="/setup">
            Створити першого власника
          </Link>
        </p>
      </section>
    </main>
  );
}
