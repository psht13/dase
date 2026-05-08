import { listOwnerPaymentRequisitesUseCase } from "@/modules/payments/application/manage-payment-requisites";
import { getPaymentRequisiteRepository } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import {
  setPaymentRequisiteActiveAction,
  updatePaymentRequisiteAction,
} from "@/modules/payments/ui/payment-requisite-actions";
import { PaymentRequisitesSettings } from "@/modules/payments/ui/payment-requisites-settings";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { PageHeader } from "@/shared/ui/page-layout";

export default async function PaymentSettingsPage() {
  const owner = await requireOwnerSession();
  const requisites = await listOwnerPaymentRequisitesUseCase(
    {
      ownerId: owner.id,
    },
    {
      paymentRequisiteRepository: getPaymentRequisiteRepository(),
    },
  );

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        description="Керуйте картками, IBAN або реквізитами, які покупці бачать для ручного переказу."
        title="Реквізити для оплати"
        titleClassName="sm:text-3xl"
      />

      <PaymentRequisitesSettings
        requisites={requisites}
        setActiveAction={setPaymentRequisiteActiveAction}
        updateAction={updatePaymentRequisiteAction}
      />
    </div>
  );
}
