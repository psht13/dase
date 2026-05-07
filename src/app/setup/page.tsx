import Link from "next/link";
import { getOwnerSetupStateUseCase } from "@/modules/users/application/owner-setup";
import { getUserRepository } from "@/modules/users/infrastructure/user-repository-factory";
import { OwnerSetupForm } from "@/modules/users/ui/owner-setup-form";
import { getWebEnv } from "@/shared/config/env";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [env, state] = await Promise.all([
    Promise.resolve(getWebEnv()),
    getOwnerSetupStateUseCase({
      userRepository: getUserRepository(),
    }),
  ]);

  if (!state.available) {
    return (
      <SetupUnavailable message="Перший власник уже створений. Увійдіть до кабінету власника." />
    );
  }

  getWebEnv({ requireOwnerSetupToken: true });

  return (
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
        <div className="grid gap-3">
          <BrandMark subtitle="перший запуск" />
          <h1 className="font-display text-4xl font-semibold">
            Створення першого власника
          </h1>
          <p className="text-sm text-muted-foreground">
            Створіть перший обліковий запис власника для доступу до кабінету.
          </p>
        </div>

        <div className="rounded-md border border-border/80 bg-card/95 p-5 shadow-sm">
          <OwnerSetupForm requiresSetupToken={env.NODE_ENV === "production"} />
        </div>
      </section>
    </main>
  );
}

function SetupUnavailable({ message }: { message: string }) {
  return (
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-10 text-center">
        <BrandMark className="justify-center" subtitle="перший запуск" />
        <h1 className="font-display text-4xl font-semibold">
          Налаштування недоступне
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild variant="outline">
          <Link href="/login">До сторінки входу</Link>
        </Button>
      </section>
    </main>
  );
}
