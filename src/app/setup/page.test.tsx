import { render, screen } from "@testing-library/react";
import SetupPage from "./page";
import { getUserRepository } from "@/modules/users/infrastructure/user-repository-factory";
import { getWebEnv } from "@/shared/config/env";

vi.mock("@/shared/config/env", () => ({
  getWebEnv: vi.fn(),
}));

vi.mock("@/modules/users/infrastructure/user-repository-factory", () => ({
  getUserRepository: vi.fn(),
}));

vi.mock("@/modules/users/ui/owner-setup-form", () => ({
  OwnerSetupForm: ({
    requiresSetupToken,
  }: {
    requiresSetupToken: boolean;
  }) => (
    <form
      aria-label="Форма створення власника"
      data-requires-token={String(requiresSetupToken)}
    />
  ),
}));

describe("SetupPage", () => {
  beforeEach(() => {
    vi.mocked(getWebEnv).mockReturnValue({
      AUTO_COMPLETE_AFTER_DELIVERED_HOURS: 24,
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "https://dase.example.com",
      DATABASE_URL: "postgres://user:pass@example.com:5432/dase",
      NODE_ENV: "production",
      OWNER_SETUP_TOKEN: "b".repeat(32),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the first owner setup form when no owner exists", async () => {
    vi.mocked(getUserRepository).mockReturnValue(
      createUserRepository({ ownerCount: 0 }) as never,
    );

    render(await SetupPage());

    expect(
      screen.getByRole("heading", { name: "Створення першого власника" }),
    ).toBeVisible();
    expect(
      screen.getByRole("form", { name: "Форма створення власника" }),
    ).toHaveAttribute("data-requires-token", "true");
    expect(getWebEnv).toHaveBeenCalledWith({ requireOwnerSetupToken: true });
  });

  it("shows a Ukrainian unavailable message after an owner exists", async () => {
    vi.mocked(getUserRepository).mockReturnValue(
      createUserRepository({ ownerCount: 1 }) as never,
    );

    render(await SetupPage());

    expect(
      screen.getByRole("heading", { name: "Налаштування недоступне" }),
    ).toBeVisible();
    expect(screen.getByText(/Перший власник уже створений/i)).toBeVisible();
  });

  it("does not accept the setup token from the URL before rendering the form", async () => {
    vi.mocked(getUserRepository).mockReturnValue(
      createUserRepository({ ownerCount: 0 }) as never,
    );

    render(await SetupPage());

    expect(
      screen.getByRole("heading", { name: "Створення першого власника" }),
    ).toBeVisible();
    expect(
      screen.getByRole("form", { name: "Форма створення власника" }),
    ).not.toHaveAttribute("data-token");
  });

  it("does not require the setup token field outside production", async () => {
    vi.mocked(getWebEnv).mockReturnValue({
      AUTO_COMPLETE_AFTER_DELIVERED_HOURS: 24,
      NODE_ENV: "development",
    } as never);
    vi.mocked(getUserRepository).mockReturnValue(
      createUserRepository({ ownerCount: 0 }) as never,
    );

    render(await SetupPage());

    expect(
      screen.getByRole("form", { name: "Форма створення власника" }),
    ).toHaveAttribute("data-requires-token", "false");
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
