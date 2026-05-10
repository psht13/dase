import { ArrowRight, CreditCard, Truck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/shared/ui/page-layout";

const settingsCards = [
  {
    description:
      "Картки, IBAN або інші реквізити, які покупці бачать для ручного переказу.",
    href: "/dashboard/settings/payment",
    icon: CreditCard,
    title: "Реквізити для оплати",
  },
  {
    description:
      "API доступ Nova Post, дані відправника, платник і типові параметри посилки.",
    href: "/dashboard/settings/shipping",
    icon: Truck,
    title: "Доставка",
  },
];

export default function SettingsPage() {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        description="Керуйте налаштуваннями, які впливають на оплату й доставку замовлень."
        title="Налаштування"
        titleClassName="sm:text-3xl"
      />

      <section className="grid min-w-0 gap-4 md:grid-cols-2">
        {settingsCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              className="group grid min-w-0 gap-4 rounded-md border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
              href={card.href}
              key={card.href}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold">
                  {card.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
