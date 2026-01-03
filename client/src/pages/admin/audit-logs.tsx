import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin, AdminGuard, PermissionGuard } from "@/contexts/admin-context";
import { useState } from "react";
import {
  FileText,
  Search,
  Download,
  Filter,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  category: string;
  resourceType: string;
  resourceId: string | null;
  riskLevel: "low" | "medium" | "high" | "critical";
  ipAddress: string;
  userAgent: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const [isOpen, setIsOpen] = useState(false);

  const getRiskBadge = (level: AuditLog["riskLevel"]) => {
    switch (level) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="destructive" className="bg-orange-500">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="cursor-pointer" data-testid={`row-log-${log.id}`}>
        <TableCell>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Calendar className="h-3 w-3" />
            {new Date(log.createdAt).toLocaleString()}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{log.adminEmail}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{log.action}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{log.category}</Badge>
        </TableCell>
        <TableCell>{log.resourceType}</TableCell>
        <TableCell>{getRiskBadge(log.riskLevel)}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {log.ipAddress}
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30">
          <TableCell colSpan={8} className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm mb-2">Details</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Resource ID:</span> {log.resourceId || "-"}</p>
                  <p><span className="text-muted-foreground">User Agent:</span> <span className="font-mono text-xs">{log.userAgent}</span></p>
                </div>
              </div>
              {(log.oldValue || log.newValue) && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Changes</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {log.oldValue && (
                      <div className="p-2 bg-red-500/10 rounded text-xs">
                        <p className="font-medium text-red-600 mb-1">Before</p>
                        <pre className="overflow-auto max-h-32">{JSON.stringify(log.oldValue, null, 2)}</pre>
                      </div>
                    )}
                    {log.newValue && (
                      <div className="p-2 bg-green-500/10 rounded text-xs">
                        <p className="font-medium text-green-600 mb-1">After</p>
                        <pre className="overflow-auto max-h-32">{JSON.stringify(log.newValue, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-sm mb-2">Metadata</h4>
                  <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AuditLogsContent() {
  const { isSuperAdmin, hasPermission } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["/api/platform-admin/audit-logs", { category: categoryFilter, risk: riskFilter }],
    staleTime: 30 * 1000,
  });

  const filteredLogs = data?.logs?.filter(
    (log) =>
      log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-audit-logs-title">
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track all administrative actions on the platform
          </p>
        </div>
        {(isSuperAdmin || hasPermission("manage_logs")) && (
          <Button variant="outline" data-testid="button-export-logs">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-logs"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                <Activity className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="config">Config</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-risk-filter">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{data?.total || 0} logs</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <AuditLogRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAuditLogs() {
  return (
    <AdminGuard>
      <PermissionGuard permission="view_logs">
        <AuditLogsContent />
      </PermissionGuard>
    </AdminGuard>
  );
}
