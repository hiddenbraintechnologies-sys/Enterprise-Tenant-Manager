import { useState, useEffect } from "react";
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
import { 
  ArrowLeft, CreditCard, Shield, Loader2, CheckCircle, XCircle,
  AlertTriangle, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

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

interface CheckoutSession {
  success: boolean;
  provider: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentId: string;
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

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mockUpiRef, setMockUpiRef] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");

  const tenantId = localStorage.getItem("tenantId");
  const accessToken = localStorage.getItem("accessToken");

  const { data: pendingData, isLoading: isPendingLoading } = useQuery<PendingPayment>({
    queryKey: ["/api/billing/pending-payment"],
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/checkout/create", {});
      return response.json() as Promise<CheckoutSession>;
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (params: { paymentId: string; mockSuccess: boolean }) => {
      const response = await apiRequest("POST", "/api/billing/checkout/verify", {
        paymentId: params.paymentId,
        mockSuccess: params.mockSuccess,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPaymentStatus("success");
      localStorage.setItem("subscriptionStatus", "active");
      localStorage.removeItem("pendingPaymentId");
      localStorage.removeItem("pendingPlanCode");
      toast({ title: "Payment successful", description: "Your subscription is now active." });
      setTimeout(() => {
        setLocation(data.redirectUrl || "/dashboard");
      }, 2000);
    },
    onError: (error: Error) => {
      setPaymentStatus("failed");
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (pendingData?.payment && !createCheckoutMutation.data) {
      createCheckoutMutation.mutate();
    }
  }, [pendingData?.payment]);

  const handleMockPayment = (success: boolean) => {
    if (!pendingData?.payment?.id) return;
    setPaymentStatus("processing");
    verifyPaymentMutation.mutate({
      paymentId: pendingData.payment.id,
      mockSuccess: success,
    });
  };

  const payment = pendingData?.payment;
  const plan = pendingData?.plan;
  const checkout = createCheckoutMutation.data;

  if (isPendingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">MyBizStream</h1>
            <ThemeToggle />
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

  if (!payment || !plan) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">MyBizStream</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>No pending payment</CardTitle>
              <CardDescription>
                There is no payment pending. Please select a plan first.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full" asChild data-testid="button-back-packages">
                <Link href="/packages">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Choose a plan
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back-packages">
              <Link href="/packages">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Checkout</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-lg">
        {paymentStatus === "success" && (
          <Card className="mb-6 border-green-500">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2" data-testid="text-payment-success">Payment Successful!</h2>
              <p className="text-muted-foreground">Your subscription is now active. Redirecting to dashboard...</p>
            </CardContent>
          </Card>
        )}

        {paymentStatus === "failed" && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Payment failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-checkout-title">Complete your purchase</CardTitle>
            <CardDescription data-testid="text-checkout-plan">
              You're subscribing to the <strong>{plan.name}</strong> plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{plan.name} Plan</span>
                <Badge variant="secondary">{plan.tier}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Monthly subscription</span>
                <span data-testid="text-checkout-amount">
                  {formatPrice(payment.amount, payment.currency)}
                </span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center font-bold">
                <span>Total</span>
                <span data-testid="text-checkout-total">
                  {formatPrice(payment.amount, payment.currency)}
                </span>
              </div>
            </div>

            {checkout?.provider === "mock" && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Test Payment Mode</span>
                  <Badge variant="outline" className="ml-auto">Development</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  This is a test environment. Use the buttons below to simulate payment.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="upi-ref">UPI Reference (optional)</Label>
                  <Input
                    id="upi-ref"
                    placeholder="Enter any reference"
                    value={mockUpiRef}
                    onChange={(e) => setMockUpiRef(e.target.value)}
                    disabled={paymentStatus !== "idle"}
                    data-testid="input-upi-ref"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Your payment is secured with 256-bit encryption</span>
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
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Simulate Successful Payment
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
                  Simulate Failed Payment
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                disabled={createCheckoutMutation.isPending || paymentStatus !== "idle"}
                data-testid="button-pay-razorpay"
              >
                {createCheckoutMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparing payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with Razorpay
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By completing this purchase, you agree to our Terms of Service and Privacy Policy.
        </p>
      </main>
    </div>
  );
}
