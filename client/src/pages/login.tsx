import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2, ArrowLeft, Loader2, Mail, Lock, Check, ChevronRight, ArrowRight } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const emailSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

interface TenantOption {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  businessType: string | null;
  isDefault?: boolean;
}

type LoginStep = "email" | "tenant" | "password";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const tenantDiscoveryMutation = useMutation({
    mutationFn: async (emailValue: string) => {
      setAvailableTenants([]);
      setSelectedTenantId(null);
      
      const response = await fetch("/api/auth/tenant-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to check email");
      }
      
      return response.json();
    },
    onSuccess: (data, emailValue) => {
      setEmail(emailValue);
      
      if (data.tenants?.length === 0) {
        setSelectedTenantId(null);
        setStep("password");
      } else if (data.tenants?.length === 1) {
        setSelectedTenantId(data.tenants[0].id);
        setStep("password");
      } else if (data.tenants?.length > 1) {
        setAvailableTenants(data.tenants);
        const defaultTenant = data.tenants.find((t: TenantOption) => t.isDefault);
        setSelectedTenantId(defaultTenant?.id || null);
        setStep("tenant");
      } else {
        setSelectedTenantId(null);
        setStep("password");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check email",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenantId: selectedTenantId }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "MULTI_TENANT_SELECT_REQUIRED" && result.tenants) {
          setAvailableTenants(result.tenants);
          setStep("tenant");
          return null;
        }
        throw new Error(result.message || "Login failed");
      }

      return result;
    },
    onSuccess: async (data) => {
      if (!data) return;
      
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      if (data.tenant?.id) {
        localStorage.setItem("tenantId", data.tenant.id);
        localStorage.setItem("lastTenantId", data.tenant.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth"] });
      
      toast({
        title: "Welcome back!",
        description: `Signed in as ${data.user.email}`,
      });

      // Check if tenant already has an active subscription
      try {
        const subscriptionResponse = await fetch("/api/billing/subscription", {
          credentials: "include",
          headers: {
            "Authorization": `Bearer ${data.accessToken}`,
            "X-Tenant-ID": data.tenant?.id || "",
          },
        });
        
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          const isActive = subscriptionData?.isActive === true;
          const status = (subscriptionData?.status || "").toLowerCase();
          
          if (isActive || status === "active" || status === "trialing") {
            // Tenant has active subscription - go to dashboard
            const businessType = data.tenant?.businessType || "service";
            const dashboardRoutes: Record<string, string> = {
              clinic: "/dashboard/clinic",
              salon: "/dashboard/salon",
              pg: "/dashboard/pg",
              coworking: "/dashboard/coworking",
              service: "/dashboard/service",
              realestate: "/dashboard/realestate",
              tourism: "/dashboard/tourism",
              education: "/dashboard/education",
              logistics: "/dashboard/logistics",
              legal: "/dashboard/legal",
              furniture: "/dashboard/furniture",
              consulting: "/dashboard/consulting",
              software_services: "/dashboard/software-services",
            };
            const dashboardRoute = dashboardRoutes[businessType] || "/dashboard/service";
            setLocation(dashboardRoute);
            return;
          }
        }
      } catch (error) {
        console.log("[Login] Could not check subscription, redirecting to packages");
      }
      
      // No active subscription or error - go to packages
      setLocation("/packages");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEmailSubmit = (data: EmailForm) => {
    tenantDiscoveryMutation.mutate(data.email);
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const handleTenantContinue = () => {
    if (selectedTenantId) {
      setStep("password");
    }
  };

  const handlePasswordSubmit = (data: PasswordForm) => {
    loginMutation.mutate(data.password);
  };

  const handleBack = () => {
    if (step === "password") {
      if (availableTenants.length > 1) {
        setStep("tenant");
      } else {
        setStep("email");
        setSelectedTenantId(null);
      }
    } else if (step === "tenant") {
      setStep("email");
      setSelectedTenantId(null);
      setAvailableTenants([]);
    }
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/login?provider=${provider}`;
  };

  const formatBusinessType = (type: string | null) => {
    if (!type) return "";
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const getCountryFlag = (country: string | null) => {
    if (!country) return "";
    const flags: Record<string, string> = {
      "IN": "🇮🇳", "india": "🇮🇳",
      "AE": "🇦🇪", "uae": "🇦🇪",
      "UK": "🇬🇧", "GB": "🇬🇧", "uk": "🇬🇧",
      "MY": "🇲🇾", "malaysia": "🇲🇾",
      "SG": "🇸🇬", "singapore": "🇸🇬",
      "US": "🇺🇸", "usa": "🇺🇸",
    };
    return flags[country] || flags[country.toUpperCase()] || "";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">MyBizStream</span>
            </div>
            <CardTitle data-testid="text-login-title">
              {step === "email" && "Welcome Back"}
              {step === "tenant" && "Select Business"}
              {step === "password" && "Enter Password"}
            </CardTitle>
            <CardDescription>
              {step === "email" && "Sign in to your account to continue"}
              {step === "tenant" && "Choose which business to access"}
              {step === "password" && email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" && (
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleSocialLogin("google")}
                  data-testid="button-google-login"
                >
                  <SiGoogle className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-replit-login"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Continue with Replit
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="email" 
                                placeholder="you@example.com"
                                className="pl-10"
                                data-testid="input-email"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={tenantDiscoveryMutation.isPending}
                      data-testid="button-continue"
                    >
                      {tenantDiscoveryMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          Continue
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <Link href="/register">
                        <span className="text-primary hover:underline cursor-pointer" data-testid="link-register">
                          Create account
                        </span>
                      </Link>
                    </p>
                  </form>
                </Form>
              </div>
            )}

            {step === "tenant" && (
              <div className="space-y-4">
                <ScrollArea className="max-h-[280px]">
                  <div className="space-y-2">
                    {availableTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => handleTenantSelect(tenant.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          selectedTenantId === tenant.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover-elevate"
                        }`}
                        data-testid={`button-tenant-${tenant.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{tenant.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {formatBusinessType(tenant.businessType)}
                              {tenant.country && (
                                <Badge variant="secondary" className="text-xs">
                                  {getCountryFlag(tenant.country)} {tenant.country.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {selectedTenantId === tenant.id && (
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!selectedTenantId}
                    onClick={handleTenantContinue}
                    data-testid="button-tenant-continue"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === "password" && (
              <div className="space-y-4">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Enter your password"
                                className="pl-10"
                                autoFocus
                                data-testid="input-password"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-end">
                      <Link href="/forgot-password">
                        <span className="text-sm text-primary hover:underline cursor-pointer" data-testid="link-forgot-password">
                          Forgot password?
                        </span>
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        data-testid="button-back"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
