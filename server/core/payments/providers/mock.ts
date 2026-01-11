import { v4 as uuidv4 } from "uuid";
import {
  PaymentProvider,
  CreateOrderInput,
  CreateOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "../payment-provider";

export class MockPaymentProvider implements PaymentProvider {
  name: "MOCK" = "MOCK";

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const providerOrderId = `mock_order_${uuidv4()}`;

    return {
      provider: "MOCK",
      providerOrderId,
      amountPaise: input.amountPaise,
      currency: input.currency,
      checkoutPayload: {
        orderId: providerOrderId,
        amountPaise: input.amountPaise,
        currency: input.currency,
        mode: "MOCK",
        paymentId: input.paymentId,
        subscriptionId: input.subscriptionId,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (input.providerPaymentId.startsWith("mock_pay_success")) {
      return {
        verified: true,
      };
    }

    if (input.providerPaymentId.startsWith("mock_pay_fail")) {
      return {
        verified: false,
        reason: "Mock payment simulation: failure requested",
      };
    }

    return {
      verified: false,
      reason: `Invalid mock payment ID format: ${input.providerPaymentId}`,
    };
  }
}
