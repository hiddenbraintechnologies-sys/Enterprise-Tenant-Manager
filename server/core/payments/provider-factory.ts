import { PaymentProvider } from "./payment-provider";
import { MockPaymentProvider } from "./providers/mock";

let cachedProvider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = process.env.PAYMENT_PROVIDER || "MOCK";

  switch (providerType.toUpperCase()) {
    case "RAZORPAY":
      // TODO: Implement RazorpayPaymentProvider when ready for production
      // import { RazorpayPaymentProvider } from "./providers/razorpay";
      // cachedProvider = new RazorpayPaymentProvider();
      console.warn("[payments] Razorpay not yet implemented, falling back to MOCK");
      cachedProvider = new MockPaymentProvider();
      break;
    case "MOCK":
    default:
      cachedProvider = new MockPaymentProvider();
      break;
  }

  console.log(`[payments] Using ${cachedProvider.name} payment provider`);
  return cachedProvider;
}

export function resetPaymentProvider(): void {
  cachedProvider = null;
}
