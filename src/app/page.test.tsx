import { render, screen } from "@testing-library/react";
import Home from "./page";
import { getUserRepository } from "@/modules/users/infrastructure/user-repository-factory";

vi.mock("@/modules/users/infrastructure/user-repository-factory", () => ({
  getUserRepository: vi.fn(),
}));

describe("Home page", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a Ukrainian setup link when no owner exists", async () => {
    vi.mocked(getUserRepository).mockReturnValue(
      createUserRepository({ ownerCount: 0 }) as never,
    );

    render(await Home());

    expect(
      screen.getByRole("heading", {
        name: "Підтвердження замовлень для ювелірних продавців",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Каталог товарів")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Перейти до налаштування" }),
    ).toHaveAttribute("href", "/setup");
  });

  it("renders a Ukrainian login link after an owner exists", async () => {
    vi.mocked(getUserRepository).mockReturnValue(
      createUserRepository({ ownerCount: 1 }) as never,
    );

    render(await Home());

    expect(
      screen.getByRole("link", { name: "Увійти до кабінету" }),
    ).toHaveAttribute("href", "/login");
  });
});

function createUserRepository(input: { ownerCount: number }) {
  return {
    countByRole: vi.fn(async () => input.ownerCount),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    updateRole: vi.fn(),
  };
}
