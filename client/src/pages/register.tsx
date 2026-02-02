import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface RegionConfig {
  id: string;
  countryCode: string;
  countryName: string;
  region: string;
  status: string;
  registrationEnabled: boolean;
  defaultCurrency: string;
  defaultTimezone: string;
}

// Use shared validation
import { nameField } from "@shared/validation/name";
import { businessNameField } from "@shared/validation/business";
import { applyApiErrorsToForm, extractApiError } from "@/lib/form-errors";

const registrationSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(8).max(72),
  countryCode: z.string().trim().min(2, "Please select your country"),
  businessName: businessNameField("Business name"),
  businessType: z.enum([
    "pg_hostel", "consulting", "software_services", "clinic_healthcare",
    "legal", "digital_agency", "retail_store", "salon_spa", 
    "furniture_manufacturing", "logistics_fleet", "education_institute",
    "tourism", "real_estate"
  ]),
  // Honeypot field - should always be empty
  companyWebsite: z.string().max(0).optional(),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  }
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface BusinessTypeOption {
  value: string;
  label: string;
}

interface CatalogResponse {
  countryCode: string;
  rolloutStatus: string;
  countryName?: string;
  businessTypes: BusinessTypeOption[];
}

// Business Type Registry - matches shared/business-types.ts
// ❌ Never change codes after launch | ✅ Labels can be renamed
const defaultBusinessTypeOptions: BusinessTypeOption[] = [
  // Phase-1 India
  { value: "pg_hostel", label: "PG / Hostel" },
  // Phase-1 Multi-country
  { value: "consulting", label: "Consulting / Professional Services" },
  { value: "software_services", label: "Software / IT Services" },
  // Phase-2
  { value: "clinic_healthcare", label: "Clinic / Healthcare" },
  // Later phases
  { value: "legal", label: "Legal & Compliance" },
  { value: "digital_agency", label: "Digital Marketing Agency" },
  { value: "retail_store", label: "Retail Store / POS" },
  { value: "salon_spa", label: "Salon / Spa" },
  { value: "furniture_manufacturing", label: "Furniture Manufacturing" },
  { value: "logistics_fleet", label: "Logistics & Fleet" },
  { value: "education_institute", label: "Coaching / Training Institute" },
  { value: "tourism", label: "Tourism / Travel Agency" },
  { value: "real_estate", label: "Real Estate Agency" },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Clear any stale tokens AND cached queries when visiting register page
  // This ensures a completely clean slate for new registrations
  useEffect(() => {
    // Remove cached queries that might have stale auth headers baked in
    queryClient.removeQueries({ queryKey: ["/api/billing/subscription"] });
    queryClient.removeQueries({ queryKey: ["/api/billing/select-plan"] });
    queryClient.removeQueries({ queryKey: ["/api/auth"] });
    
    // Clear ALL auth tokens from localStorage (including admin token)
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("mybizstream_admin_token"); // Admin token that getAuthHeaders checks first!
    localStorage.removeItem("tenantId");
    localStorage.removeItem("lastTenantId");
  }, []);

  // Fetch active region configs for country selection
  const { data: regionConfigs, isLoading: isLoadingRegions } = useQuery<RegionConfig[]>({
    queryKey: ["/api/region-configs/active"],
  });

  // Fetch business types based on selected country
  const { data: catalogData, isLoading: isLoadingBusinessTypes } = useQuery<CatalogResponse>({
    queryKey: ["/api/catalog/business-types", selectedCountry],
    queryFn: async () => {
      if (!selectedCountry) return { countryCode: "", rolloutStatus: "coming_soon", businessTypes: defaultBusinessTypeOptions };
      const res = await fetch(`/api/catalog/business-types?country=${selectedCountry}`);
      if (!res.ok) throw new Error("Failed to fetch business types");
      return res.json();
    },
    enabled: !!selectedCountry,
  });

  // Get available business types - use catalog data if available, else defaults
  const businessTypeOptions = catalogData?.businessTypes || defaultBusinessTypeOptions;
  
  // Debug logging
  console.log("[register] selectedCountry:", selectedCountry);
  console.log("[register] catalogData:", catalogData);
  console.log("[register] businessTypeOptions count:", businessTypeOptions.length);

  // Filter only countries with registration enabled
  const availableCountries = regionConfigs?.filter(r => r.registrationEnabled && r.status === "enabled") || [];

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      countryCode: "",
      businessName: "",
      businessType: undefined,
      companyWebsite: "", // Honeypot - always empty
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          countryCode: data.countryCode,
          businessName: data.businessName,
          businessType: data.businessType,
          companyWebsite: data.companyWebsite, // Honeypot field
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Attach the full error data for the onError handler
        const error = new Error(errorData.message || "Registration failed") as Error & { 
          apiError?: typeof errorData 
        };
        error.apiError = errorData;
        throw error;
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // 1. REMOVE all cached queries that might have stale tokens baked in
      // This is critical - React Query may have cached requests with old tokens
      queryClient.removeQueries({ queryKey: ["/api/billing/subscription"] });
      queryClient.removeQueries({ queryKey: ["/api/billing/select-plan"] });
      queryClient.removeQueries({ queryKey: ["/api/auth"] });
      
      // 2. Clear ALL stale tokens (including admin token), then persist new auth tokens
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("mybizstream_admin_token"); // Clear admin token too!
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      
      // 3. Persist tenantId to BOTH localStorage AND cookie BEFORE any redirect
      const tenantId = data.tenant?.id || data.defaultTenantId;
      if (tenantId) {
        localStorage.setItem("tenantId", tenantId);
        localStorage.setItem("lastTenantId", tenantId);
        localStorage.setItem("selectedTenantId", tenantId);
        // Set cookie for server-side access
        document.cookie = `tenantId=${tenantId}; path=/; samesite=lax; max-age=31536000`;
      }
      
      toast({
        title: "Registration successful",
        description: `Welcome to MyBizStream, ${data.user.firstName}!`,
      });

      // 4. Navigate to packages - queries will be fresh with new tokens
      setLocation("/packages");
    },
    onError: (error: Error & { apiError?: unknown }) => {
      // Map API errors to form fields using the utility
      const apiError = extractApiError(error.apiError);
      const handled = applyApiErrorsToForm(apiError, form.setError);
      
      // Show short toast - detailed errors are shown inline on fields
      toast({
        title: "Registration failed",
        description: handled ? "Please fix the highlighted fields" : error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationForm) => {
    registerMutation.mutate(data);
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

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <CardTitle className="text-2xl" data-testid="text-register-title">Create your account</CardTitle>
                <CardDescription>Start managing your business today</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            data-testid="input-first-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Doe" 
                            data-testid="input-last-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="john@example.com" 
                          data-testid="input-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country / Region</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedCountry(value);
                          form.setValue("businessType", undefined as unknown as RegistrationForm["businessType"]);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder={isLoadingRegions ? "Loading countries..." : "Select your country"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCountries.map((country) => (
                            <SelectItem 
                              key={country.countryCode} 
                              value={country.countryCode}
                              data-testid={`option-country-${country.countryCode}`}
                            >
                              {country.countryName} ({country.defaultCurrency})
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
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="My Business" 
                          data-testid="input-business-name"
                          {...field} 
                        />
                      </FormControl>
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
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              data-testid={`option-${option.value}`}
                            >
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Min 8 chars, uppercase, lowercase, number"
                          data-testid="input-password"
                          {...field} 
                        />
                      </FormControl>
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
                        <Input 
                          type="password" 
                          placeholder="Re-enter your password"
                          data-testid="input-confirm-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Honeypot field - hidden from users, catches bots that fill all fields */}
                <input
                  type="text"
                  {...form.register("companyWebsite")}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  style={{ 
                    position: "absolute", 
                    left: "-9999px", 
                    opacity: 0, 
                    height: 0, 
                    width: 0,
                    pointerEvents: "none"
                  }}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login">
                    <span className="text-primary hover:underline cursor-pointer" data-testid="link-login">
                      Sign in
                    </span>
                  </Link>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
