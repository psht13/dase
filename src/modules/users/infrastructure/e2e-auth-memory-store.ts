import { defaultUserRole, isAppRole } from "@/modules/users/domain/roles";
import type {
  UserRecord,
  UserRepository,
} from "@/modules/users/application/user-repository";

type AuthMemoryRecord = Record<string, unknown>;

export type E2eAuthMemoryDb = {
  accounts: AuthMemoryRecord[];
  sessions: AuthMemoryRecord[];
  users: AuthMemoryRecord[];
  verifications: AuthMemoryRecord[];
};

const globalDbKey = "__daseE2eAuthMemoryDb";

type GlobalWithE2eAuthMemory = typeof globalThis & {
  [globalDbKey]?: E2eAuthMemoryDb;
};

export function isE2eAuthMemoryEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1";
}

export function getE2eAuthMemoryDb(): E2eAuthMemoryDb {
  const globalStore = globalThis as GlobalWithE2eAuthMemory;
  globalStore[globalDbKey] ??= createEmptyDb();

  return globalStore[globalDbKey];
}

export function resetE2eAuthMemoryDb(): void {
  const db = getE2eAuthMemoryDb();

  db.accounts.length = 0;
  db.sessions.length = 0;
  db.users.length = 0;
  db.verifications.length = 0;
}

export class E2eAuthMemoryUserRepository implements UserRepository {
  constructor(private readonly db: E2eAuthMemoryDb = getE2eAuthMemoryDb()) {}

  async countByRole(role: UserRecord["role"]): Promise<number> {
    return this.db.users.filter((user) => user.role === role).length;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = this.db.users.find(
      (record) => String(record.email).toLowerCase() === email.toLowerCase(),
    );

    return user ? toUserRecord(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = this.db.users.find((record) => record.id === id);

    return user ? toUserRecord(user) : null;
  }

  async updateRole(userId: string, role: UserRecord["role"]): Promise<UserRecord> {
    const user = this.db.users.find((record) => record.id === userId);

    if (!user) {
      throw new Error("User not found");
    }

    user.role = role;
    user.updatedAt = new Date();

    return toUserRecord(user);
  }
}

function createEmptyDb(): E2eAuthMemoryDb {
  return {
    accounts: [],
    sessions: [],
    users: [],
    verifications: [],
  };
}

function toUserRecord(record: AuthMemoryRecord): UserRecord {
  const role = String(record.role ?? defaultUserRole);

  if (!isAppRole(role)) {
    throw new Error("Unsupported user role in e2e auth memory store");
  }

  return {
    createdAt: toDate(record.createdAt),
    email: String(record.email),
    emailVerified: Boolean(record.emailVerified),
    id: String(record.id),
    image: typeof record.image === "string" ? record.image : null,
    name: typeof record.name === "string" ? record.name : null,
    role,
    updatedAt: toDate(record.updatedAt),
  };
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date();
}
