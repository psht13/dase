import { DrizzleUserRepository } from "./drizzle-user-repository";
import type * as schema from "@/shared/db/schema";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    where: vi.fn(() => chain),
  };

  return chain;
}

function createUpdateChain<T>(result: T) {
  const chain = {
    returning: vi.fn(async () => result),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
  };

  return chain;
}

function createWhereResultChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(async () => result),
  };

  return chain;
}

describe("DrizzleUserRepository", () => {
  const now = new Date("2026-04-30T00:00:00.000Z");
  const user = {
    createdAt: now,
    email: "owner@example.com",
    emailVerified: true,
    id: "owner-1",
    image: null,
    name: "Власниця",
    role: "owner",
    updatedAt: now,
  } satisfies typeof schema.users.$inferSelect;

  it("finds users by email", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(createSelectChain([user])),
    };
    const repository = new DrizzleUserRepository(db as never);

    await expect(repository.findByEmail("owner@example.com")).resolves.toEqual(
      user,
    );
  });

  it("counts users by role", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(createWhereResultChain([{ value: 1 }])),
    };
    const repository = new DrizzleUserRepository(db as never);

    await expect(repository.countByRole("owner")).resolves.toBe(1);
  });

  it("updates user role", async () => {
    const updatedUser = {
      ...user,
      role: "owner" as const,
    };
    const db = {
      update: vi.fn().mockReturnValueOnce(createUpdateChain([updatedUser])),
    };
    const repository = new DrizzleUserRepository(db as never);

    await expect(repository.updateRole("owner-1", "owner")).resolves.toEqual(
      updatedUser,
    );
  });

  it("returns null when user is missing", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(createSelectChain([])),
    };
    const repository = new DrizzleUserRepository(db as never);

    await expect(repository.findById("missing")).resolves.toBeNull();
  });
});
