import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { WelcomeMessage } from "@/components/welcome-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  MapPin,
  Home,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalProperties: number;
  activeListings: number;
  totalLeads: number;
  pendingSiteVisits: number;
  activeAgents: number;
  dealsThisMonth: number;
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
            {trend && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">{trend.value}%</span>
                <span>{trend.label}</span>
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getLeadStatusVariant(status: string) {
  switch (status) {
    case "hot":
      return "destructive";
    case "warm":
      return "default";
    case "cold":
      return "secondary";
    case "converted":
      return "outline";
    default:
      return "outline";
  }
}

export default function RealEstateDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/real-estate/dashboard/stats"],
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/real-estate/leads", { limit: 5 }],
  });

  const { data: upcomingVisits, isLoading: visitsLoading } = useQuery<{ data: any[]; pagination: any }>({
    queryKey: ["/api/real-estate/site-visits", { status: "scheduled", limit: 5 }],
  });

  return (
    <DashboardLayout title="Real Estate Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      <WelcomeMessage businessType="real_estate" />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Properties"
          value={stats?.totalProperties ?? 0}
          icon={Building2}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Listings"
          value={stats?.activeListings ?? 0}
          icon={Home}
          loading={statsLoading}
        />
        <StatsCard
          title="Total Leads"
          value={stats?.totalLeads ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Site Visits"
          value={stats?.pendingSiteVisits ?? 0}
          icon={Calendar}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Agents"
          value={stats?.activeAgents ?? 0}
          icon={UserCheck}
          loading={statsLoading}
        />
        <StatsCard
          title="Deals This Month"
          value={stats?.dealsThisMonth ?? 0}
          icon={TrendingUp}
          loading={statsLoading}
          trend={{ value: 12, label: "vs last month" }}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
            <Link href="/leads/new">
              <Button size="sm" data-testid="button-add-lead">
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentLeads?.data?.length ? (
              <div className="space-y-4">
                {recentLeads.data.slice(0, 5).map((lead: any) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-lead-${lead.id}`}
                  >
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">{lead.email || lead.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getLeadStatusVariant(lead.status)}>
                        {lead.status}
                      </Badge>
                      <Link href={`/leads/${lead.id}`}>
                        <Button size="icon" variant="ghost" data-testid={`button-view-lead-${lead.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No leads yet. Add your first lead to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Site Visits</CardTitle>
            <Link href="/site-visits/new">
              <Button size="sm" data-testid="button-schedule-visit">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Visit
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {visitsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingVisits?.data?.length ? (
              <div className="space-y-4">
                {upcomingVisits.data.slice(0, 5).map((visit: any) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                    data-testid={`card-visit-${visit.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{visit.property?.name || "Property Visit"}</p>
                        <p className="text-sm text-muted-foreground">
                          {visit.scheduledAt ? new Date(visit.scheduledAt).toLocaleDateString() : "TBD"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{visit.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No upcoming site visits scheduled.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/properties/new">
                <Button variant="outline" data-testid="button-add-property">
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </Link>
              <Link href="/listings/new">
                <Button variant="outline" data-testid="button-create-listing">
                  <Home className="mr-2 h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
              <Link href="/agents/new">
                <Button variant="outline" data-testid="button-add-agent">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Add Agent
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
