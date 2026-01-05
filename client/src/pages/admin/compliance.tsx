import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, PoundSterling, CheckCircle, AlertCircle, Search, Building2, FileText } from "lucide-react";
import { AdminGuard, PermissionGuard, useAdmin } from "@/contexts/admin-context";

interface GstTenantData {
  tenant: {
    id: string;
    name: string;
    businessType: string;
    status: string;
    subscriptionTier: string;
    email: string;
  };
  gst: {
    gstin: string;
    legalName: string;
    stateCode: string;
    gstType: string;
    isEInvoiceEnabled: boolean;
    isActive: boolean;
  } | null;
}

interface VatTenantData {
  tenant: {
    id: string;
    name: string;
    businessType: string;
    status: string;
    subscriptionTier: string;
    email: string;
  };
  vat: {
    vatNumber: string;
    businessName: string;
    postcode: string;
    vatScheme: string;
    mtdEnabled: boolean;
    isActive: boolean;
  } | null;
}

interface GstResponse {
  total: number;
  configured: number;
  tenants: GstTenantData[];
}

interface VatResponse {
  total: number;
  configured: number;
  tenants: VatTenantData[];
}

const INDIAN_STATES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

function GstComplianceTab() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<GstResponse>({
    queryKey: ["/api/platform-admin/compliance/gst/tenants"],
  });

  const filteredTenants = data?.tenants?.filter(t => 
    t.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.gst?.gstin?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total India Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GST Configured</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.configured || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{(data?.total || 0) - (data?.configured || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GST Registrations</CardTitle>
          <CardDescription>India tenant GST compliance status</CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
              data-testid="input-search-gst"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>E-Invoice</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? `No tenants found matching "${searchQuery}"` : "No GST registrations found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((item) => (
                  <TableRow key={item.tenant.id} data-testid={`row-gst-${item.tenant.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.tenant.name}</div>
                        <div className="text-sm text-muted-foreground">{item.tenant.businessType}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.gst ? (
                        <code className="text-sm bg-muted px-2 py-1 rounded">{item.gst.gstin}</code>
                      ) : (
                        <span className="text-muted-foreground">Not configured</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.gst ? (
                        <span>{INDIAN_STATES[item.gst.stateCode] || item.gst.stateCode}</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.gst ? (
                        <Badge variant="secondary">{item.gst.gstType}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.gst?.isEInvoiceEnabled ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.gst?.isActive ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function VatComplianceTab() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery<VatResponse>({
    queryKey: ["/api/platform-admin/compliance/vat/tenants"],
  });

  const filteredTenants = data?.tenants?.filter(t => 
    t.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.vat?.vatNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total UK Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Registered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.configured || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{(data?.total || 0) - (data?.configured || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VAT Registrations</CardTitle>
          <CardDescription>UK tenant VAT compliance status</CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or VAT number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
              data-testid="input-search-vat"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>VAT Number</TableHead>
                <TableHead>Postcode</TableHead>
                <TableHead>Scheme</TableHead>
                <TableHead>MTD</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? `No tenants found matching "${searchQuery}"` : "No VAT registrations found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((item) => (
                  <TableRow key={item.tenant.id} data-testid={`row-vat-${item.tenant.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.tenant.name}</div>
                        <div className="text-sm text-muted-foreground">{item.tenant.businessType}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.vat ? (
                        <code className="text-sm bg-muted px-2 py-1 rounded">{item.vat.vatNumber}</code>
                      ) : (
                        <span className="text-muted-foreground">Not configured</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.vat?.postcode || "-"}
                    </TableCell>
                    <TableCell>
                      {item.vat ? (
                        <Badge variant="secondary">{item.vat.vatScheme}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.vat?.mtdEnabled ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.vat?.isActive ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceContent() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-compliance-title">
          Compliance Management
        </h1>
        <p className="text-muted-foreground">
          Manage country-specific tax compliance for all tenants
        </p>
      </div>

      <Tabs defaultValue="india" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="india" className="gap-2" data-testid="tab-india-compliance">
            <IndianRupee className="h-4 w-4" />
            India (GST)
          </TabsTrigger>
          <TabsTrigger value="uk" className="gap-2" data-testid="tab-uk-compliance">
            <PoundSterling className="h-4 w-4" />
            UK (VAT)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="india" className="mt-6">
          <GstComplianceTab />
        </TabsContent>
        <TabsContent value="uk" className="mt-6">
          <VatComplianceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminCompliance() {
  return (
    <AdminGuard>
      <PermissionGuard permission="read_tenants">
        <ComplianceContent />
      </PermissionGuard>
    </AdminGuard>
  );
}
