import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Truck, Users, MapPin, Calculator } from "lucide-react";

interface StepProps {
  stepData: Record<string, any>;
  onComplete: (data: any) => void;
  isPending: boolean;
}

interface VehicleEntry {
  type: string;
  registrationNumber: string;
  capacity: string;
}

export function FleetDetailsStep({ stepData, onComplete, isPending }: StepProps) {
  const [vehicles, setVehicles] = useState<VehicleEntry[]>(
    stepData?.vehicles || [{ type: "", registrationNumber: "", capacity: "" }]
  );
  const [error, setError] = useState<string | null>(null);

  const addVehicle = () => {
    setVehicles([...vehicles, { type: "", registrationNumber: "", capacity: "" }]);
    setError(null);
  };

  const removeVehicle = (index: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  const updateVehicle = (index: number, field: keyof VehicleEntry, value: string) => {
    const updated = [...vehicles];
    updated[index][field] = value;
    setVehicles(updated);
    setError(null);
  };

  const handleSubmit = () => {
    const validVehicles = vehicles.filter(v => v.type && v.registrationNumber);
    if (validVehicles.length === 0) {
      setError("Please add at least one vehicle with type and registration number");
      return;
    }
    onComplete({ vehicles: validVehicles });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Fleet Details</CardTitle>
        </div>
        <CardDescription>Add your vehicles and fleet information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {vehicles.map((vehicle, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Vehicle Type *</Label>
                <Select value={vehicle.type} onValueChange={(v) => updateVehicle(index, "type", v)}>
                  <SelectTrigger data-testid={`select-vehicle-type-${index}`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="tempo">Tempo</SelectItem>
                    <SelectItem value="container">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Registration # *</Label>
                <Input
                  placeholder="e.g., MH01AB1234"
                  value={vehicle.registrationNumber}
                  onChange={(e) => updateVehicle(index, "registrationNumber", e.target.value)}
                  data-testid={`input-vehicle-reg-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Capacity (kg)</Label>
                <Input
                  placeholder="e.g., 1000"
                  value={vehicle.capacity}
                  onChange={(e) => updateVehicle(index, "capacity", e.target.value)}
                  data-testid={`input-vehicle-capacity-${index}`}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeVehicle(index)}
              disabled={vehicles.length === 1}
              data-testid={`button-remove-vehicle-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addVehicle} className="w-full" data-testid="button-add-vehicle">
          <Plus className="h-4 w-4 mr-2" /> Add Vehicle
        </Button>
        {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface DriverEntry {
  name: string;
  phone: string;
  licenseNumber: string;
}

export function DriverOnboardingStep({ stepData, onComplete, isPending }: StepProps) {
  const [drivers, setDrivers] = useState<DriverEntry[]>(
    stepData?.drivers || [{ name: "", phone: "", licenseNumber: "" }]
  );

  const addDriver = () => {
    setDrivers([...drivers, { name: "", phone: "", licenseNumber: "" }]);
  };

  const removeDriver = (index: number) => {
    if (drivers.length > 1) {
      setDrivers(drivers.filter((_, i) => i !== index));
    }
  };

  const updateDriver = (index: number, field: keyof DriverEntry, value: string) => {
    const updated = [...drivers];
    updated[index][field] = value;
    setDrivers(updated);
  };

  const handleSubmit = () => {
    const validDrivers = drivers.filter(d => d.name && d.phone);
    onComplete({ drivers: validDrivers });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Driver Onboarding</CardTitle>
        </div>
        <CardDescription>Add driver profiles and license details (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {drivers.map((driver, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  placeholder="Driver name"
                  value={driver.name}
                  onChange={(e) => updateDriver(index, "name", e.target.value)}
                  data-testid={`input-driver-name-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={driver.phone}
                  onChange={(e) => updateDriver(index, "phone", e.target.value)}
                  data-testid={`input-driver-phone-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">License #</Label>
                <Input
                  placeholder="License number"
                  value={driver.licenseNumber}
                  onChange={(e) => updateDriver(index, "licenseNumber", e.target.value)}
                  data-testid={`input-driver-license-${index}`}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeDriver(index)}
              disabled={drivers.length === 1}
              data-testid={`button-remove-driver-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addDriver} className="w-full" data-testid="button-add-driver">
          <Plus className="h-4 w-4 mr-2" /> Add Driver
        </Button>
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

const serviceAreasSchema = z.object({
  primaryCity: z.string().min(2, "Primary city is required"),
  serviceCities: z.string().optional(),
  pincodes: z.string().optional(),
});

export function ServiceAreasStep({ stepData, onComplete, isPending }: StepProps) {
  const form = useForm({
    resolver: zodResolver(serviceAreasSchema),
    defaultValues: {
      primaryCity: stepData?.primaryCity || "",
      serviceCities: stepData?.serviceCities || "",
      pincodes: stepData?.pincodes || "",
    },
  });

  const handleSubmit = (data: z.infer<typeof serviceAreasSchema>) => {
    onComplete(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Service Areas</CardTitle>
        </div>
        <CardDescription>Define your delivery zones and regions</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="primaryCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary City *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mumbai" {...field} data-testid="input-primary-city" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceCities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Service Cities</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter cities separated by commas (e.g., Pune, Nashik, Nagpur)" 
                      {...field} 
                      data-testid="input-service-cities" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pincodes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviceable Pincodes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter pincodes separated by commas" 
                      {...field} 
                      data-testid="input-pincodes" 
                    />
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

const pricingRulesSchema = z.object({
  basePrice: z.string().min(1, "Base price is required"),
  pricePerKm: z.string().min(1, "Price per km is required"),
  pricePerKg: z.string().optional(),
  minimumCharge: z.string().optional(),
});

export function PricingRulesStep({ stepData, onComplete, isPending }: StepProps) {
  const form = useForm({
    resolver: zodResolver(pricingRulesSchema),
    defaultValues: {
      basePrice: stepData?.basePrice || "",
      pricePerKm: stepData?.pricePerKm || "",
      pricePerKg: stepData?.pricePerKg || "",
      minimumCharge: stepData?.minimumCharge || "",
    },
  });

  const handleSubmit = (data: z.infer<typeof pricingRulesSchema>) => {
    onComplete(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Pricing Rules</CardTitle>
        </div>
        <CardDescription>Set up distance and weight-based pricing</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 50" {...field} data-testid="input-base-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per KM *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10" {...field} data-testid="input-price-per-km" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per KG</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 5" {...field} data-testid="input-price-per-kg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Charge</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100" {...field} data-testid="input-minimum-charge" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-continue">
              Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
