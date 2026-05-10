import {
  getOwnerShippingSettingsForPage,
  testOwnerNovaPostConnectionAction,
  updateOwnerShippingSettingsAction,
} from "@/modules/shipping/ui/owner-shipping-settings-actions";
import { OwnerShippingSettingsForm } from "@/modules/shipping/ui/owner-shipping-settings-form";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { PageHeader } from "@/shared/ui/page-layout";

export default async function ShippingSettingsPage() {
  const owner = await requireOwnerSession();
  const settings = await getOwnerShippingSettingsForPage(owner.id);

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        description="Збережіть API доступ Nova Post, дані відправника, платника та типові параметри посилки."
        title="Доставка"
        titleClassName="sm:text-3xl"
      />

      <OwnerShippingSettingsForm
        settings={settings}
        testConnectionAction={testOwnerNovaPostConnectionAction}
        updateAction={updateOwnerShippingSettingsAction}
      />
    </div>
  );
}
