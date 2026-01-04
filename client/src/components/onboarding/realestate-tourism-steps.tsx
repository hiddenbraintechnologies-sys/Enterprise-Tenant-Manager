import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Building, Home, Users, Palmtree, Store } from "lucide-react";

interface StepProps {
  stepData: Record<string, any>;
  onComplete: (data: any) => void;
  isPending: boolean;
}

const agencyDetailsSchema = z.object({
  agencyName: z.string().min(2, "Agency name is required"),
  reraNumber: z.string().optional(),
  operatingSince: z.string().optional(),
  primaryLocation: z.string().min(2, "Primary location is required"),
});

export function AgencyDetailsStep({ stepData, onComplete, isPending }: StepProps) {
  const form = useForm({
    resolver: zodResolver(agencyDetailsSchema),
    defaultValues: {
      agencyName: stepData?.agencyName || "",
      reraNumber: stepData?.reraNumber || "",
      operatingSince: stepData?.operatingSince || "",
      primaryLocation: stepData?.primaryLocation || "",
    },
  });

  const handleSubmit = (data: z.infer<typeof agencyDetailsSchema>) => {
    onComplete(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Agency Details</CardTitle>
        </div>
        <CardDescription>Enter your real estate agency information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="agencyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agency Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Prime Properties" {...field} data-testid="input-agency-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reraNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RERA Registration #</FormLabel>
                    <FormControl>
                      <Input placeholder="RERA number" {...field} data-testid="input-rera" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="operatingSince"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operating Since</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2015" {...field} data-testid="input-operating-since" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="primaryLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mumbai" {...field} data-testid="input-primary-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-continue">
              Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

const PROPERTY_CATEGORIES = [
  { id: "residential-apartment", label: "Residential - Apartment" },
  { id: "residential-villa", label: "Residential - Villa/House" },
  { id: "residential-plot", label: "Residential - Plot" },
  { id: "commercial-office", label: "Commercial - Office Space" },
  { id: "commercial-shop", label: "Commercial - Shop/Retail" },
  { id: "commercial-warehouse", label: "Commercial - Warehouse" },
  { id: "industrial", label: "Industrial" },
  { id: "agricultural", label: "Agricultural Land" },
];

export function PropertyCategoriesStep({ stepData, onComplete, isPending }: StepProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    stepData?.categories || []
  );

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = () => {
    if (selectedCategories.length === 0) {
      return;
    }
    onComplete({ categories: selectedCategories });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Property Categories</CardTitle>
        </div>
        <CardDescription>Select the property types you deal with (at least one)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className="flex items-center space-x-2 p-2 rounded-md border hover-elevate cursor-pointer"
              onClick={() => toggleCategory(category.id)}
              data-testid={`checkbox-category-${category.id}`}
            >
              <Checkbox checked={selectedCategories.includes(category.id)} />
              <Label className="cursor-pointer text-sm">{category.label}</Label>
            </div>
          ))}
        </div>
        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          disabled={isPending || selectedCategories.length === 0} 
          data-testid="button-continue"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface AgentEntry {
  name: string;
  phone: string;
  email: string;
  specialization: string;
}

export function AgentOnboardingStep({ stepData, onComplete, isPending }: StepProps) {
  const [agents, setAgents] = useState<AgentEntry[]>(
    stepData?.agents || [{ name: "", phone: "", email: "", specialization: "" }]
  );

  const addAgent = () => {
    setAgents([...agents, { name: "", phone: "", email: "", specialization: "" }]);
  };

  const removeAgent = (index: number) => {
    if (agents.length > 1) {
      setAgents(agents.filter((_, i) => i !== index));
    }
  };

  const updateAgent = (index: number, field: keyof AgentEntry, value: string) => {
    const updated = [...agents];
    updated[index][field] = value;
    setAgents(updated);
  };

  const handleSubmit = () => {
    const validAgents = agents.filter(a => a.name && a.phone);
    onComplete({ agents: validAgents });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Agent Onboarding</CardTitle>
        </div>
        <CardDescription>Add your real estate agents (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map((agent, index) => (
          <div key={index} className="p-3 border rounded-md space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Agent {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAgent(index)}
                disabled={agents.length === 1}
                data-testid={`button-remove-agent-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Agent Name"
                value={agent.name}
                onChange={(e) => updateAgent(index, "name", e.target.value)}
                data-testid={`input-agent-name-${index}`}
              />
              <Input
                placeholder="Phone"
                value={agent.phone}
                onChange={(e) => updateAgent(index, "phone", e.target.value)}
                data-testid={`input-agent-phone-${index}`}
              />
              <Input
                placeholder="Email"
                value={agent.email}
                onChange={(e) => updateAgent(index, "email", e.target.value)}
                data-testid={`input-agent-email-${index}`}
              />
              <Input
                placeholder="Specialization (e.g., Residential)"
                value={agent.specialization}
                onChange={(e) => updateAgent(index, "specialization", e.target.value)}
                data-testid={`input-agent-specialization-${index}`}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addAgent} className="w-full" data-testid="button-add-agent">
          <Plus className="h-4 w-4 mr-2" /> Add Agent
        </Button>
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface PackageEntry {
  name: string;
  destination: string;
  duration: string;
  price: string;
}

export function PackageTemplatesStep({ stepData, onComplete, isPending }: StepProps) {
  const [packages, setPackages] = useState<PackageEntry[]>(
    stepData?.packages || [{ name: "", destination: "", duration: "", price: "" }]
  );
  const [error, setError] = useState<string | null>(null);

  const addPackage = () => {
    setPackages([...packages, { name: "", destination: "", duration: "", price: "" }]);
    setError(null);
  };

  const removePackage = (index: number) => {
    if (packages.length > 1) {
      setPackages(packages.filter((_, i) => i !== index));
    }
  };

  const updatePackage = (index: number, field: keyof PackageEntry, value: string) => {
    const updated = [...packages];
    updated[index][field] = value;
    setPackages(updated);
    setError(null);
  };

  const handleSubmit = () => {
    const validPackages = packages.filter(p => p.name && p.destination);
    if (validPackages.length === 0) {
      setError("Please add at least one package with name and destination");
      return;
    }
    onComplete({ packages: validPackages });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palmtree className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Package Templates</CardTitle>
        </div>
        <CardDescription>Create tour package templates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {packages.map((pkg, index) => (
          <div key={index} className="p-3 border rounded-md space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Package {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePackage(index)}
                disabled={packages.length === 1}
                data-testid={`button-remove-package-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Package Name *"
                value={pkg.name}
                onChange={(e) => updatePackage(index, "name", e.target.value)}
                data-testid={`input-package-name-${index}`}
              />
              <Input
                placeholder="Destination *"
                value={pkg.destination}
                onChange={(e) => updatePackage(index, "destination", e.target.value)}
                data-testid={`input-package-destination-${index}`}
              />
              <Input
                placeholder="Duration (e.g., 5 days)"
                value={pkg.duration}
                onChange={(e) => updatePackage(index, "duration", e.target.value)}
                data-testid={`input-package-duration-${index}`}
              />
              <Input
                placeholder="Starting Price"
                value={pkg.price}
                onChange={(e) => updatePackage(index, "price", e.target.value)}
                data-testid={`input-package-price-${index}`}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addPackage} className="w-full" data-testid="button-add-package">
          <Plus className="h-4 w-4 mr-2" /> Add Package
        </Button>
        {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface VendorEntry {
  name: string;
  type: string;
  contact: string;
}

export function VendorSetupStep({ stepData, onComplete, isPending }: StepProps) {
  const [vendors, setVendors] = useState<VendorEntry[]>(
    stepData?.vendors || [{ name: "", type: "", contact: "" }]
  );

  const addVendor = () => {
    setVendors([...vendors, { name: "", type: "", contact: "" }]);
  };

  const removeVendor = (index: number) => {
    if (vendors.length > 1) {
      setVendors(vendors.filter((_, i) => i !== index));
    }
  };

  const updateVendor = (index: number, field: keyof VendorEntry, value: string) => {
    const updated = [...vendors];
    updated[index][field] = value;
    setVendors(updated);
  };

  const handleSubmit = () => {
    const validVendors = vendors.filter(v => v.name && v.type);
    onComplete({ vendors: validVendors });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Vendor Setup</CardTitle>
        </div>
        <CardDescription>Add partner hotels, transport, and guides (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {vendors.map((vendor, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Vendor Name</Label>
                <Input
                  placeholder="Vendor name"
                  value={vendor.name}
                  onChange={(e) => updateVendor(index, "name", e.target.value)}
                  data-testid={`input-vendor-name-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={vendor.type} onValueChange={(v) => updateVendor(index, "type", v)}>
                  <SelectTrigger data-testid={`select-vendor-type-${index}`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="activity">Activity Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contact</Label>
                <Input
                  placeholder="Phone/Email"
                  value={vendor.contact}
                  onChange={(e) => updateVendor(index, "contact", e.target.value)}
                  data-testid={`input-vendor-contact-${index}`}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeVendor(index)}
              disabled={vendors.length === 1}
              data-testid={`button-remove-vendor-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addVendor} className="w-full" data-testid="button-add-vendor">
          <Plus className="h-4 w-4 mr-2" /> Add Vendor
        </Button>
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
