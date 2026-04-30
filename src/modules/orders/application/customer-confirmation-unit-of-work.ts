import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { CustomerRepository } from "@/modules/orders/application/customer-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";

export type CustomerConfirmationRepositories = {
  auditEventRepository: AuditEventRepository;
  customerRepository: CustomerRepository;
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  shipmentRepository: ShipmentRepository;
};

export interface CustomerConfirmationUnitOfWork {
  run<T>(
    work: (repositories: CustomerConfirmationRepositories) => Promise<T>,
  ): Promise<T>;
}
