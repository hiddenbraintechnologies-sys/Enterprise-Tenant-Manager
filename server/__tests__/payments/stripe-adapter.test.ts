import { StripeAdapter, loadStripeModule } from "../../core/payments/adapters/stripe-adapter";

describe("Stripe Adapter", () => {
  describe("loadStripeModule", () => {
    it("should throw a clear error message when stripe package is missing", async () => {
      await expect(loadStripeModule()).rejects.toThrow(
        "Stripe adapter unavailable: install 'stripe' dependency"
      );
    });
  });

  describe("StripeAdapter initialization", () => {
    it("should not throw during construction", () => {
      expect(() => new StripeAdapter()).not.toThrow();
    });

    it("should warn when API key is not configured", async () => {
      const adapter = new StripeAdapter();
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      
      await adapter.initialize({ apiKey: "" });
      
      expect(warnSpy).toHaveBeenCalledWith(
        "Stripe API key not configured - gateway will be unavailable"
      );
      expect(adapter.isConfigured()).toBe(false);
      
      warnSpy.mockRestore();
    });

    it("should report isConfigured false when stripe fails to load", async () => {
      const adapter = new StripeAdapter();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();
      
      await adapter.initialize({ apiKey: "test_key" });
      
      expect(adapter.isConfigured()).toBe(false);
      
      errorSpy.mockRestore();
    });
  });

  describe("StripeAdapter methods without initialization", () => {
    it("should throw when createPayment is called without initialization", async () => {
      const adapter = new StripeAdapter();
      
      await expect(
        adapter.createPayment({
          tenantId: "test",
          amount: 100,
          currency: "USD",
        })
      ).rejects.toThrow();
    });

    it("should throw when getPaymentStatus is called without initialization", async () => {
      const adapter = new StripeAdapter();
      
      await expect(
        adapter.getPaymentStatus("pi_test")
      ).rejects.toThrow();
    });

    it("should throw when refund is called without initialization", async () => {
      const adapter = new StripeAdapter();
      
      await expect(
        adapter.refund({ paymentId: "pi_test" })
      ).rejects.toThrow();
    });
  });

  describe("StripeAdapter graceful failure on missing dependency", () => {
    it("should store load error and throw on method calls", async () => {
      const adapter = new StripeAdapter();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();
      
      await adapter.initialize({ apiKey: "sk_test_fake" });
      
      expect(adapter.isConfigured()).toBe(false);
      
      await expect(
        adapter.createPayment({
          tenantId: "test",
          amount: 100,
          currency: "USD",
        })
      ).rejects.toThrow("Stripe adapter unavailable: install 'stripe' dependency");
      
      errorSpy.mockRestore();
    });

    it("should provide clear error message for missing stripe dependency", async () => {
      const adapter = new StripeAdapter();
      const errorSpy = jest.spyOn(console, "error").mockImplementation();
      
      await adapter.initialize({ apiKey: "sk_test_key" });
      
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to initialize Stripe:",
        "Stripe adapter unavailable: install 'stripe' dependency"
      );
      
      errorSpy.mockRestore();
    });
  });
});
