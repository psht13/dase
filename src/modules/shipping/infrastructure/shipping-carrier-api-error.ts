export class ShippingCarrierApiError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ShippingCarrierApiError";
  }
}
