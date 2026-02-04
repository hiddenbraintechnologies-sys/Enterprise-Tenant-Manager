import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAdmin } from "@/contexts/admin-context";
import { useState } from "react";
import {
  Globe,
  Search,
  Plus,
  MoreVertical,
  CheckCircle,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RegionConfig {
  id: string;
  countryCode: string;
  countryName: string;
  region: "asia_pacific" | "middle_east" | "europe" | "americas" | "africa";
  status: "enabled" | "disabled";
  registrationEnabled: boolean;
  billingEnabled: boolean;
  compliancePacksEnabled: boolean;
  allowedBusinessTypes: string[] | null;
  defaultCurrency: string;
  defaultTimezone: string;
  taxType: string | null;
  taxRate: string | null;
  taxInclusive: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  dataResidencyRequired: boolean;
  dataResidencyRegion: string | null;
  createdAt: string;
  updatedAt: string;
}

const REGIONS = [
  { value: "asia_pacific", label: "Asia Pacific" },
  { value: "middle_east", label: "Middle East" },
  { value: "europe", label: "Europe" },
  { value: "americas", label: "Americas" },
  { value: "africa", label: "Africa" },
];

const CURRENCIES = [
  { code: "INR", name: "Indian Rupee" },
  { code: "AED", name: "UAE Dirham" },
  { code: "GBP", name: "British Pound" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "ZAR", name: "South African Rand" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "BRL", name: "Brazilian Real" },
];

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (BRT)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (AST)" },
];

import { BUSINESS_TYPE_CONFIG } from "@shared/business-type-config";

// All business types available for Super Admin to enable/disable per region
// Filter only removes legacy aliases (shorter keys that duplicate full keys)
const ALIAS_KEYS = ["pg", "clinic", "salon", "furniture", "logistics", "education"];

const BUSINESS_TYPES = Object.entries(BUSINESS_TYPE_CONFIG)
  .filter(([key]) => !ALIAS_KEYS.includes(key))
  .map(([key, config]) => ({
    key,
    label: config.label,
    modules: config.modules,
  }));

interface CountryOption {
  code: string;
  name: string;
  defaultCurrency: string;
  defaultTimezone: string;
  regionGroup: string;
  taxType: string | null;
  taxRate: string | null;
}

const REGION_GROUP_MAP: Record<string, string> = {
  "Asia Pacific": "asia_pacific",
  "Middle East": "middle_east",
  "Europe": "europe",
  "North America": "americas",
  "South America": "americas",
  "Africa": "africa",
};

interface RegionFormProps {
  region?: RegionConfig | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function RegionForm({ region, onSuccess, onCancel }: RegionFormProps) {
  const { toast } = useToast();
  const isEdit = !!region;
  const [manualEntry, setManualEntry] = useState(false);

  const { data: countries, isLoading: loadingCountries, isError: countriesError } = useQuery<CountryOption[]>({
    queryKey: ["/api/platform-admin/countries"],
    retry: 1,
  });

  const [formData, setFormData] = useState({
    countryCode: region?.countryCode || "",
    countryName: region?.countryName || "",
    region: region?.region || "asia_pacific",
    status: region?.status || "enabled",
    defaultCurrency: region?.defaultCurrency || "USD",
    defaultTimezone: region?.defaultTimezone || "America/New_York",
    registrationEnabled: region?.registrationEnabled ?? true,
    billingEnabled: region?.billingEnabled ?? true,
    compliancePacksEnabled: region?.compliancePacksEnabled ?? true,
    allowedBusinessTypes: region?.allowedBusinessTypes || [] as string[],
    taxType: region?.taxType || "",
    taxRate: region?.taxRate || "",
    taxInclusive: region?.taxInclusive ?? false,
    smsEnabled: region?.smsEnabled ?? true,
    whatsappEnabled: region?.whatsappEnabled ?? true,
    emailEnabled: region?.emailEnabled ?? true,
    dataResidencyRequired: region?.dataResidencyRequired ?? false,
    dataResidencyRegion: region?.dataResidencyRegion || "",
  });

  const toggleBusinessType = (key: string) => {
    setFormData(prev => ({
      ...prev,
      allowedBusinessTypes: prev.allowedBusinessTypes.includes(key)
        ? prev.allowedBusinessTypes.filter(t => t !== key)
        : [...prev.allowedBusinessTypes, key]
    }));
  };

  const selectAllBusinessTypes = () => {
    setFormData(prev => ({
      ...prev,
      allowedBusinessTypes: BUSINESS_TYPES.map(t => t.key)
    }));
  };

  const clearAllBusinessTypes = () => {
    setFormData(prev => ({
      ...prev,
      allowedBusinessTypes: []
    }));
  };

  const handleCountrySelect = (code: string) => {
    const country = countries?.find(c => c.code === code);
    if (country) {
      const regionValue = REGION_GROUP_MAP[country.regionGroup] || "asia_pacific";
      setFormData({
        ...formData,
        countryCode: country.code,
        countryName: country.name,
        defaultCurrency: country.defaultCurrency,
        defaultTimezone: country.defaultTimezone,
        region: regionValue as typeof formData.region,
        taxType: country.taxType || "",
        taxRate: country.taxRate || "",
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/platform-admin/region-configs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/region-configs"] });
      toast({ title: "Region created successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create region", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", `/api/platform-admin/region-configs/${region?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/region-configs"] });
      toast({ title: "Region updated successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update region", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      taxRate: formData.taxRate || null,
      taxType: formData.taxType || null,
      dataResidencyRegion: formData.dataResidencyRegion || null,
      allowedBusinessTypes: formData.allowedBusinessTypes.length > 0 ? formData.allowedBusinessTypes : null,
    };
    if (isEdit) {
      updateMutation.mutate(payload as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const showManualEntry = manualEntry || countriesError || (!loadingCountries && (!countries || countries.length === 0));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Country</Label>
            {!isEdit && !showManualEntry && countries && countries.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-1 text-xs text-muted-foreground"
                onClick={() => setManualEntry(true)}
                data-testid="button-manual-entry"
              >
                Enter manually
              </Button>
            )}
          </div>
          {isEdit ? (
            <Input
              data-testid="input-country-code"
              value={`${formData.countryName} (${formData.countryCode})`}
              disabled
            />
          ) : showManualEntry ? (
            <Input
              data-testid="input-country-code"
              value={formData.countryCode}
              onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
              placeholder="US, IN, GB, AE"
              maxLength={5}
              required
            />
          ) : (
            <Select
              value={formData.countryCode}
              onValueChange={handleCountrySelect}
              disabled={loadingCountries}
            >
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder={loadingCountries ? "Loading..." : "Select a country"} />
              </SelectTrigger>
              <SelectContent>
                {countries?.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="countryName">Country Name</Label>
          <Input
            id="countryName"
            data-testid="input-country-name"
            value={formData.countryName}
            onChange={(e) => setFormData({ ...formData, countryName: e.target.value })}
            placeholder="United States"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Region</Label>
          <Select
            value={formData.region}
            onValueChange={(value) => setFormData({ ...formData, region: value as typeof formData.region })}
          >
            <SelectTrigger data-testid="select-region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as "enabled" | "disabled" })}
          >
            <SelectTrigger data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Default Currency</Label>
          <Select
            value={formData.defaultCurrency}
            onValueChange={(value) => setFormData({ ...formData, defaultCurrency: value })}
          >
            <SelectTrigger data-testid="select-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Timezone</Label>
          <Select
            value={formData.defaultTimezone}
            onValueChange={(value) => setFormData({ ...formData, defaultTimezone: value })}
          >
            <SelectTrigger data-testid="select-timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="taxType">Tax Type</Label>
          <Input
            id="taxType"
            data-testid="input-tax-type"
            value={formData.taxType}
            onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
            placeholder="GST, VAT, etc."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxRate">Tax Rate (%)</Label>
          <Input
            id="taxRate"
            data-testid="input-tax-rate"
            value={formData.taxRate}
            onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
            placeholder="18.00"
            type="number"
            step="0.01"
            min="0"
            max="100"
          />
        </div>
        <div className="flex items-end pb-2">
          <div className="flex items-center gap-2">
            <Switch
              id="taxInclusive"
              data-testid="switch-tax-inclusive"
              checked={formData.taxInclusive}
              onCheckedChange={(checked) => setFormData({ ...formData, taxInclusive: checked })}
            />
            <Label htmlFor="taxInclusive">Tax Inclusive</Label>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <Label className="text-base font-medium">Feature Toggles</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="registrationEnabled">Registration Enabled</Label>
            <Switch
              id="registrationEnabled"
              data-testid="switch-registration"
              checked={formData.registrationEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, registrationEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="billingEnabled">Billing Enabled</Label>
            <Switch
              id="billingEnabled"
              data-testid="switch-billing"
              checked={formData.billingEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, billingEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="compliancePacksEnabled">Compliance Packs</Label>
            <Switch
              id="compliancePacksEnabled"
              data-testid="switch-compliance"
              checked={formData.compliancePacksEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, compliancePacksEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dataResidencyRequired">Data Residency Required</Label>
            <Switch
              id="dataResidencyRequired"
              data-testid="switch-data-residency"
              checked={formData.dataResidencyRequired}
              onCheckedChange={(checked) => setFormData({ ...formData, dataResidencyRequired: checked })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <Label className="text-base font-medium">Communication Channels</Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="smsEnabled">SMS</Label>
            <Switch
              id="smsEnabled"
              data-testid="switch-sms"
              checked={formData.smsEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, smsEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsappEnabled">WhatsApp</Label>
            <Switch
              id="whatsappEnabled"
              data-testid="switch-whatsapp"
              checked={formData.whatsappEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="emailEnabled">Email</Label>
            <Switch
              id="emailEnabled"
              data-testid="switch-email"
              checked={formData.emailEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, emailEnabled: checked })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Business Types Allowed</Label>
            <p className="text-sm text-muted-foreground">
              Select which business types can register in this country ({formData.allowedBusinessTypes.length} selected)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllBusinessTypes}
              data-testid="button-select-all-bt"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAllBusinessTypes}
              data-testid="button-clear-all-bt"
            >
              Clear All
            </Button>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border p-3">
          {BUSINESS_TYPES.map((bt) => (
            <div key={bt.key} className="flex items-start gap-2 py-1">
              <Checkbox
                id={`bt-${bt.key}`}
                checked={formData.allowedBusinessTypes.includes(bt.key)}
                onCheckedChange={() => toggleBusinessType(bt.key)}
                data-testid={`checkbox-bt-${bt.key}`}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor={`bt-${bt.key}`} className="text-sm font-medium cursor-pointer">
                  {bt.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Modules: {bt.modules.slice(0, 3).join(", ")}{bt.modules.length > 3 ? ` +${bt.modules.length - 3} more` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-save-region">
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? "Update Region" : "Create Region"}
        </Button>
      </div>
    </form>
  );
}

function RegionsTable() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionConfig | null>(null);
  const [deleteRegion, setDeleteRegion] = useState<RegionConfig | null>(null);

  const { data: regions, isLoading } = useQuery<RegionConfig[]>({
    queryKey: ["/api/platform-admin/region-configs"],
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "enabled" | "disabled" }) => {
      return apiRequest("PATCH", `/api/platform-admin/region-configs/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/region-configs"] });
      toast({ title: "Region status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/platform-admin/region-configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/region-configs"] });
      toast({ title: "Region deleted successfully" });
      setDeleteRegion(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete region", description: error.message, variant: "destructive" });
    },
  });

  const filteredRegions = regions?.filter((r) => {
    const matchesSearch =
      r.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.countryCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === "all" || r.region === regionFilter;
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesRegion && matchesStatus;
  });

  const handleEdit = (region: RegionConfig) => {
    setEditingRegion(region);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRegion(null);
  };

  const getRegionLabel = (region: string) => {
    return REGIONS.find((r) => r.value === region)?.label || region;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-regions"
            />
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-40" data-testid="select-filter-region">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-region">
          <Plus className="h-4 w-4 mr-2" />
          Add Region
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredRegions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No regions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegions?.map((region) => (
                  <TableRow key={region.id} data-testid={`row-region-${region.countryCode}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{region.countryCode}</Badge>
                        <span className="font-medium">{region.countryName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{getRegionLabel(region.region)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{region.defaultCurrency}</Badge>
                    </TableCell>
                    <TableCell>
                      {region.taxType ? (
                        <span className="text-sm">
                          {region.taxType} {region.taxRate}%
                          {region.taxInclusive && " (incl.)"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {region.registrationEnabled && (
                          <Badge variant="outline">Reg</Badge>
                        )}
                        {region.billingEnabled && (
                          <Badge variant="outline">Bill</Badge>
                        )}
                        {region.smsEnabled && (
                          <Badge variant="outline">SMS</Badge>
                        )}
                        {region.whatsappEnabled && (
                          <Badge variant="outline">WA</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {region.status === "enabled" ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${region.countryCode}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(region)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleStatusMutation.mutate({
                              id: region.id,
                              status: region.status === "enabled" ? "disabled" : "enabled"
                            })}
                          >
                            {region.status === "enabled" ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteRegion(region)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRegion ? "Edit Region" : "Add New Region"}</DialogTitle>
            <DialogDescription>
              {editingRegion
                ? `Update configuration for ${editingRegion.countryName}`
                : "Configure a new country/region for the platform"}
            </DialogDescription>
          </DialogHeader>
          <RegionForm
            region={editingRegion}
            onSuccess={handleCloseForm}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRegion} onOpenChange={(open) => !open && setDeleteRegion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Region</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteRegion?.countryName} ({deleteRegion?.countryCode})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRegion && deleteMutation.mutate(deleteRegion.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RegionsPage() {
  const { isSuperAdmin } = useAdmin();

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Globe className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Region Management</h1>
          <p className="text-muted-foreground">
            Manage countries and regions where the platform operates
          </p>
        </div>
      </div>
      <RegionsTable />
    </div>
  );
}
