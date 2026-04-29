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

  it("returns null when user is missing", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(createSelectChain([])),
    };
    const repository = new DrizzleUserRepository(db as never);

    await expect(repository.findById("missing")).resolves.toBeNull();
  });
});
