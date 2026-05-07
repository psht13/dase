import {
  E2eAuthMemoryUserRepository,
  getE2eAuthMemoryDb,
  isE2eAuthMemoryEnabled,
  resetE2eAuthMemoryDb,
} from "@/modules/users/infrastructure/e2e-auth-memory-store";

const now = new Date("2026-05-07T10:00:00.000Z");

describe("e2e auth memory store", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetE2eAuthMemoryDb();
  });

  it("is enabled only for non-production Playwright runs", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PLAYWRIGHT_E2E", "1");

    expect(isE2eAuthMemoryEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");

    expect(isE2eAuthMemoryEnabled()).toBe(false);
  });

  it("counts, reads, and promotes users stored by the Better Auth memory adapter", async () => {
    const db = getE2eAuthMemoryDb();
    db.users.push({
      createdAt: now,
      email: "owner@example.com",
      emailVerified: false,
      id: "user-1",
      image: null,
      name: "Олена",
      role: "user",
      updatedAt: now,
    });
    const repository = new E2eAuthMemoryUserRepository(db);

    await expect(repository.countByRole("owner")).resolves.toBe(0);
    await expect(repository.countByRole("user")).resolves.toBe(1);
    await expect(repository.findByEmail("OWNER@example.com")).resolves.toMatchObject({
      email: "owner@example.com",
      role: "user",
    });

    await expect(repository.updateRole("user-1", "owner")).resolves.toMatchObject({
      email: "owner@example.com",
      role: "owner",
    });
    await expect(repository.findById("user-1")).resolves.toMatchObject({
      role: "owner",
    });
    await expect(repository.findByEmail("missing@example.com")).resolves.toBeNull();
    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("resets all auth tables", () => {
    const db = getE2eAuthMemoryDb();
    db.users.push({ id: "user-1" });
    db.sessions.push({ id: "session-1" });
    db.accounts.push({ id: "account-1" });
    db.verifications.push({ id: "verification-1" });

    resetE2eAuthMemoryDb();

    expect(db).toEqual({
      accounts: [],
      sessions: [],
      users: [],
      verifications: [],
    });
  });

  it("rejects missing users and unsupported roles", async () => {
    const db = getE2eAuthMemoryDb();
    const repository = new E2eAuthMemoryUserRepository(db);

    await expect(repository.updateRole("missing", "owner")).rejects.toThrow(
      "User not found",
    );

    db.users.push({
      email: "legacy@example.com",
      id: "legacy-1",
      role: "legacy",
    });

    await expect(repository.findById("legacy-1")).rejects.toThrow(
      "Unsupported user role",
    );
  });

  it("normalizes optional Better Auth user fields", async () => {
    const db = getE2eAuthMemoryDb();
    db.users.push({
      email: "plain@example.com",
      id: "plain-1",
      image: "https://example.com/avatar.jpg",
    });
    const repository = new E2eAuthMemoryUserRepository(db);

    await expect(repository.findById("plain-1")).resolves.toMatchObject({
      email: "plain@example.com",
      image: "https://example.com/avatar.jpg",
      name: null,
      role: "user",
    });
  });
});
