import { CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";

const starterItems = [
  "Каталог товарів",
  "Посилання для клієнта",
  "Доставка та оплата",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background" id="main-content">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-12">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Dase
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Підтвердження замовлень для ювелірних продавців
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Основа застосунку готова для кабінету власника, публічних посилань
            замовлень, оплати та доставки.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {starterItems.map((item) => (
            <div
              className="flex min-h-24 items-center gap-3 rounded-md border bg-card px-4 py-3 text-card-foreground"
              key={item}
            >
              <CheckCircle2
                aria-hidden="true"
                className="size-5 shrink-0 text-emerald-600"
              />
              <span className="text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>

        <div>
          <Button>Перейти до налаштування</Button>
        </div>
      </section>
    </main>
  );
}
