import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin, AdminGuard } from "@/contexts/admin-context";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Shield,
  Key,
  Plus,
  Settings2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Play,
  Globe,
  Building2,
  Lock,
  Link2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SiGoogle, SiOkta } from "react-icons/si";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SsoProvider {
  id: string;
  providerType: string;
  providerName: string;
  displayName?: string;
  status: string;
  isDefault: boolean;
  allowedDomains?: string[];
  autoCreateUsers?: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

const providerIcons: Record<string, typeof SiGoogle | typeof Shield> = {
  google: SiGoogle,
  microsoft: Building2,
  okta: SiOkta,
};

const googleFormSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  allowedDomains: z.string().optional(),
  autoCreateUsers: z.boolean().default(true),
  autoLinkUsers: z.boolean().default(true),
});

const microsoftFormSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  tenantId: z.string().optional(),
  allowedDomains: z.string().optional(),
  autoCreateUsers: z.boolean().default(true),
  autoLinkUsers: z.boolean().default(true),
});

const oktaFormSchema = z.object({
  oktaDomain: z.string().min(1, "Okta domain is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  allowedDomains: z.string().optional(),
  autoCreateUsers: z.boolean().default(true),
});

const samlFormSchema = z.object({
  entityId: z.string().min(1, "Entity ID is required"),
  ssoUrl: z.string().url("Must be a valid URL"),
  certificate: z.string().min(1, "Certificate is required"),
  signatureAlgorithm: z.string().default("sha256"),
  nameIdFormat: z.string().default("emailAddress"),
  allowedDomains: z.string().optional(),
  autoCreateUsers: z.boolean().default(true),
});

type GoogleForm = z.infer<typeof googleFormSchema>;
type MicrosoftForm = z.infer<typeof microsoftFormSchema>;
type OktaForm = z.infer<typeof oktaFormSchema>;
type SamlForm = z.infer<typeof samlFormSchema>;

function ProviderCard({ provider, onTest, onToggle, onDelete }: {
  provider: SsoProvider;
  onTest: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = providerIcons[provider.providerType] || Shield;
  const isActive = provider.status === 'active';
  
  return (
    <Card data-testid={`card-provider-${provider.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">
              {provider.displayName || provider.providerName}
            </CardTitle>
            <CardDescription className="text-xs">
              {provider.providerType.toUpperCase()}
            </CardDescription>
          </div>
        </div>
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {provider.allowedDomains && provider.allowedDomains.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Domains: {provider.allowedDomains.join(", ")}</span>
          </div>
        )}
        {provider.lastUsedAt && (
          <div className="text-xs text-muted-foreground">
            Last used: {new Date(provider.lastUsedAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => onToggle(provider.id, checked)}
            data-testid={`switch-provider-${provider.id}`}
          />
          <Label className="text-sm">{isActive ? "Enabled" : "Disabled"}</Label>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(provider.id)}
            data-testid={`button-test-${provider.id}`}
          >
            <Play className="h-3 w-3 mr-1" />
            Test
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(provider.id)}
            data-testid={`button-delete-${provider.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function GoogleSetupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<GoogleForm>({
    resolver: zodResolver(googleFormSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      allowedDomains: "",
      autoCreateUsers: true,
      autoLinkUsers: true,
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: GoogleForm) => {
      const payload = {
        ...data,
        allowedDomains: data.allowedDomains
          ? data.allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
          : [],
      };
      return apiRequest("POST", "/api/sso/google/setup", payload);
    },
    onSuccess: () => {
      toast({ title: "Google SSO configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sso/providers"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to configure Google SSO", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => setupMutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client ID</FormLabel>
              <FormControl>
                <Input placeholder="your-client-id.apps.googleusercontent.com" {...field} data-testid="input-google-client-id" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Secret</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter client secret" {...field} data-testid="input-google-client-secret" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowedDomains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowed Domains (optional)</FormLabel>
              <FormControl>
                <Input placeholder="example.com, company.org" {...field} data-testid="input-google-domains" />
              </FormControl>
              <FormDescription>Comma-separated list of allowed email domains</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="autoCreateUsers"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-google-auto-create" />
                </FormControl>
                <FormLabel className="!mt-0">Auto-create users</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="autoLinkUsers"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-google-auto-link" />
                </FormControl>
                <FormLabel className="!mt-0">Auto-link users</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={setupMutation.isPending} data-testid="button-save-google">
          {setupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </form>
    </Form>
  );
}

function MicrosoftSetupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<MicrosoftForm>({
    resolver: zodResolver(microsoftFormSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      tenantId: "",
      allowedDomains: "",
      autoCreateUsers: true,
      autoLinkUsers: true,
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: MicrosoftForm) => {
      const payload = {
        ...data,
        allowedDomains: data.allowedDomains
          ? data.allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
          : [],
      };
      return apiRequest("POST", "/api/sso/microsoft/setup", payload);
    },
    onSuccess: () => {
      toast({ title: "Microsoft SSO configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sso/providers"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to configure Microsoft SSO", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => setupMutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application (Client) ID</FormLabel>
              <FormControl>
                <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} data-testid="input-microsoft-client-id" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Secret</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter client secret" {...field} data-testid="input-microsoft-client-secret" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tenantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tenant ID (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Leave empty for multi-tenant or enter specific tenant" {...field} data-testid="input-microsoft-tenant-id" />
              </FormControl>
              <FormDescription>Use "common" for any Microsoft account, or specific tenant ID for single-tenant</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowedDomains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowed Domains (optional)</FormLabel>
              <FormControl>
                <Input placeholder="example.com, company.org" {...field} data-testid="input-microsoft-domains" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="autoCreateUsers"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-microsoft-auto-create" />
                </FormControl>
                <FormLabel className="!mt-0">Auto-create users</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="autoLinkUsers"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-microsoft-auto-link" />
                </FormControl>
                <FormLabel className="!mt-0">Auto-link users</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={setupMutation.isPending} data-testid="button-save-microsoft">
          {setupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </form>
    </Form>
  );
}

function OktaSetupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<OktaForm>({
    resolver: zodResolver(oktaFormSchema),
    defaultValues: {
      oktaDomain: "",
      clientId: "",
      clientSecret: "",
      allowedDomains: "",
      autoCreateUsers: true,
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: OktaForm) => {
      const payload = {
        ...data,
        allowedDomains: data.allowedDomains
          ? data.allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
          : [],
      };
      return apiRequest("POST", "/api/sso/okta/setup", payload);
    },
    onSuccess: () => {
      toast({ title: "Okta SSO configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sso/providers"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to configure Okta SSO", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => setupMutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="oktaDomain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Okta Domain</FormLabel>
              <FormControl>
                <Input placeholder="your-org.okta.com" {...field} data-testid="input-okta-domain" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter Okta application client ID" {...field} data-testid="input-okta-client-id" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Secret</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter client secret" {...field} data-testid="input-okta-client-secret" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowedDomains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowed Domains (optional)</FormLabel>
              <FormControl>
                <Input placeholder="example.com, company.org" {...field} data-testid="input-okta-domains" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="autoCreateUsers"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-okta-auto-create" />
              </FormControl>
              <FormLabel className="!mt-0">Auto-create users on first login</FormLabel>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={setupMutation.isPending} data-testid="button-save-okta">
          {setupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </form>
    </Form>
  );
}

function SamlSetupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<SamlForm>({
    resolver: zodResolver(samlFormSchema),
    defaultValues: {
      entityId: "",
      ssoUrl: "",
      certificate: "",
      signatureAlgorithm: "sha256",
      nameIdFormat: "emailAddress",
      allowedDomains: "",
      autoCreateUsers: true,
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: SamlForm) => {
      const payload = {
        ...data,
        allowedDomains: data.allowedDomains
          ? data.allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
          : [],
      };
      return apiRequest("POST", "/api/sso/saml/setup", payload);
    },
    onSuccess: () => {
      toast({ title: "SAML SSO configured successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sso/providers"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to configure SAML SSO", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => setupMutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="entityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IdP Entity ID</FormLabel>
              <FormControl>
                <Input placeholder="https://idp.example.com/metadata" {...field} data-testid="input-saml-entity-id" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ssoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SSO URL</FormLabel>
              <FormControl>
                <Input placeholder="https://idp.example.com/sso/saml" {...field} data-testid="input-saml-sso-url" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="certificate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>X.509 Certificate</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  className="font-mono text-xs min-h-32"
                  {...field}
                  data-testid="input-saml-certificate"
                />
              </FormControl>
              <FormDescription>Paste the IdP's public certificate in PEM format</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="signatureAlgorithm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signature Algorithm</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-saml-signature">
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sha256">SHA-256</SelectItem>
                    <SelectItem value="sha384">SHA-384</SelectItem>
                    <SelectItem value="sha512">SHA-512</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nameIdFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name ID Format</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-saml-nameid">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="emailAddress">Email Address</SelectItem>
                    <SelectItem value="persistent">Persistent</SelectItem>
                    <SelectItem value="transient">Transient</SelectItem>
                    <SelectItem value="unspecified">Unspecified</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="allowedDomains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowed Domains (optional)</FormLabel>
              <FormControl>
                <Input placeholder="example.com, company.org" {...field} data-testid="input-saml-domains" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="autoCreateUsers"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-saml-auto-create" />
              </FormControl>
              <FormLabel className="!mt-0">Auto-create users on first login</FormLabel>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={setupMutation.isPending} data-testid="button-save-saml">
          {setupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </form>
    </Form>
  );
}

function SsoContent() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const { data: providersData, isLoading } = useQuery<{ providers: SsoProvider[] }>({
    queryKey: ["/api/sso/providers"],
    staleTime: 30 * 1000,
  });

  const providers = providersData?.providers || [];

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/sso/providers/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sso/providers"] });
      toast({ title: "Provider activated" });
    },
    onError: () => {
      toast({ title: "Failed to activate provider", variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/sso/providers/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sso/providers"] });
      toast({ title: "Provider deactivated" });
    },
    onError: () => {
      toast({ title: "Failed to deactivate provider", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sso/providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sso/providers"] });
      toast({ title: "Provider deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete provider", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingProvider(id);
      const response = await apiRequest("POST", `/api/sso/providers/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast({ title: "Connection test successful" });
      } else {
        toast({ title: "Connection test failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
      toast({ title: "Connection test failed", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setTestingProvider(null);
    },
  });

  const handleToggle = (id: string, active: boolean) => {
    if (active) {
      activateMutation.mutate(id);
    } else {
      deactivateMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-sso-title">SSO Management</h1>
          <p className="text-muted-foreground">Configure single sign-on providers for your tenant</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-provider">
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure SSO Provider</DialogTitle>
              <DialogDescription>
                Set up a new identity provider for single sign-on authentication
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="google" data-testid="tab-google">
                  <SiGoogle className="h-4 w-4 mr-2" />
                  Google
                </TabsTrigger>
                <TabsTrigger value="microsoft" data-testid="tab-microsoft">
                  <Building2 className="h-4 w-4 mr-2" />
                  Microsoft
                </TabsTrigger>
                <TabsTrigger value="okta" data-testid="tab-okta">
                  <SiOkta className="h-4 w-4 mr-2" />
                  Okta
                </TabsTrigger>
                <TabsTrigger value="saml" data-testid="tab-saml">
                  <Shield className="h-4 w-4 mr-2" />
                  SAML
                </TabsTrigger>
              </TabsList>
              <TabsContent value="google" className="mt-4">
                <GoogleSetupForm onSuccess={() => setAddDialogOpen(false)} />
              </TabsContent>
              <TabsContent value="microsoft" className="mt-4">
                <MicrosoftSetupForm onSuccess={() => setAddDialogOpen(false)} />
              </TabsContent>
              <TabsContent value="okta" className="mt-4">
                <OktaSetupForm onSuccess={() => setAddDialogOpen(false)} />
              </TabsContent>
              <TabsContent value="saml" className="mt-4">
                <SamlSetupForm onSuccess={() => setAddDialogOpen(false)} />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No SSO Providers Configured</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Set up single sign-on to allow users to authenticate using your organization's identity provider.
            </p>
            <Button onClick={() => setAddDialogOpen(true)} data-testid="button-setup-first">
              <Plus className="h-4 w-4 mr-2" />
              Configure First Provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onTest={(id) => testMutation.mutate(id)}
              onToggle={handleToggle}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {testResult && (
        <Card className={testResult.success ? "border-green-500" : "border-destructive"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Connection Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={testResult.success ? "text-green-600" : "text-destructive"}>
              {testResult.message}
            </p>
            {testResult.details && (
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            SSO Configuration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <SiGoogle className="h-4 w-4" /> Google Workspace
              </h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Go to Google Cloud Console</li>
                <li>Create OAuth 2.0 credentials</li>
                <li>Add authorized redirect URI</li>
                <li>Copy Client ID and Secret</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Microsoft Entra ID
              </h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Go to Azure Portal</li>
                <li>Register new application</li>
                <li>Configure redirect URI</li>
                <li>Create client secret</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <SiOkta className="h-4 w-4" /> Okta
              </h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Create OIDC application in Okta</li>
                <li>Set grant type to Authorization Code</li>
                <li>Configure redirect URIs</li>
                <li>Copy Client ID and Secret</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" /> SAML 2.0
              </h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Get IdP metadata or manual config</li>
                <li>Copy Entity ID and SSO URL</li>
                <li>Export X.509 certificate</li>
                <li>Configure attribute mapping</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSso() {
  return (
    <AdminGuard>
      <SsoContent />
    </AdminGuard>
  );
}
