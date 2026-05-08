import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getOwnerSetupStateUseCase } from "@/modules/users/application/owner-setup";
import { getUserRepository } from "@/modules/users/infrastructure/user-repository-factory";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";
import { ActionBar, PageHeader, PageShell } from "@/shared/ui/page-layout";

const starterItems = [
  "Каталог товарів",
  "Посилання для клієнта",
  "Доставка та оплата",
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const setupState = await getOwnerSetupStateUseCase({
    userRepository: getUserRepository(),
  });
  const cta = setupState.available
    ? {
        href: "/setup",
        label: "Перейти до налаштування",
      }
    : {
        href: "/login",
        label: "Увійти до кабінету",
      };

  return (
    <PageShell
      contentClassName="flex min-h-dvh flex-col justify-center gap-6 py-8 sm:py-10 lg:gap-8 lg:py-12"
      maxWidth="2xl"
    >
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="grid max-w-3xl gap-5">
            <BrandMark subtitle="ювелірні замовлення" />
            <PageHeader
              description="Основа застосунку готова для кабінету власника, публічних посилань замовлень, оплати та доставки."
              title="Підтвердження замовлень для ювелірних продавців"
              titleClassName="text-3xl sm:text-5xl"
            />
            <ActionBar align="start">
              <Button asChild>
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            </ActionBar>
          </div>

          <div aria-hidden="true" className="hidden justify-center lg:flex">
            <div className="grid size-72 place-items-center rounded-full bg-[hsl(var(--brand-blush))] text-center font-display text-7xl font-semibold leading-[0.85] text-foreground shadow-[0_24px_70px_hsl(var(--brand-blush-deep))] ring-1 ring-border">
              <span>
                DA
                <br />
                SE
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {starterItems.map((item) => (
            <div
              className="flex min-h-20 min-w-0 items-center gap-3 rounded-md border border-border/80 bg-card/95 px-4 py-3 text-card-foreground shadow-sm sm:min-h-24"
              key={item}
            >
              <CheckCircle2
                aria-hidden="true"
                className="size-5 shrink-0 text-[hsl(var(--brand-gold))]"
              />
              <span className="text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
    </PageShell>
  );
}
