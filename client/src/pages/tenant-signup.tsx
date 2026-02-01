import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2, ArrowLeft, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Use shared name validation
import { nameField } from "@shared/validation/name";
import { applyApiErrorsToForm, extractApiError } from "@/lib/form-errors";

const tenantSignupSchema = z.object({
  tenantName: z.string().trim().min(2, "Business name is required").max(200),
  subdomain: z.string().min(2, "Subdomain must be at least 2 characters").max(50).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed").optional().or(z.literal("")),
  businessType: z.enum([
    "clinic", "salon", "pg", "coworking", "service",
    "real_estate", "tourism", "education", "logistics",
    "legal", "furniture_manufacturing", "software_services", "consulting"
  ]),
  adminFirstName: nameField("First name"),
  adminLastName: nameField("Last name"),
  adminEmail: z.string().email("Invalid email format"),
  adminPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  country: z.enum(["india", "uae", "uk", "malaysia", "singapore", "other"]).default("india"),
  phone: z.string().max(20).optional().or(z.literal("")),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type TenantSignupForm = z.infer<typeof tenantSignupSchema>;

const businessTypeOptions = [
  { value: "clinic", label: "Clinic / Healthcare" },
  { value: "salon", label: "Salon / Beauty" },
  { value: "pg", label: "PG / Hostel / Co-living" },
  { value: "coworking", label: "Coworking Space" },
  { value: "service", label: "General Service Business" },
  { value: "real_estate", label: "Real Estate / Property" },
  { value: "tourism", label: "Tourism / Travel Agency" },
  { value: "education", label: "Education / Training" },
  { value: "logistics", label: "Logistics / Delivery" },
  { value: "legal", label: "Legal Services" },
  { value: "furniture_manufacturing", label: "Furniture Manufacturing" },
  { value: "software_services", label: "Software Services / IT" },
  { value: "consulting", label: "Consulting / Professional Services" },
];

const countryOptions = [
  { value: "india", label: "India" },
  { value: "uae", label: "UAE" },
  { value: "uk", label: "United Kingdom" },
  { value: "malaysia", label: "Malaysia" },
  { value: "singapore", label: "Singapore" },
  { value: "other", label: "Other" },
];

export default function TenantSignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<TenantSignupForm>({
    resolver: zodResolver(tenantSignupSchema),
    defaultValues: {
      tenantName: "",
      subdomain: "",
      businessType: undefined,
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
      country: "india",
      phone: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: TenantSignupForm) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: data.tenantName,
          subdomain: data.subdomain || undefined,
          businessType: data.businessType,
          adminFirstName: data.adminFirstName,
          adminLastName: data.adminLastName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          country: data.country,
          phone: data.phone || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || errorData.error || "Signup failed") as Error & { 
          apiError?: typeof errorData 
        };
        error.apiError = errorData;
        throw error;
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("tenantId", data.tenant.id);
      localStorage.setItem("lastTenantId", data.tenant.id);
      localStorage.setItem("tenantCountry", variables.country);

      queryClient.invalidateQueries({ queryKey: ["/api/auth"] });

      toast({
        title: "Account created successfully",
        description: `Welcome to MyBizStream, ${data.tenant.name}!`,
      });

      setTimeout(() => {
        setLocation("/packages");
      }, 100);
    },
    onError: (error: Error & { apiError?: unknown }) => {
      // Map API errors to form fields using the utility
      const apiError = extractApiError(error.apiError);
      applyApiErrorsToForm(apiError, form.setError);
      
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TenantSignupForm) => {
    signupMutation.mutate(data);
  };

  const nextStep = async () => {
    const fieldsToValidate = step === 1
      ? ["tenantName", "subdomain", "businessType", "country"]
      : ["adminFirstName", "adminLastName", "adminEmail", "adminPassword", "confirmPassword"];

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold" data-testid="text-logo">MyBizStream</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <CardTitle className="text-2xl" data-testid="text-signup-title">Create Your Business Account</CardTitle>
                <CardDescription>
                  Step {step} of 2 - {step === 1 ? "Business Details" : "Admin Account"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="tenantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Business Name" data-testid="input-tenant-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subdomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subdomain (optional)</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input placeholder="yourbusiness" data-testid="input-subdomain" {...field} />
                              <span className="text-sm text-muted-foreground">.mybizstream.com</span>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Leave blank to auto-generate from your business name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-business-type">
                                <SelectValue placeholder="Select your business type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {businessTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-country">
                                <SelectValue placeholder="Select your country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {countryOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="adminFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" data-testid="input-first-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="adminLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" data-testid="input-last-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+1 234 567 8900" data-testid="input-phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a strong password" data-testid="input-password" {...field} />
                          </FormControl>
                          <FormDescription>
                            At least 8 characters with uppercase, lowercase, and numbers
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" data-testid="input-confirm-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {step === 2 && (
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                data-testid="button-prev-step"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={nextStep} className="ml-auto" data-testid="button-next-step">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={signupMutation.isPending}
                className="ml-auto"
                data-testid="button-create-account"
              >
                {signupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            )}
          </CardFooter>
          <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
