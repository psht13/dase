import { CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";

const starterItems = [
  "Каталог товарів",
  "Посилання для клієнта",
  "Доставка та оплата",
];

export default function Home() {
  return (
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="max-w-3xl space-y-6">
            <BrandMark subtitle="ювелірні замовлення" />
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Підтвердження замовлень для ювелірних продавців
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Основа застосунку готова для кабінету власника, публічних
              посилань замовлень, оплати та доставки.
            </p>
            <div>
              <Button>Перейти до налаштування</Button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="hidden justify-center lg:flex"
          >
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
              className="flex min-h-24 items-center gap-3 rounded-md border border-border/80 bg-card/95 px-4 py-3 text-card-foreground shadow-sm"
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
      </section>
    </main>
  );
}
