import { InMemoryPaymentRequisiteRepository } from "@/modules/payments/infrastructure/in-memory-payment-requisite-repository";

describe("InMemoryPaymentRequisiteRepository", () => {
  it("saves, lists, updates, toggles, and filters active requisites", async () => {
    const repository = new InMemoryPaymentRequisiteRepository();
    const saved = await repository.save({
      bankName: "ПриватБанк",
      displayValue: "4441 1111 2222 3333",
      isActive: true,
      label: "Основна картка",
      note: null,
      ownerId: "owner-1",
      recipientName: "Олена",
      sortOrder: 1,
    });

    await repository.save({
      bankName: null,
      displayValue: "UA123",
      isActive: false,
      label: "Вимкнені реквізити",
      note: null,
      ownerId: "owner-1",
      recipientName: null,
      sortOrder: 0,
    });
    await repository.update({
      bankName: "mono",
      displayValue: "4441 1111 2222 9999",
      isActive: true,
      label: "Оновлена картка",
      note: "Надішліть квитанцію",
      ownerId: "owner-1",
      recipientName: "Олена Петренко",
      requisiteId: saved.id,
      sortOrder: 0,
    });

    await expect(repository.listByOwnerId("owner-1")).resolves.toMatchObject([
      { label: "Оновлена картка", sortOrder: 0 },
      { label: "Вимкнені реквізити", sortOrder: 0 },
    ]);

    await expect(repository.listActiveByOwnerId("owner-1")).resolves.toEqual([
      expect.objectContaining({
        displayValue: "4441 1111 2222 9999",
        label: "Оновлена картка",
      }),
    ]);

    await repository.setActive({
      isActive: false,
      ownerId: "owner-1",
      requisiteId: saved.id,
    });

    await expect(repository.listActiveByOwnerId("owner-1")).resolves.toEqual([]);
  });
});
