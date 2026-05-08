import Link from "next/link";
import { getOwnerSetupStateUseCase } from "@/modules/users/application/owner-setup";
import { getUserRepository } from "@/modules/users/infrastructure/user-repository-factory";
import { OwnerSetupForm } from "@/modules/users/ui/owner-setup-form";
import { getWebEnv } from "@/shared/config/env";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";
import { ActionBar, PageHeader, PageShell } from "@/shared/ui/page-layout";

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
    <PageShell
      contentClassName="flex min-h-dvh flex-col justify-center gap-6"
      maxWidth="sm"
    >
        <div className="grid gap-3">
          <BrandMark subtitle="перший запуск" />
          <PageHeader
            description="Створіть перший обліковий запис власника для доступу до кабінету."
            title="Створення першого власника"
          />
        </div>

        <div className="rounded-md border border-border/80 bg-card/95 p-4 shadow-sm sm:p-5">
          <OwnerSetupForm requiresSetupToken={env.NODE_ENV === "production"} />
        </div>
    </PageShell>
  );
}

function SetupUnavailable({ message }: { message: string }) {
  return (
    <PageShell
      contentClassName="flex min-h-dvh flex-col justify-center gap-5 text-center"
      maxWidth="sm"
    >
        <BrandMark className="justify-center" subtitle="перший запуск" />
        <PageHeader
          className="items-center text-center sm:items-center"
          description={message}
          title="Налаштування недоступне"
        />
        <ActionBar align="center">
          <Button asChild variant="outline">
            <Link href="/login">До сторінки входу</Link>
          </Button>
        </ActionBar>
    </PageShell>
  );
}
