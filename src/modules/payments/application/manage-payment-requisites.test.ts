import {
  createPaymentRequisiteUseCase,
  listActivePaymentRequisitesForOwnerUseCase,
  listOwnerPaymentRequisitesUseCase,
  PaymentRequisiteNotFoundError,
  setPaymentRequisiteActiveUseCase,
  updatePaymentRequisiteUseCase,
} from "@/modules/payments/application/manage-payment-requisites";
import { InMemoryPaymentRequisiteRepository } from "@/modules/payments/infrastructure/in-memory-payment-requisite-repository";

describe("payment requisite use cases", () => {
  it("creates, lists, updates, and toggles owner requisites", async () => {
    const paymentRequisiteRepository = new InMemoryPaymentRequisiteRepository();
    const dependencies = { paymentRequisiteRepository };

    const saved = await createPaymentRequisiteUseCase(
      {
        bankName: "ПриватБанк",
        displayValue: "4441 1111 2222 3333",
        isActive: true,
        label: "Основна картка",
        note: "Оплата за замовлення",
        ownerId: "owner-1",
        recipientName: "Олена Петренко",
        sortOrder: 2,
      },
      dependencies,
    );

    await createPaymentRequisiteUseCase(
      {
        bankName: "Інший банк",
        displayValue: "UA123",
        isActive: false,
        label: "Запасні реквізити",
        note: null,
        ownerId: "owner-1",
        recipientName: null,
        sortOrder: 1,
      },
      dependencies,
    );

    await updatePaymentRequisiteUseCase(
      {
        bankName: "mono",
        displayValue: "4441 1111 2222 9999",
        isActive: true,
        label: "Оновлена картка",
        note: null,
        ownerId: "owner-1",
        recipientName: "Олена",
        requisiteId: saved.id,
        sortOrder: 0,
      },
      dependencies,
    );
    await setPaymentRequisiteActiveUseCase(
      {
        isActive: false,
        ownerId: "owner-1",
        requisiteId: saved.id,
      },
      dependencies,
    );

    await expect(
      listOwnerPaymentRequisitesUseCase({ ownerId: "owner-1" }, dependencies),
    ).resolves.toMatchObject([
      { label: "Оновлена картка", sortOrder: 0, isActive: false },
      { label: "Запасні реквізити", sortOrder: 1, isActive: false },
    ]);
    await expect(
      listActivePaymentRequisitesForOwnerUseCase(
        { ownerId: "owner-1" },
        dependencies,
      ),
    ).resolves.toEqual([]);
  });

  it("returns only active public requisites for the requested owner", async () => {
    const paymentRequisiteRepository = new InMemoryPaymentRequisiteRepository();
    const dependencies = { paymentRequisiteRepository };

    await createPaymentRequisiteUseCase(
      createRequisiteInput({
        displayValue: "4441 1111 2222 3333",
        isActive: true,
        label: "Активна",
        ownerId: "owner-1",
      }),
      dependencies,
    );
    await createPaymentRequisiteUseCase(
      createRequisiteInput({
        isActive: false,
        label: "Вимкнена",
        ownerId: "owner-1",
      }),
      dependencies,
    );
    await createPaymentRequisiteUseCase(
      createRequisiteInput({
        isActive: true,
        label: "Чужа картка",
        ownerId: "owner-2",
      }),
      dependencies,
    );

    await expect(
      listActivePaymentRequisitesForOwnerUseCase(
        { ownerId: "owner-1" },
        dependencies,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        displayValue: "4441 1111 2222 3333",
        label: "Активна",
      }),
    ]);
  });

  it("rejects updates outside the owner scope", async () => {
    const paymentRequisiteRepository = new InMemoryPaymentRequisiteRepository();
    const dependencies = { paymentRequisiteRepository };
    const saved = await createPaymentRequisiteUseCase(
      createRequisiteInput({ ownerId: "owner-1" }),
      dependencies,
    );

    await expect(
      updatePaymentRequisiteUseCase(
        {
          ...createRequisiteInput({ ownerId: "owner-2" }),
          requisiteId: saved.id,
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(PaymentRequisiteNotFoundError);
  });
});

function createRequisiteInput(
  overrides: Partial<Parameters<typeof createPaymentRequisiteUseCase>[0]> = {},
): Parameters<typeof createPaymentRequisiteUseCase>[0] {
  return {
    bankName: "ПриватБанк",
    displayValue: "UA123456789",
    isActive: true,
    label: "Основна картка",
    note: null,
    ownerId: "owner-1",
    recipientName: "Олена Петренко",
    sortOrder: 0,
    ...overrides,
  };
}
