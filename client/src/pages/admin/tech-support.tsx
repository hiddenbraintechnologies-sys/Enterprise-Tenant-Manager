import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Zap,
  Terminal,
  FileText,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface SystemHealth {
  status: "healthy" | "degraded" | "critical";
  uptime: number;
  lastCheck: string;
  services: {
    name: string;
    status: "up" | "down" | "degraded";
    latency: number;
    lastPing: string;
  }[];
}

interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  status: "active" | "deprecated" | "disabled";
  avgLatency: number;
  requestCount: number;
  errorRate: number;
  lastCalled: string;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  source: string;
  stackTrace?: string;
  count: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  change: number;
}

export default function TechSupportDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ["/api/tech-support/health"],
    refetchInterval: 30000,
  });

  const { data: apiData, isLoading: apiLoading, refetch: refetchApi } = useQuery<ApiEndpoint[]>({
    queryKey: ["/api/tech-support/apis"],
  });

  const { data: errorData, isLoading: errorLoading, refetch: refetchErrors } = useQuery<ErrorLog[]>({
    queryKey: ["/api/tech-support/errors"],
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery<PerformanceMetric[]>({
    queryKey: ["/api/tech-support/metrics"],
  });

  const mockHealthData: SystemHealth = healthData || {
    status: "healthy",
    uptime: 99.98,
    lastCheck: new Date().toISOString(),
    services: [
      { name: "API Gateway", status: "up", latency: 45, lastPing: new Date().toISOString() },
      { name: "Database (Primary)", status: "up", latency: 12, lastPing: new Date().toISOString() },
      { name: "Database (Replica)", status: "up", latency: 15, lastPing: new Date().toISOString() },
      { name: "Cache (Redis)", status: "up", latency: 3, lastPing: new Date().toISOString() },
      { name: "File Storage", status: "up", latency: 78, lastPing: new Date().toISOString() },
      { name: "Email Service", status: "degraded", latency: 250, lastPing: new Date().toISOString() },
    ],
  };

  const mockApiData: ApiEndpoint[] = apiData || [
    { id: "1", method: "GET", path: "/api/tenants", status: "active", avgLatency: 45, requestCount: 15420, errorRate: 0.1, lastCalled: new Date().toISOString() },
    { id: "2", method: "POST", path: "/api/auth/login", status: "active", avgLatency: 120, requestCount: 8930, errorRate: 2.3, lastCalled: new Date().toISOString() },
    { id: "3", method: "GET", path: "/api/users", status: "active", avgLatency: 32, requestCount: 12540, errorRate: 0.05, lastCalled: new Date().toISOString() },
    { id: "4", method: "PUT", path: "/api/tenants/:id", status: "active", avgLatency: 89, requestCount: 3210, errorRate: 0.8, lastCalled: new Date().toISOString() },
    { id: "5", method: "DELETE", path: "/api/sessions/:id", status: "active", avgLatency: 25, requestCount: 890, errorRate: 0.0, lastCalled: new Date().toISOString() },
    { id: "6", method: "GET", path: "/api/legacy/reports", status: "deprecated", avgLatency: 450, requestCount: 120, errorRate: 5.2, lastCalled: new Date().toISOString() },
  ];

  const mockErrorData: ErrorLog[] = errorData || [
    { id: "1", timestamp: new Date(Date.now() - 300000).toISOString(), level: "error", message: "Database connection timeout", source: "db-primary", count: 3 },
    { id: "2", timestamp: new Date(Date.now() - 600000).toISOString(), level: "warning", message: "Rate limit approaching threshold", source: "api-gateway", count: 15 },
    { id: "3", timestamp: new Date(Date.now() - 1200000).toISOString(), level: "error", message: "Email delivery failed: SMTP timeout", source: "email-service", count: 7 },
    { id: "4", timestamp: new Date(Date.now() - 1800000).toISOString(), level: "info", message: "Cache invalidation triggered", source: "redis", count: 42 },
    { id: "5", timestamp: new Date(Date.now() - 3600000).toISOString(), level: "warning", message: "High memory usage detected", source: "api-server-3", count: 8 },
  ];

  const mockMetricsData: PerformanceMetric[] = metricsData || [
    { name: "Avg Response Time", value: 48, unit: "ms", trend: "down", change: -12 },
    { name: "Requests/min", value: 1247, unit: "req", trend: "up", change: 8 },
    { name: "Error Rate", value: 0.23, unit: "%", trend: "down", change: -0.05 },
    { name: "Active Sessions", value: 342, unit: "", trend: "stable", change: 0 },
    { name: "CPU Usage", value: 34, unit: "%", trend: "stable", change: 2 },
    { name: "Memory Usage", value: 67, unit: "%", trend: "up", change: 5 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "up":
      case "active":
        return "text-green-500";
      case "degraded":
      case "deprecated":
        return "text-yellow-500";
      case "critical":
      case "down":
      case "disabled":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
      case "up":
      case "active":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />{status}</Badge>;
      case "degraded":
      case "deprecated":
        return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500"><AlertTriangle className="h-3 w-3" />{status}</Badge>;
      case "critical":
      case "down":
      case "disabled":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      POST: "bg-green-500/10 text-green-500 border-green-500/20",
      PUT: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      PATCH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={colors[method] || ""}>{method}</Badge>;
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredApis = mockApiData.filter(
    api => api.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
           api.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredErrors = mockErrorData.filter(
    err => err.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
           err.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Technical Support Dashboard</h1>
          <p className="text-muted-foreground">Monitor system health, APIs, and platform performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchHealth();
              refetchApi();
              refetchErrors();
            }}
            data-testid="button-refresh-all"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-tech-support">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">
            <Server className="h-4 w-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="apis" data-testid="tab-apis">
            <Globe className="h-4 w-4 mr-2" />
            APIs
          </TabsTrigger>
          <TabsTrigger value="errors" data-testid="tab-errors">
            <AlertCircle className="h-4 w-4 mr-2" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Zap className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Activity className={`h-4 w-4 ${getStatusColor(mockHealthData.status)}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize" data-testid="text-system-status">{mockHealthData.status}</div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {mockHealthData.uptime}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Services</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-services">
                  {mockHealthData.services.filter(s => s.status === "up").length}/{mockHealthData.services.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mockHealthData.services.filter(s => s.status === "degraded").length} degraded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Endpoints</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-api-count">{mockApiData.length}</div>
                <p className="text-xs text-muted-foreground">
                  {mockApiData.filter(a => a.status === "deprecated").length} deprecated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-error-count">
                  {mockErrorData.filter(e => e.level === "error").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mockErrorData.filter(e => e.level === "warning").length} warnings
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Health</CardTitle>
                <CardDescription>Real-time status of platform services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockHealthData.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      data-testid={`service-row-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          service.status === "up" ? "bg-green-500" :
                          service.status === "degraded" ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{service.latency}ms</span>
                        {getStatusBadge(service.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
                <CardDescription>Key platform performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockMetricsData.map((metric, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      data-testid={`metric-row-${index}`}
                    >
                      <span className="font-medium">{metric.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{metric.value}{metric.unit}</span>
                        {metric.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {metric.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                        {metric.trend === "stable" && <div className="h-4 w-4" />}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Detailed health information for all platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Last Ping</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockHealthData.services.map((service, index) => (
                    <TableRow key={index} data-testid={`service-detail-row-${index}`}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{getStatusBadge(service.status)}</TableCell>
                      <TableCell>{service.latency}ms</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(service.lastPing).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search APIs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-apis"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Monitor and manage platform API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avg Latency</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Error Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApis.map((api) => (
                    <TableRow key={api.id} data-testid={`api-row-${api.id}`}>
                      <TableCell>{getMethodBadge(api.method)}</TableCell>
                      <TableCell className="font-mono text-sm">{api.path}</TableCell>
                      <TableCell>{getStatusBadge(api.status)}</TableCell>
                      <TableCell>{api.avgLatency}ms</TableCell>
                      <TableCell>{api.requestCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={api.errorRate > 1 ? "text-red-500" : api.errorRate > 0.5 ? "text-yellow-500" : ""}>
                          {api.errorRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-errors"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>Recent platform errors and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredErrors.map((error) => (
                    <div
                      key={error.id}
                      className="flex items-start gap-3 p-3 rounded-md border"
                      data-testid={`error-row-${error.id}`}
                    >
                      {getLevelIcon(error.level)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{error.message}</p>
                          <Badge variant="outline" className="text-xs">{error.count}x</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Terminal className="h-3 w-3" />
                          <span>{error.source}</span>
                          <span>|</span>
                          <Clock className="h-3 w-3" />
                          <span>{new Date(error.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {mockMetricsData.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  {metric.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {metric.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {metric.trend === "stable" && <Activity className="h-4 w-4 text-muted-foreground" />}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`metric-value-${index}`}>
                    {metric.value}{metric.unit}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.change > 0 ? "+" : ""}{metric.change}{metric.unit} from last hour
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Resources</CardTitle>
              <CardDescription>Infrastructure resource utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm text-muted-foreground">34%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: "34%" }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">67%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: "67%" }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disk Usage</span>
                    <span className="text-sm text-muted-foreground">45%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: "45%" }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
