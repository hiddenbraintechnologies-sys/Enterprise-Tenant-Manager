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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2, ArrowLeft, Loader2, Mail, Lock, Check } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface TenantOption {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  businessType: string | null;
}

const DASHBOARD_ROUTES: Record<string, string> = {
  clinic: "/dashboard/clinic",
  salon: "/dashboard/salon",
  pg: "/dashboard/pg",
  coworking: "/dashboard/coworking",
  service: "/dashboard/service",
  real_estate: "/dashboard/real-estate",
  tourism: "/dashboard/tourism",
  education: "/dashboard/education",
  logistics: "/dashboard/logistics",
  legal: "/dashboard/legal",
  furniture_manufacturing: "/dashboard/furniture",
  software_services: "/dashboard/software-services",
  consulting: "/dashboard/consulting",
};

function getDashboardRoute(businessType: string): string {
  return DASHBOARD_ROUTES[businessType] || DASHBOARD_ROUTES.service;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [pendingCredentials, setPendingCredentials] = useState<LoginForm | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const performLogin = async (data: LoginForm, tenantId?: string, isRetry?: boolean): Promise<any> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, tenantId }),
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.code === "MULTI_TENANT_SELECT_REQUIRED" && result.tenants) {
        setAvailableTenants(result.tenants);
        setPendingCredentials(data);
        setSelectedTenantId(null);
        setShowTenantPicker(true);
        return null;
      }
      
      if (!isRetry && tenantId && (
        result.code === "NO_TENANT_ACCESS" || 
        result.code === "TENANT_NOT_EXIST"
      )) {
        localStorage.removeItem("lastTenantId");
        return performLogin(data, undefined, true);
      }
      
      throw new Error(result.message || "Login failed");
    }

    return result;
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const storedTenantId = localStorage.getItem("lastTenantId") || localStorage.getItem("tenantId");
      return performLogin(data, storedTenantId || undefined, false);
    },
    onSuccess: (data) => {
      if (!data) return;
      
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      if (data.tenant?.id) {
        localStorage.setItem("tenantId", data.tenant.id);
        localStorage.setItem("lastTenantId", data.tenant.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Welcome back!",
        description: `Signed in as ${data.user.email}`,
      });

      const businessType = data.tenant?.businessType || "service";
      const dashboardRoute = getDashboardRoute(businessType);
      
      setTimeout(() => {
        setLocation(dashboardRoute);
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const tenantSelectMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      if (!pendingCredentials) throw new Error("No pending credentials");
      return performLogin(pendingCredentials, tenantId);
    },
    onSuccess: (data) => {
      if (!data) return;
      
      setShowTenantPicker(false);
      setPendingCredentials(null);
      setAvailableTenants([]);
      
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      if (data.tenant?.id) {
        localStorage.setItem("tenantId", data.tenant.id);
        localStorage.setItem("lastTenantId", data.tenant.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Welcome back!",
        description: `Signed in as ${data.user.email}`,
      });

      const businessType = data.tenant?.businessType || "service";
      const dashboardRoute = getDashboardRoute(businessType);
      
      setTimeout(() => {
        setLocation(dashboardRoute);
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const confirmTenantSelection = () => {
    if (selectedTenantId) {
      tenantSelectMutation.mutate(selectedTenantId);
    }
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/login?provider=${provider}`;
  };

  const formatBusinessType = (type: string | null) => {
    if (!type) return "";
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
            <CardTitle data-testid="text-login-title">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
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

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
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

                  <FormField
                    control={form.control}
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

                  <Button 
                    type="submit" 
                    className="w-full" 
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
          </CardContent>
        </Card>
      </div>

      <Dialog open={showTenantPicker} onOpenChange={setShowTenantPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select a Business</DialogTitle>
            <DialogDescription>
              Your account has access to multiple businesses. Please select one to continue.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 p-1">
              {availableTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantSelect(tenant.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedTenantId === tenant.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  data-testid={`button-tenant-${tenant.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBusinessType(tenant.businessType)}
                        {tenant.country && ` • ${tenant.country.toUpperCase()}`}
                      </p>
                    </div>
                    {selectedTenantId === tenant.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowTenantPicker(false);
                setPendingCredentials(null);
                setSelectedTenantId(null);
              }}
              data-testid="button-cancel-tenant-select"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedTenantId || tenantSelectMutation.isPending}
              onClick={confirmTenantSelection}
              data-testid="button-confirm-tenant-select"
            >
              {tenantSelectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
