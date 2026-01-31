import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEntitlements } from "@/hooks/use-entitlements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, Clock, CheckCircle2, AlertTriangle, ExternalLink, Loader2,
  Users, MessageSquare, BarChart3, Zap, CreditCard, FolderOpen, Settings2, Puzzle
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, differenceInDays } from "date-fns";

interface InstalledAddon {
  installation: {
    id: string;
    tenantId: string;
    addonId: string;
    status: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    units: number;
    monthlyAmount: number;
    currentPeriodEnd: string | null;
    installedAt: string;
  };
  addon: {
    id: string;
    slug: string;
    name: string;
    shortDescription: string | null;
    iconUrl: string | null;
    category: string;
  } | null;
}

interface InstalledAddonsResponse {
  installedAddons: InstalledAddon[];
}

function getStatusBadge(status: string, subscriptionStatus: string, trialEndsAt: string | null) {
  const now = new Date();
  
  if (subscriptionStatus === "trialing" && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    const daysLeft = differenceInDays(trialEnd, now);
    
    if (daysLeft <= 0) {
      return (
        <Badge variant="destructive" className="gap-1" data-testid="badge-status-expired">
          <AlertTriangle className="h-3 w-3" />Trial Expired
        </Badge>
      );
    }
    if (daysLeft <= 3) {
      return (
        <Badge variant="secondary" className="gap-1" data-testid="badge-status-trial-ending">
          <Clock className="h-3 w-3" />{daysLeft} days left
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1" data-testid="badge-status-trial">
        <Clock className="h-3 w-3" />Trial - {daysLeft} days
      </Badge>
    );
  }
  
  if (status === "active" && subscriptionStatus === "active") {
    return (
      <Badge variant="default" className="gap-1" data-testid="badge-status-active">
        <CheckCircle2 className="h-3 w-3" />Active
      </Badge>
    );
  }
  
  if (subscriptionStatus === "cancelled" || subscriptionStatus === "halted") {
    return (
      <Badge variant="destructive" className="gap-1" data-testid="badge-status-inactive">
        <AlertTriangle className="h-3 w-3" />Inactive
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="gap-1" data-testid="badge-status-other">
      {status}
    </Badge>
  );
}

function getModuleLink(slug: string): string | null {
  const moduleRoutes: Record<string, string> = {
    "hrms": "/hr",
    "hrms-india": "/hr",
    "hrms-malaysia": "/hr",
    "hrms-uk": "/hr",
    "payroll": "/hr/payroll",
    "payroll-india": "/hr/payroll",
    "payroll-malaysia": "/hr/payroll",
    "payroll-uk": "/hr/payroll",
    "whatsapp-automation": "/settings",
    "advanced-analytics": "/analytics",
    "document-management": "/documents",
    "multi-branch-support": "/settings",
    "api-access": "/settings",
  };
  return moduleRoutes[slug] || null;
}

function getCategoryIcon(category: string) {
  const iconProps = { className: "h-5 w-5 text-muted-foreground" };
  
  switch (category) {
    case "hr":
      return <Users {...iconProps} />;
    case "communication":
      return <MessageSquare {...iconProps} />;
    case "analytics":
      return <BarChart3 {...iconProps} />;
    case "automation":
      return <Zap {...iconProps} />;
    case "billing":
    case "payments":
      return <CreditCard {...iconProps} />;
    case "storage":
      return <FolderOpen {...iconProps} />;
    case "integration":
      return <Settings2 {...iconProps} />;
    default:
      return <Puzzle {...iconProps} />;
  }
}

export function MyAddons() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;
  const { entitlements } = useEntitlements();

  const { data, isLoading, error } = useQuery<InstalledAddonsResponse>({
    queryKey: ["/api/addons/tenant", tenantId, "addons"],
    enabled: !!tenantId,
  });

  const installedAddons = data?.installedAddons || [];
  
  const isAddonEntitled = (slug: string): boolean => {
    const ent = entitlements[slug];
    if (ent?.entitled) return true;
    const baseSlug = slug.replace(/-india$|-malaysia$|-uk$|-uae$/, "");
    if (baseSlug !== slug && entitlements[baseSlug]?.entitled) return true;
    return false;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle className="text-lg font-medium" data-testid="text-myaddons-title">My Add-ons</CardTitle>
          </div>
          <CardDescription>Your installed add-ons and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8" data-testid="loading-myaddons">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle className="text-lg font-medium" data-testid="text-myaddons-title">My Add-ons</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" data-testid="text-myaddons-error">
            Unable to load add-ons. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle className="text-lg font-medium" data-testid="text-myaddons-title">My Add-ons</CardTitle>
          </div>
          <Link href="/marketplace">
            <Button variant="outline" size="sm" className="gap-1" data-testid="link-browse-addons">
              Browse Add-ons
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <CardDescription data-testid="text-myaddons-count">
          {installedAddons.length === 0
            ? "You haven't installed any add-ons yet"
            : `${installedAddons.length} add-on${installedAddons.length > 1 ? "s" : ""} installed`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {installedAddons.length === 0 ? (
          <div className="text-center py-6 space-y-3" data-testid="empty-myaddons">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Enhance your business with powerful add-ons like Payroll, WhatsApp Automation, and more.
            </p>
            <Link href="/marketplace">
              <Button variant="default" size="sm" data-testid="button-explore-marketplace">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {installedAddons.map((item) => {
              if (!item.addon) return null;
              const { installation, addon } = item;
              
              return (
                <div
                  key={installation.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                  data-testid={`addon-card-${addon.slug}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted" data-testid={`addon-icon-${addon.slug}`}>
                      {addon.iconUrl ? (
                        <img src={addon.iconUrl} alt="" className="h-6 w-6" />
                      ) : (
                        getCategoryIcon(addon.category)
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm" data-testid={`text-addon-name-${addon.slug}`}>{addon.name}</h4>
                        {getStatusBadge(installation.status, installation.subscriptionStatus, installation.trialEndsAt)}
                      </div>
                      {addon.shortDescription && (
                        <p className="text-xs text-muted-foreground line-clamp-1" data-testid={`text-addon-desc-${addon.slug}`}>
                          {addon.shortDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span data-testid={`text-addon-installed-${addon.slug}`}>
                          Installed {formatDistanceToNow(new Date(installation.installedAt), { addSuffix: true })}
                        </span>
                        {installation.subscriptionStatus === "trialing" && installation.trialEndsAt && (
                          <span className="text-amber-600 dark:text-amber-400" data-testid={`text-addon-trial-${addon.slug}`}>
                            Trial ends {formatDistanceToNow(new Date(installation.trialEndsAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const entitled = isAddonEntitled(addon.slug);
                      const moduleLink = getModuleLink(addon.slug);
                      
                      if (!entitled) {
                        return (
                          <Link href={`/marketplace?addon=${addon.slug}`}>
                            <Button variant="default" size="sm" data-testid={`button-renew-${addon.slug}`}>
                              Renew
                            </Button>
                          </Link>
                        );
                      }
                      
                      if (moduleLink) {
                        return (
                          <Link href={moduleLink}>
                            <Button variant="default" size="sm" data-testid={`button-open-${addon.slug}`}>
                              Open
                            </Button>
                          </Link>
                        );
                      }
                      
                      return null;
                    })()}
                    <Link href="/marketplace?tab=installed">
                      <Button variant="ghost" size="sm" data-testid={`button-manage-${addon.slug}`}>
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
