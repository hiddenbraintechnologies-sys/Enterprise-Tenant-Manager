import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, CreditCard, Shield, Loader2, CheckCircle, XCircle,
  AlertTriangle, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BILLING_STRINGS, t as tStr, getTierLabel, getPlanName } from "@shared/billing/i18n";
import type { Lang } from "@shared/billing/i18n";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PendingPayment {
  payment: {
    id: string;
    amount: string;
    currency: string;
    status: string;
    providerOrderId: string | null;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    tier: string;
    description: string | null;
  } | null;
}

interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
  plan: {
    name: string;
    tier: string;
  } | null;
}

interface CheckoutSession {
  success: boolean;
  provider: string;
  paymentId: string;
  checkoutPayload: {
    orderId: string;
    amountPaise: number;
    currency: string;
    mode: string;
    paymentId: string;
    subscriptionId: string;
  };
  plan: {
    name: string;
    code: string;
    tier: string;
  };
}

function formatPrice(price: string | number, currency: string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (currency === "INR") return `₹${num.toFixed(2)}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mockUpiRef, setMockUpiRef] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const tenantId = localStorage.getItem("tenantId");
  const { t: tBilling, i18n } = useTranslation();
  const lang = (i18n.language || "en") as Lang;
  const t = (key: string): string => tBilling(`billing.${key}`, { defaultValue: key });

  useEffect(() => {
    loadRazorpayScript().then(setRazorpayLoaded);
  }, []);

  const accessToken = localStorage.getItem("accessToken");

  const { data: pendingData, isLoading: isPendingLoading } = useQuery<PendingPayment>({
    queryKey: ["/api/billing/pending-payment"],
  });

  const createRazorpayOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/razorpay/order", {});
      return response.json() as Promise<RazorpayOrderResponse>;
    },
  });

  const verifyRazorpayMutation = useMutation({
    mutationFn: async (params: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const response = await apiRequest("POST", "/api/billing/razorpay/verify", params);
      return response.json();
    },
    onSuccess: (data) => {
      setPaymentStatus("success");
      localStorage.setItem("subscriptionStatus", "active");
      localStorage.setItem("subscriptionJustActivated", "true");
      localStorage.removeItem("pendingPaymentId");
      localStorage.removeItem("pendingPlanCode");
      // Invalidate subscription query so fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      toast({ title: t("paymentSuccess"), description: t("subscriptionNowActive") });
      const redirectUrl = data.redirectUrl || "/dashboard/service";
      setTimeout(() => {
        setLocation(redirectUrl);
      }, 2000);
    },
    onError: (error: Error) => {
      setPaymentStatus("failed");
      toast({ title: t("paymentVerificationFailed"), description: error.message, variant: "destructive" });
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/checkout/create", {});
      return response.json() as Promise<CheckoutSession>;
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (params: { paymentId: string; providerPaymentId: string }) => {
      const response = await apiRequest("POST", "/api/billing/checkout/verify", {
        paymentId: params.paymentId,
        providerPaymentId: params.providerPaymentId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPaymentStatus("success");
      localStorage.setItem("subscriptionStatus", "active");
      localStorage.setItem("subscriptionJustActivated", "true");
      localStorage.removeItem("pendingPaymentId");
      localStorage.removeItem("pendingPlanCode");
      // Invalidate subscription query so fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      toast({ title: t("paymentSuccess"), description: t("subscriptionNowActive") });
      const redirectUrl = data.redirectUrl || "/dashboard/service";
      setTimeout(() => {
        setLocation(redirectUrl);
      }, 2000);
    },
    onError: (error: Error) => {
      setPaymentStatus("failed");
      toast({ title: t("paymentFailed"), description: error.message, variant: "destructive" });
    },
  });

  const handleRazorpayPayment = useCallback(async () => {
    if (!razorpayLoaded) {
      toast({ title: t("loadingPayment"), description: t("pleaseWait"), variant: "default" });
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast({ title: t("error"), description: t("failedToLoadPaymentGateway"), variant: "destructive" });
        return;
      }
    }

    setPaymentStatus("processing");

    try {
      const orderData = await createRazorpayOrderMutation.mutateAsync();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "MyBizStream",
        description: `${orderData.plan?.name || t("plan")} ${t("planSubscription")}`,
        order_id: orderData.orderId,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          verifyRazorpayMutation.mutate({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: localStorage.getItem("userName") || "",
          email: localStorage.getItem("userEmail") || "",
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          ondismiss: function () {
            setPaymentStatus("idle");
            toast({ title: t("paymentCancelled"), description: t("paymentCancelledDesc"), variant: "default" });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        setPaymentStatus("failed");
        toast({ title: t("paymentFailed"), description: response.error?.description || t("pleaseRetry"), variant: "destructive" });
      });
      razorpay.open();
    } catch (error: any) {
      setPaymentStatus("failed");
      toast({ title: t("error"), description: error.message || t("failedToInitiatePayment"), variant: "destructive" });
    }
  }, [razorpayLoaded, createRazorpayOrderMutation, verifyRazorpayMutation, toast, t]);

  useEffect(() => {
    if (pendingData?.payment && !createCheckoutMutation.data) {
      createCheckoutMutation.mutate();
    }
  }, [pendingData?.payment]);

  const handleMockPayment = (success: boolean) => {
    if (!pendingData?.payment?.id) return;
    setPaymentStatus("processing");
    const mockId = `mock_pay_${success ? "success" : "fail"}_${Date.now()}`;
    verifyPaymentMutation.mutate({
      paymentId: pendingData.payment.id,
      providerPaymentId: mockId,
    });
  };

  const payment = pendingData?.payment;
  const plan = pendingData?.plan;
  const checkout = createCheckoutMutation.data;
  const isRazorpayMode = checkout?.provider !== "mock";

  if (isPendingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">MyBizStream</h1>
            <div className="flex items-center gap-3">
              <LanguageSelector tenantId={tenantId || undefined} />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-lg">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (payment?.status === "cancelled") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">MyBizStream</h1>
            <div className="flex items-center gap-3">
              <LanguageSelector tenantId={tenantId || undefined} />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle data-testid="text-payment-cancelled">
                {t("paymentWasCancelled")}
              </CardTitle>
              <CardDescription>
                {t("paymentCancelledReturnToPlans")}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full" asChild data-testid="button-back-to-plans">
                <Link href="/packages">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("backToPlans")}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  if (!payment || !plan) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">MyBizStream</h1>
            <div className="flex items-center gap-3">
              <LanguageSelector tenantId={tenantId || undefined} />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>
                {t("noPendingPayment")}
              </CardTitle>
              <CardDescription>
                {t("noPendingPaymentDesc")}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full" asChild data-testid="button-back-packages">
                <Link href="/packages">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("choosePlan")}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back-packages">
              <Link href="/packages">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">
              {t("checkout")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector tenantId={tenantId || undefined} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-lg">
        {paymentStatus === "success" && (
          <Card className="mb-6 border-green-500">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2" data-testid="text-payment-success">
                {t("paymentSuccessful")}
              </h2>
              <p className="text-muted-foreground">
                {t("redirectingToDashboard")}
              </p>
            </CardContent>
          </Card>
        )}

        {paymentStatus === "failed" && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {t("paymentFailedRetry")}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-checkout-title">
              {t("completeYourPurchase")}
            </CardTitle>
            <CardDescription data-testid="text-checkout-plan">
              {t("subscribingToPlan")} <strong>{getPlanName(lang, plan.tier)}</strong> {t("subscribingToPlanSuffix")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{getPlanName(lang, plan.tier)} {t("plan")}</span>
                <Badge variant="secondary">{getTierLabel(lang as Lang, plan.tier)}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{t("monthlySubscription")}</span>
                <span data-testid="text-checkout-amount">
                  {formatPrice(payment.amount, payment.currency)}
                </span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center font-bold">
                <span>{t("total")}</span>
                <span data-testid="text-checkout-total">
                  {formatPrice(payment.amount, payment.currency)}
                </span>
              </div>
            </div>

            {checkout?.provider === "mock" && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">
                    {t("testPaymentMode")}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {t("development")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("testEnvironmentDesc")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="upi-ref">
                    {t("upiRefOptional")}
                  </Label>
                  <Input
                    id="upi-ref"
                    placeholder={t("enterAnyRef")}
                    value={mockUpiRef}
                    onChange={(e) => setMockUpiRef(e.target.value)}
                    disabled={paymentStatus !== "idle"}
                    data-testid="input-upi-ref"
                  />
                </div>
              </div>
            )}

            {isRazorpayMode && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">
                    {t("payWithRazorpay")}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {t("secure")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("paySecurelyUsingRazorpay")}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>
                {t("paymentSecured256Bit")}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {checkout?.provider === "mock" ? (
              <>
                <Button
                  className="w-full"
                  disabled={paymentStatus !== "idle" || verifyPaymentMutation.isPending}
                  onClick={() => handleMockPayment(true)}
                  data-testid="button-mock-pay-success"
                >
                  {verifyPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("processing")}
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      {t("simulateSuccess")}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={paymentStatus !== "idle" || verifyPaymentMutation.isPending}
                  onClick={() => handleMockPayment(false)}
                  data-testid="button-mock-pay-fail"
                >
                  {t("simulateFailed")}
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                disabled={
                  paymentStatus === "processing" ||
                  paymentStatus === "success" ||
                  createRazorpayOrderMutation.isPending ||
                  verifyRazorpayMutation.isPending
                }
                onClick={handleRazorpayPayment}
                data-testid="button-pay-razorpay"
              >
                {paymentStatus === "processing" || createRazorpayOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t("payAmount")} {formatPrice(payment.amount, payment.currency)}
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("termsAgreement")}
        </p>
      </main>
    </div>
  );
}
