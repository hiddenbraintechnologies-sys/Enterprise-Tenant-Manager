import type {
  PaymentGateway,
  PaymentGatewayType,
  GatewayConfig,
  CreatePaymentParams,
  PaymentIntent,
  PaymentStatus,
  RefundParams,
  RefundResult,
  NormalizedWebhookEvent,
} from "../types";

export abstract class BasePaymentAdapter implements PaymentGateway {
  abstract name: PaymentGatewayType;
  protected config: GatewayConfig | null = null;
  protected initialized = false;

  async initialize(config: GatewayConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    await this.onInitialize();
  }

  protected async onInitialize(): Promise<void> {}

  isConfigured(): boolean {
    return this.initialized && this.config !== null;
  }

  abstract createPayment(params: CreatePaymentParams): Promise<PaymentIntent>;
  abstract getPaymentStatus(gatewayPaymentId: string): Promise<PaymentStatus>;
  abstract refund(params: RefundParams): Promise<RefundResult>;
  abstract verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<boolean>;
  abstract normalizeWebhookEvent(payload: Record<string, unknown>): NormalizedWebhookEvent;

  protected ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error(`${this.name} payment gateway not initialized`);
    }
  }

  protected generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
