import type {
  PaymentRequisiteRecord,
  PaymentRequisiteRepository,
  PublicPaymentRequisite,
} from "@/modules/payments/application/payment-requisite-repository";
import type { PaymentRequisiteInput } from "@/modules/payments/application/payment-requisite-validation";

type PaymentRequisiteDependencies = {
  paymentRequisiteRepository: PaymentRequisiteRepository;
};

export class PaymentRequisiteNotFoundError extends Error {
  constructor() {
    super("Payment requisite was not found");
    this.name = "PaymentRequisiteNotFoundError";
  }
}

export async function listOwnerPaymentRequisitesUseCase(
  input: {
    ownerId: string;
  },
  dependencies: PaymentRequisiteDependencies,
): Promise<PaymentRequisiteRecord[]> {
  return dependencies.paymentRequisiteRepository.listByOwnerId(input.ownerId);
}

export async function listActivePaymentRequisitesForOwnerUseCase(
  input: {
    ownerId: string;
  },
  dependencies: PaymentRequisiteDependencies,
): Promise<PublicPaymentRequisite[]> {
  return dependencies.paymentRequisiteRepository.listActiveByOwnerId(
    input.ownerId,
  );
}

export async function createPaymentRequisiteUseCase(
  input: PaymentRequisiteInput & {
    ownerId: string;
  },
  dependencies: PaymentRequisiteDependencies,
): Promise<PaymentRequisiteRecord> {
  return dependencies.paymentRequisiteRepository.save(input);
}

export async function updatePaymentRequisiteUseCase(
  input: PaymentRequisiteInput & {
    ownerId: string;
    requisiteId: string;
  },
  dependencies: PaymentRequisiteDependencies,
): Promise<PaymentRequisiteRecord> {
  const requisite = await dependencies.paymentRequisiteRepository.update(input);

  if (!requisite) {
    throw new PaymentRequisiteNotFoundError();
  }

  return requisite;
}

export async function setPaymentRequisiteActiveUseCase(
  input: {
    isActive: boolean;
    ownerId: string;
    requisiteId: string;
  },
  dependencies: PaymentRequisiteDependencies,
): Promise<PaymentRequisiteRecord> {
  const requisite = await dependencies.paymentRequisiteRepository.setActive(
    input,
  );

  if (!requisite) {
    throw new PaymentRequisiteNotFoundError();
  }

  return requisite;
}
