import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGuard, PermissionGuard } from "@/contexts/admin-context";
import { useState } from "react";
import {
  Plus,
  Save,
  Eye,
  Copy,
  Trash2,
  Star,
  Palette,
  Type,
  Layout,
  FileText,
  Settings,
  Check,
  X,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InvoiceTemplate } from "@shared/schema";

const DEFAULT_TEMPLATE: Partial<InvoiceTemplate> = {
  name: "New Template",
  description: "",
  companyName: "MyBizStream",
  companyTagline: "Enterprise Business Management",
  companyAddress: "123 Business Park, Tech City",
  companyPhone: "+1 (555) 123-4567",
  companyEmail: "billing@mybizstream.app",
  companyWebsite: "www.mybizstream.app",
  logoUrl: "",
  logoPosition: "left",
  primaryColor: "#3B82F6",
  secondaryColor: "#1E293B",
  accentColor: "#10B981",
  headerBgColor: "#F8FAFC",
  tableBgColor: "#FFFFFF",
  tableHeaderBgColor: "#F1F5F9",
  fontFamily: "Arial, sans-serif",
  headerFontSize: "24px",
  bodyFontSize: "14px",
  showLogo: true,
  showCompanyAddress: true,
  showCompanyPhone: true,
  showBillingPeriod: true,
  showPaymentInfo: true,
  showNotes: true,
  showFooter: true,
  showTaxBreakdown: true,
  headerText: "",
  footerText: "Thank you for your business!",
  paymentTerms: "Payment is due within 30 days of invoice date.",
  bankDetails: "",
  termsAndConditions: "",
  invoicePrefix: "INV",
  invoiceNumberFormat: "{PREFIX}-{YEAR}{MONTH}-{NUMBER}",
  customCss: "",
  isDefault: false,
  isActive: true,
};

const FONT_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Helvetica Neue', Helvetica, sans-serif", label: "Helvetica" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", label: "Segoe UI" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Inter', sans-serif", label: "Inter" },
];

function InvoicePreview({ template }: { template: Partial<InvoiceTemplate> }) {
  const primaryColor = template.primaryColor || "#3B82F6";
  const secondaryColor = template.secondaryColor || "#1E293B";
  const accentColor = template.accentColor || "#10B981";
  const headerBgColor = template.headerBgColor || "#F8FAFC";
  const tableBgColor = template.tableBgColor || "#FFFFFF";
  const tableHeaderBgColor = template.tableHeaderBgColor || "#F1F5F9";
  const headerFontSize = template.headerFontSize || "24px";
  const bodyFontSize = template.bodyFontSize || "14px";
  const fontFamily = template.fontFamily || "Arial, sans-serif";

  const sampleData = {
    invoiceNumber: `${template.invoicePrefix || "INV"}-202601-0001`,
    tenantName: "Acme Corporation",
    tenantEmail: "billing@acme.com",
    tenantPhone: "+1 (555) 987-6543",
    tenantAddress: "456 Corporate Blvd, Business City",
    country: "United States",
    status: "pending",
    subtotal: "299.00",
    taxName: "VAT",
    taxRate: "20",
    taxAmount: "59.80",
    totalAmount: "358.80",
    amountPaid: "0.00",
    amountDue: "358.80",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    createdAt: new Date().toLocaleDateString(),
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    periodEnd: new Date().toLocaleDateString(),
    lineItems: [
      { description: "Pro Plan Subscription - Monthly", quantity: 1, amount: "299.00" },
    ],
    notes: "Thank you for being a valued customer.",
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-lg overflow-auto max-h-[600px]"
      style={{ fontFamily }}
    >
      <div className="p-6 space-y-6" style={{ fontSize: bodyFontSize }}>
        <div 
          className="flex justify-between items-start pb-4 border-b-4"
          style={{ 
            backgroundColor: headerBgColor,
            borderColor: primaryColor,
            padding: "24px",
            margin: "-24px",
            marginBottom: "0",
          }}
        >
          <div className={`flex-1 ${template.logoPosition === "center" ? "text-center" : template.logoPosition === "right" ? "text-right" : ""}`}>
            {template.showLogo && template.logoUrl ? (
              <img src={template.logoUrl} alt="Logo" className="h-10 object-contain" />
            ) : template.showLogo ? (
              <div className="flex items-center gap-2" style={{ justifyContent: template.logoPosition === "center" ? "center" : template.logoPosition === "right" ? "flex-end" : "flex-start" }}>
                <div 
                  className="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  B
                </div>
                <span className="text-xl font-bold" style={{ color: secondaryColor }}>
                  {template.companyName || "MyBizStream"}
                </span>
              </div>
            ) : null}
            {template.companyTagline && (
              <p className="text-sm text-gray-500 mt-1">{template.companyTagline}</p>
            )}
          </div>
          <div className="text-right">
            <h1 
              className="font-bold"
              style={{ fontSize: headerFontSize, color: primaryColor }}
            >
              INVOICE
            </h1>
            <p className="text-gray-500 text-sm">{sampleData.invoiceNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-6">
          <div>
            <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Bill To</p>
            <p className="font-semibold">{sampleData.tenantName}</p>
            <p className="text-sm text-gray-600">{sampleData.tenantEmail}</p>
            <p className="text-sm text-gray-600">{sampleData.tenantPhone}</p>
            <p className="text-sm text-gray-600">{sampleData.tenantAddress}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-gray-500 font-semibold mb-2">From</p>
            <p className="font-semibold">{template.companyName}</p>
            {template.showCompanyPhone && <p className="text-sm text-gray-600">{template.companyPhone}</p>}
            {template.companyEmail && <p className="text-sm text-gray-600">{template.companyEmail}</p>}
            {template.showCompanyAddress && <p className="text-sm text-gray-600">{template.companyAddress}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 px-4 rounded-lg" style={{ backgroundColor: headerBgColor }}>
          <div>
            <p className="text-xs uppercase text-gray-500 font-semibold">Invoice Date</p>
            <p className="font-medium">{sampleData.createdAt}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500 font-semibold">Due Date</p>
            <p className="font-medium">{sampleData.dueDate}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500 font-semibold">Status</p>
            <span 
              className="inline-block px-2 py-1 rounded text-xs font-semibold"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              Pending
            </span>
          </div>
        </div>

        {template.showBillingPeriod && (
          <div 
            className="py-3 px-4 rounded-r-lg border-l-4"
            style={{ backgroundColor: `${primaryColor}10`, borderColor: primaryColor }}
          >
            <p className="text-xs font-semibold uppercase" style={{ color: primaryColor }}>Billing Period</p>
            <p className="text-sm">{sampleData.periodStart} - {sampleData.periodEnd}</p>
          </div>
        )}

        <table className="w-full border-collapse" style={{ backgroundColor: tableBgColor }}>
          <thead>
            <tr style={{ backgroundColor: tableHeaderBgColor }}>
              <th className="text-left py-3 px-4 text-xs uppercase font-semibold text-gray-600">#</th>
              <th className="text-left py-3 px-4 text-xs uppercase font-semibold text-gray-600">Description</th>
              <th className="text-center py-3 px-4 text-xs uppercase font-semibold text-gray-600">Qty</th>
              <th className="text-right py-3 px-4 text-xs uppercase font-semibold text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.lineItems.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-3 px-4">{idx + 1}</td>
                <td className="py-3 px-4">{item.description}</td>
                <td className="py-3 px-4 text-center">{item.quantity}</td>
                <td className="py-3 px-4 text-right font-mono">${item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 p-4 rounded-lg" style={{ backgroundColor: headerBgColor }}>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span>Subtotal</span>
              <span className="font-mono">${sampleData.subtotal}</span>
            </div>
            {template.showTaxBreakdown && (
              <div className="flex justify-between py-2 text-gray-600">
                <span>{sampleData.taxName} ({sampleData.taxRate}%)</span>
                <span className="font-mono">${sampleData.taxAmount}</span>
              </div>
            )}
            <div 
              className="flex justify-between py-3 mt-2 border-t-2 font-bold"
              style={{ borderColor: primaryColor }}
            >
              <span>Total</span>
              <span className="font-mono">${sampleData.totalAmount}</span>
            </div>
            {template.showPaymentInfo && (
              <>
                <div className="flex justify-between py-1 text-sm text-green-600">
                  <span>Paid</span>
                  <span className="font-mono">${sampleData.amountPaid}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-red-600 font-semibold">
                  <span>Amount Due</span>
                  <span className="font-mono">${sampleData.amountDue}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {template.showNotes && sampleData.notes && (
          <div className="py-4 px-4 rounded-lg border-l-4 bg-amber-50 border-amber-400">
            <p className="text-xs font-semibold uppercase text-amber-700">Notes</p>
            <p className="text-sm text-amber-800">{sampleData.notes}</p>
          </div>
        )}

        {template.paymentTerms && (
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-700">Payment Terms:</p>
            <p>{template.paymentTerms}</p>
          </div>
        )}

        {template.showFooter && (
          <div className="pt-6 mt-6 border-t border-gray-200 text-center">
            <p className="font-semibold" style={{ color: secondaryColor }}>{template.footerText}</p>
            {template.companyWebsite && (
              <p className="text-sm text-gray-500 mt-1">{template.companyWebsite}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateEditorDialog({ 
  open, 
  onClose, 
  template,
  isNew = false,
}: { 
  open: boolean; 
  onClose: () => void; 
  template: Partial<InvoiceTemplate> | null;
  isNew?: boolean;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InvoiceTemplate>>(
    template || DEFAULT_TEMPLATE
  );

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InvoiceTemplate>) => {
      return await apiRequest("POST", "/api/platform-admin/billing/invoice-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/invoice-templates"] });
      toast({ title: "Template created successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InvoiceTemplate>) => {
      return await apiRequest("PATCH", `/api/platform-admin/billing/invoice-templates/${template?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/invoice-templates"] });
      toast({ title: "Template updated successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (isNew) {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const updateField = (field: keyof InvoiceTemplate, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle data-testid="text-editor-title">
            {isNew ? "Create Invoice Template" : "Edit Invoice Template"}
          </DialogTitle>
          <DialogDescription>
            Customize your invoice appearance with live preview
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6">
          <div className="overflow-auto pr-2">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general" data-testid="tab-general">
                  <Settings className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="colors" data-testid="tab-colors">
                  <Palette className="h-4 w-4 mr-2" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="typography" data-testid="tab-typography">
                  <Type className="h-4 w-4 mr-2" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="content" data-testid="tab-content">
                  <FileText className="h-4 w-4 mr-2" />
                  Content
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Template name"
                      data-testid="input-template-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description || ""}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Template description"
                      data-testid="input-template-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={formData.companyName || ""}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      data-testid="input-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Tagline</Label>
                    <Input
                      value={formData.companyTagline || ""}
                      onChange={(e) => updateField("companyTagline", e.target.value)}
                      data-testid="input-company-tagline"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Address</Label>
                    <Textarea
                      value={formData.companyAddress || ""}
                      onChange={(e) => updateField("companyAddress", e.target.value)}
                      data-testid="input-company-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.companyPhone || ""}
                        onChange={(e) => updateField("companyPhone", e.target.value)}
                        data-testid="input-company-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={formData.companyEmail || ""}
                        onChange={(e) => updateField("companyEmail", e.target.value)}
                        data-testid="input-company-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={formData.companyWebsite || ""}
                      onChange={(e) => updateField("companyWebsite", e.target.value)}
                      data-testid="input-company-website"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={formData.logoUrl || ""}
                      onChange={(e) => updateField("logoUrl", e.target.value)}
                      placeholder="https://..."
                      data-testid="input-logo-url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo Position</Label>
                    <Select
                      value={formData.logoPosition || "left"}
                      onValueChange={(v) => updateField("logoPosition", v)}
                    >
                      <SelectTrigger data-testid="select-logo-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.primaryColor || "#3B82F6"}
                        onChange={(e) => updateField("primaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-primary-color"
                      />
                      <Input
                        value={formData.primaryColor || "#3B82F6"}
                        onChange={(e) => updateField("primaryColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.secondaryColor || "#1E293B"}
                        onChange={(e) => updateField("secondaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-secondary-color"
                      />
                      <Input
                        value={formData.secondaryColor || "#1E293B"}
                        onChange={(e) => updateField("secondaryColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.accentColor || "#10B981"}
                        onChange={(e) => updateField("accentColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-accent-color"
                      />
                      <Input
                        value={formData.accentColor || "#10B981"}
                        onChange={(e) => updateField("accentColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Header Background</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.headerBgColor || "#F8FAFC"}
                        onChange={(e) => updateField("headerBgColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-header-bg-color"
                      />
                      <Input
                        value={formData.headerBgColor || "#F8FAFC"}
                        onChange={(e) => updateField("headerBgColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Table Background</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.tableBgColor || "#FFFFFF"}
                        onChange={(e) => updateField("tableBgColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-table-bg-color"
                      />
                      <Input
                        value={formData.tableBgColor || "#FFFFFF"}
                        onChange={(e) => updateField("tableBgColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Table Header Background</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.tableHeaderBgColor || "#F1F5F9"}
                        onChange={(e) => updateField("tableHeaderBgColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-table-header-bg-color"
                      />
                      <Input
                        value={formData.tableHeaderBgColor || "#F1F5F9"}
                        onChange={(e) => updateField("tableHeaderBgColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="typography" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={formData.fontFamily || "Arial, sans-serif"}
                    onValueChange={(v) => updateField("fontFamily", v)}
                  >
                    <SelectTrigger data-testid="select-font-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Header Font Size</Label>
                    <Input
                      value={formData.headerFontSize || "24px"}
                      onChange={(e) => updateField("headerFontSize", e.target.value)}
                      data-testid="input-header-font-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body Font Size</Label>
                    <Input
                      value={formData.bodyFontSize || "14px"}
                      onChange={(e) => updateField("bodyFontSize", e.target.value)}
                      data-testid="input-body-font-size"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-4">Section Visibility</h4>
                  <div className="space-y-3">
                    {[
                      { key: "showLogo", label: "Show Logo" },
                      { key: "showCompanyAddress", label: "Show Company Address" },
                      { key: "showCompanyPhone", label: "Show Company Phone" },
                      { key: "showBillingPeriod", label: "Show Billing Period" },
                      { key: "showPaymentInfo", label: "Show Payment Info" },
                      { key: "showNotes", label: "Show Notes Section" },
                      { key: "showFooter", label: "Show Footer" },
                      { key: "showTaxBreakdown", label: "Show Tax Breakdown" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label>{label}</Label>
                        <Switch
                          checked={formData[key as keyof InvoiceTemplate] as boolean}
                          onCheckedChange={(v) => updateField(key as keyof InvoiceTemplate, v)}
                          data-testid={`switch-${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Header Text (optional)</Label>
                  <Textarea
                    value={formData.headerText || ""}
                    onChange={(e) => updateField("headerText", e.target.value)}
                    placeholder="Custom header text..."
                    data-testid="input-header-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Footer Text</Label>
                  <Input
                    value={formData.footerText || ""}
                    onChange={(e) => updateField("footerText", e.target.value)}
                    data-testid="input-footer-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Textarea
                    value={formData.paymentTerms || ""}
                    onChange={(e) => updateField("paymentTerms", e.target.value)}
                    placeholder="Payment is due within..."
                    data-testid="input-payment-terms"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Details</Label>
                  <Textarea
                    value={formData.bankDetails || ""}
                    onChange={(e) => updateField("bankDetails", e.target.value)}
                    placeholder="Bank account details..."
                    data-testid="input-bank-details"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terms and Conditions</Label>
                  <Textarea
                    value={formData.termsAndConditions || ""}
                    onChange={(e) => updateField("termsAndConditions", e.target.value)}
                    placeholder="Terms and conditions..."
                    data-testid="input-terms-conditions"
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-4">Invoice Numbering</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Prefix</Label>
                      <Input
                        value={formData.invoicePrefix || "INV"}
                        onChange={(e) => updateField("invoicePrefix", e.target.value)}
                        data-testid="input-invoice-prefix"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number Format</Label>
                      <Input
                        value={formData.invoiceNumberFormat || "{PREFIX}-{YEAR}{MONTH}-{NUMBER}"}
                        onChange={(e) => updateField("invoiceNumberFormat", e.target.value)}
                        data-testid="input-invoice-format"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Available placeholders: {"{PREFIX}"}, {"{YEAR}"}, {"{MONTH}"}, {"{DAY}"}, {"{NUMBER}"}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Custom CSS (Advanced)</h4>
                  <Textarea
                    value={formData.customCss || ""}
                    onChange={(e) => updateField("customCss", e.target.value)}
                    placeholder="/* Custom CSS styles */"
                    className="font-mono text-sm"
                    rows={4}
                    data-testid="input-custom-css"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </h3>
              <Badge variant="secondary">Sample Data</Badge>
            </div>
            <div className="flex-1 overflow-auto border rounded-lg bg-gray-100 p-4">
              <InvoicePreview template={formData} />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-template">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-template"
          >
            {(createMutation.isPending || updateMutation.isPending) ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isNew ? "Create Template" : "Save Changes"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InvoiceTemplatesPage() {
  const { toast } = useToast();
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);

  const { data: templates, isLoading } = useQuery<InvoiceTemplate[]>({
    queryKey: ["/api/platform-admin/billing/invoice-templates"],
    staleTime: 30 * 1000,
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/platform-admin/billing/invoice-templates/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/invoice-templates"] });
      toast({ title: "Default template updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to set default", description: error.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/platform-admin/billing/invoice-templates/${id}/duplicate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/invoice-templates"] });
      toast({ title: "Template duplicated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to duplicate", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/platform-admin/billing/invoice-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/billing/invoice-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsNewTemplate(true);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: InvoiceTemplate) => {
    setSelectedTemplate(template);
    setIsNewTemplate(false);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
    setIsNewTemplate(false);
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <PermissionGuard permission="manage_billing">
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PermissionGuard>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <PermissionGuard permission="manage_billing">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-invoice-templates-title">
                Invoice Templates
              </h1>
              <p className="text-muted-foreground">
                Create and manage custom invoice designs
              </p>
            </div>
            <Button onClick={handleNewTemplate} data-testid="button-new-template">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Available Templates
              </CardTitle>
              <CardDescription>
                {templates?.length || 0} template{templates?.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!templates || templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No invoice templates created yet.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleNewTemplate}
                    data-testid="button-create-first-template"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first template
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Primary Color</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {template.name}
                            {template.isDefault && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.description || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: template.primaryColor || "#3B82F6" }}
                            />
                            <span className="text-xs font-mono">{template.primaryColor}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.isActive ? (
                            <Badge variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <X className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTemplate(template)}
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!template.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDefaultMutation.mutate(template.id)}
                                disabled={setDefaultMutation.isPending}
                                data-testid={`button-set-default-${template.id}`}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateMutation.mutate(template.id)}
                              disabled={duplicateMutation.isPending}
                              data-testid={`button-duplicate-${template.id}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!template.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate(template.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <TemplateEditorDialog
            open={showEditor}
            onClose={handleCloseEditor}
            template={selectedTemplate}
            isNew={isNewTemplate}
          />
        </div>
      </PermissionGuard>
    </AdminGuard>
  );
}
