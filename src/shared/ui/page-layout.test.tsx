import { render, screen } from "@testing-library/react";
import { ActionBar, FormActions } from "@/shared/ui/page-layout";

describe("page layout action primitives", () => {
  it("stacks action buttons on mobile and reserves desktop button width", () => {
    render(
      <ActionBar>
        <a href="/setup">Перейти до налаштування</a>
        <button type="button">Увійти</button>
      </ActionBar>,
    );

    const actionBar = screen.getByRole("link", {
      name: "Перейти до налаштування",
    }).parentElement;

    expect(actionBar).toHaveClass("flex-col");
    expect(actionBar).toHaveClass("sm:flex-row");
    expect(actionBar).toHaveClass("sm:justify-end");
    expect(actionBar?.className).toContain("[&>a]:w-full");
    expect(actionBar?.className).toContain("sm:[&>button]:min-w-36");
  });

  it("renders form actions with primary action first on mobile and secondary actions before it on desktop", () => {
    const { container } = render(
      <FormActions
        destructiveActions={<button type="button">Видалити</button>}
        primaryAction={<button type="submit">Зберегти</button>}
        secondaryActions={<a href="/dashboard">Скасувати</a>}
      />,
    );

    const footer = container.querySelector("footer");
    const actionBar = footer?.firstElementChild;

    expect(footer).toHaveClass("border-t");
    expect(actionBar).toHaveClass("flex-col-reverse");
    expect(actionBar).toHaveClass("sm:flex-row");
    expect(actionBar).toHaveClass("sm:justify-end");
    expect(screen.getByRole("button", { name: "Зберегти" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Скасувати" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Видалити" })).toBeVisible();
  });
});
