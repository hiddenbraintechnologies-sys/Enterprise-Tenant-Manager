import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin, AdminGuard, PermissionGuard } from "@/contexts/admin-context";
import { useState } from "react";
import {
  Calculator,
  FileText,
  Settings,
  TrendingUp,
  Globe,
  Building2,
  Download,
  Plus,
  Pencil,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Filter,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TaxRule {
  id: string;
  country: string;
  businessType: string;
  taxCategory: string;
  taxName: string;
  taxCode?: string;
  taxRate: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

interface TaxReport {
  id: string;
  reportType: string;
  country?: string;
  periodStart: string;
  periodEnd: string;
  totalInvoices: number;
  totalBaseAmount: string;
  totalTaxCollected: string;
  currency: string;
  breakdown: any;
  status: string;
  generatedAt: string;
  filedAt?: string;
  notes?: string;
}

interface TaxSummary {
  period: string;
  periodStart: string;
  periodEnd: string;
  totalInvoices: number;
  totalBaseAmount: number;
  totalTaxCollected: number;
  activeTaxRules: number;
  byCountry: Record<string, { invoices: number; base: number; tax: number; currency: string }>;
  byTaxType: Record<string, { invoices: number; amount: number }>;
}

const COUNTRIES = [
  { value: "india", label: "India", flag: "IN" },
  { value: "uk", label: "United Kingdom", flag: "GB" },
  { value: "uae", label: "UAE", flag: "AE" },
  { value: "malaysia", label: "Malaysia", flag: "MY" },
  { value: "singapore", label: "Singapore", flag: "SG" },
];

const BUSINESS_TYPES = [
  { value: "general", label: "General" },
  { value: "pg_hostel", label: "PG/Hostel" },
  { value: "salon", label: "Salon" },
  { value: "gym", label: "Gym" },
  { value: "coaching", label: "Coaching" },
  { value: "clinic", label: "Clinic" },
  { value: "diagnostics", label: "Diagnostics" },
];

const TAX_CATEGORIES = [
  { value: "standard", label: "Standard Rate" },
  { value: "reduced", label: "Reduced Rate" },
  { value: "zero", label: "Zero-Rated" },
  { value: "exempt", label: "Exempt" },
  { value: "reverse_charge", label: "Reverse Charge" },
];

function TaxRuleDialog({
  rule,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  rule: TaxRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState({
    country: rule?.country || "india",
    businessType: rule?.businessType || "general",
    taxCategory: rule?.taxCategory || "standard",
    taxName: rule?.taxName || "",
    taxCode: rule?.taxCode || "",
    taxRate: rule?.taxRate || "",
    description: rule?.description || "",
    effectiveFrom: rule?.effectiveFrom ? new Date(rule.effectiveFrom).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    isActive: rule?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      effectiveFrom: new Date(formData.effectiveFrom),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Tax Rule" : "Create Tax Rule"}</DialogTitle>
          <DialogDescription>
            {rule ? "Modify the tax rule configuration" : "Add a new tax rule for a country and business type"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.country}
                onValueChange={(v) => setFormData({ ...formData, country: v })}
                disabled={!!rule}
              >
                <SelectTrigger data-testid="select-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select
                value={formData.businessType}
                onValueChange={(v) => setFormData({ ...formData, businessType: v })}
                disabled={!!rule}
              >
                <SelectTrigger data-testid="select-business-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax Name</Label>
              <Input
                placeholder="e.g., GST, VAT"
                value={formData.taxName}
                onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                required
                data-testid="input-tax-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 18.00"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                required
                data-testid="input-tax-rate"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax Code</Label>
              <Input
                placeholder="e.g., HSN/SAC code"
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                data-testid="input-tax-code"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.taxCategory}
                onValueChange={(v) => setFormData({ ...formData, taxCategory: v })}
              >
                <SelectTrigger data-testid="select-tax-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Effective From</Label>
            <Input
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
              required
              data-testid="input-effective-from"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description of this tax rule"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-tax-rule">
              {isSaving ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GenerateReportDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: any) => void;
  isGenerating: boolean;
}) {
  const [formData, setFormData] = useState({
    reportType: "monthly",
    country: "",
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    periodEnd: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Generate Tax Report</DialogTitle>
          <DialogDescription>
            Create a new tax report for a specific period
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={formData.reportType}
              onValueChange={(v) => setFormData({ ...formData, reportType: v })}
            >
              <SelectTrigger data-testid="select-report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Country (Optional)</Label>
            <Select
              value={formData.country}
              onValueChange={(v) => setFormData({ ...formData, country: v })}
            >
              <SelectTrigger data-testid="select-report-country">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                required
                data-testid="input-period-start"
              />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                required
                data-testid="input-period-end"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating} data-testid="button-generate-report">
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaxManagementContent() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { data: summary, isLoading: loadingSummary } = useQuery<TaxSummary>({
    queryKey: ["/api/platform-admin/tax/summary"],
  });

  const { data: rules = [], isLoading: loadingRules } = useQuery<TaxRule[]>({
    queryKey: ["/api/platform-admin/tax/rules", countryFilter],
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery<TaxReport[]>({
    queryKey: ["/api/platform-admin/tax/reports"],
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/platform-admin/tax/rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tax/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tax/summary"] });
      setShowRuleDialog(false);
      toast({ title: "Tax rule created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create tax rule", variant: "destructive" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/platform-admin/tax/rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tax/rules"] });
      setShowRuleDialog(false);
      setEditingRule(null);
      toast({ title: "Tax rule updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update tax rule", variant: "destructive" });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/platform-admin/tax/reports/generate", {
        ...data,
        country: data.country === "all" ? undefined : data.country,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tax/reports"] });
      setShowReportDialog(false);
      toast({ title: "Tax report generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate tax report", variant: "destructive" });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/platform-admin/tax/seed-defaults", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tax/rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tax/summary"] });
      toast({ title: "Default tax rules seeded successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to seed tax rules", variant: "destructive" });
    },
  });

  const handleExportReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem("mybizstream_admin_token");
      const response = await fetch(`/api/platform-admin/tax/reports/${reportId}/export?format=csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-report-${reportId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Report exported successfully" });
    } catch {
      toast({ title: "Failed to export report", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number | string, currency = "USD") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "-";
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
    }).format(num);
  };

  const filteredRules = countryFilter === "all" 
    ? rules 
    : rules.filter(r => r.country === countryFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tax Management</h1>
          <p className="text-muted-foreground">Configure tax rules and generate reports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSuperAdmin && rules.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
              data-testid="button-seed-defaults"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {seedDefaultsMutation.isPending ? "Seeding..." : "Seed Default Rules"}
            </Button>
          )}
          {isSuperAdmin && (
            <Button onClick={() => setShowReportDialog(true)} data-testid="button-generate-report">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-tax-management">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">Tax Rules</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loadingSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tax Collected</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-tax">
                      {formatCurrency(summary?.totalTaxCollected || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {summary?.period || "This month"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Base Amount</CardTitle>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-base-amount">
                      {formatCurrency(summary?.totalBaseAmount || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Taxable revenue</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-invoice-count">
                      {summary?.totalInvoices || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Processed this period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-active-rules">
                      {summary?.activeTaxRules || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Tax configurations</p>
                  </CardContent>
                </Card>
              </div>

              {summary?.byCountry && Object.keys(summary.byCountry).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tax Collection by Country</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-right">Invoices</TableHead>
                          <TableHead className="text-right">Base Amount</TableHead>
                          <TableHead className="text-right">Tax Collected</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(summary.byCountry).map(([country, data]) => (
                          <TableRow key={country}>
                            <TableCell className="font-medium capitalize">{country}</TableCell>
                            <TableCell className="text-right">{data.invoices}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.base, data.currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.tax, data.currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {summary?.byTaxType && Object.keys(summary.byTaxType).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tax Collection by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tax Type</TableHead>
                          <TableHead className="text-right">Invoices</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(summary.byTaxType).map(([taxType, data]) => (
                          <TableRow key={taxType}>
                            <TableCell className="font-medium">{taxType}</TableCell>
                            <TableCell className="text-right">{data.invoices}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-40" data-testid="select-country-filter">
                  <SelectValue placeholder="Filter by country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <Button onClick={() => { setEditingRule(null); setShowRuleDialog(true); }} data-testid="button-add-rule">
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Rule
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              {loadingRules ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tax rules configured</p>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      onClick={() => seedDefaultsMutation.mutate()}
                      disabled={seedDefaultsMutation.isPending}
                    >
                      Seed default rules for all countries
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Tax Name</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map((rule) => (
                      <TableRow key={rule.id} data-testid={`row-tax-rule-${rule.id}`}>
                        <TableCell className="font-medium capitalize">{rule.country}</TableCell>
                        <TableCell className="capitalize">{rule.businessType.replace("_", " ")}</TableCell>
                        <TableCell>
                          {rule.taxName}
                          {rule.taxCode && <span className="text-muted-foreground text-xs ml-1">({rule.taxCode})</span>}
                        </TableCell>
                        <TableCell>{parseFloat(rule.taxRate)}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {rule.taxCategory?.replace("_", " ") || "standard"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rule.isActive ? (
                            <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                          ) : (
                            <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
                          )}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingRule(rule); setShowRuleDialog(true); }}
                              data-testid={`button-edit-rule-${rule.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Tax Reports</CardTitle>
              <CardDescription>View and export tax reports by period</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tax reports generated yet</p>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowReportDialog(true)}
                    >
                      Generate your first report
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                      <TableHead className="text-right">Tax Collected</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                        <TableCell className="font-medium capitalize">{report.reportType}</TableCell>
                        <TableCell>
                          {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="capitalize">{report.country || "All"}</TableCell>
                        <TableCell className="text-right">{report.totalInvoices}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(report.totalTaxCollected, report.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={report.status === "filed" ? "default" : report.status === "finalized" ? "secondary" : "outline"}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExportReport(report.id)}
                            data-testid={`button-export-report-${report.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaxRuleDialog
        rule={editingRule}
        open={showRuleDialog}
        onOpenChange={(open) => {
          setShowRuleDialog(open);
          if (!open) setEditingRule(null);
        }}
        onSave={(data) => {
          if (editingRule) {
            updateRuleMutation.mutate({ id: editingRule.id, data });
          } else {
            createRuleMutation.mutate(data);
          }
        }}
        isSaving={createRuleMutation.isPending || updateRuleMutation.isPending}
      />

      <GenerateReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        onGenerate={(data) => generateReportMutation.mutate(data)}
        isGenerating={generateReportMutation.isPending}
      />
    </div>
  );
}

export default function TaxManagement() {
  return (
    <AdminGuard>
      <PermissionGuard permission="manage_billing">
        <TaxManagementContent />
      </PermissionGuard>
    </AdminGuard>
  );
}
