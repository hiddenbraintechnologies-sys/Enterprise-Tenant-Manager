export type CreateOrderInput = {
  tenantId: string;
  subscriptionId: string;
  paymentId: string;
  amountPaise: number;
  currency: "INR";
  receipt?: string;
  notes?: Record<string, string>;
};

export type CreateOrderResult = {
  provider: "MOCK" | "RAZORPAY";
  providerOrderId: string;
  amountPaise: number;
  currency: "INR";
  checkoutPayload: Record<string, any>;
};

export type VerifyPaymentInput = {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature?: string;
  paymentId: string;
  tenantId: string;
};

export type VerifyPaymentResult = {
  verified: boolean;
  reason?: string;
};

export interface PaymentProvider {
  name: "MOCK" | "RAZORPAY";
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
