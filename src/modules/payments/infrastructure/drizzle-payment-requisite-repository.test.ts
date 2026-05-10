import { DrizzlePaymentRequisiteRepository } from "@/modules/payments/infrastructure/drizzle-payment-requisite-repository";
import type * as schema from "@/shared/db/schema";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    orderBy: vi.fn(async () => result),
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

describe("DrizzlePaymentRequisiteRepository", () => {
  const now = new Date("2026-05-08T00:00:00.000Z");
  const requisite = {
    bankName: "ПриватБанк",
    createdAt: now,
    displayValue: "4441 1111 2222 3333",
    id: "requisite-1",
    isActive: true,
    label: "Основна картка",
    note: "Надішліть квитанцію",
    ownerId: "owner-1",
    recipientName: "Олена Петренко",
    sortOrder: 0,
    updatedAt: now,
  } satisfies typeof schema.paymentRequisites.$inferSelect;

  it("lists owner and public active requisites", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(createSelectChain([requisite]))
        .mockReturnValueOnce(createSelectChain([requisite])),
    };
    const repository = new DrizzlePaymentRequisiteRepository(db as never);

    await expect(repository.listByOwnerId("owner-1")).resolves.toMatchObject([
      {
        displayValue: "4441 1111 2222 3333",
        ownerId: "owner-1",
      },
    ]);
    await expect(repository.listActiveByOwnerId("owner-1")).resolves.toEqual([
      expect.not.objectContaining({ ownerId: "owner-1" }),
    ]);
  });

  it("saves and updates owner-scoped requisites", async () => {
    const insert = {
      values: vi.fn(() => ({
        returning: vi.fn(async () => [requisite]),
      })),
    };
    const update = createUpdateChain([requisite]);
    const db = {
      insert: vi.fn(() => insert),
      update: vi.fn(() => update),
    };
    const repository = new DrizzlePaymentRequisiteRepository(db as never);

    await repository.save({
      bankName: "ПриватБанк",
      displayValue: "4441 1111 2222 3333",
      isActive: true,
      label: "Основна картка",
      note: null,
      ownerId: "owner-1",
      recipientName: "Олена",
      sortOrder: 0,
    });
    await repository.update({
      bankName: "mono",
      displayValue: "4441 1111 2222 9999",
      isActive: false,
      label: "Оновлена картка",
      note: null,
      ownerId: "owner-1",
      recipientName: null,
      requisiteId: "requisite-1",
      sortOrder: 2,
    });

    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        displayValue: "4441 1111 2222 3333",
        ownerId: "owner-1",
      }),
    );
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        displayValue: "4441 1111 2222 9999",
        isActive: false,
        sortOrder: 2,
      }),
    );
  });

  it("toggles active state", async () => {
    const update = createUpdateChain([requisite]);
    const db = {
      update: vi.fn(() => update),
    };
    const repository = new DrizzlePaymentRequisiteRepository(db as never);

    await repository.setActive({
      isActive: false,
      ownerId: "owner-1",
      requisiteId: "requisite-1",
    });

    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
      }),
    );
  });
});
