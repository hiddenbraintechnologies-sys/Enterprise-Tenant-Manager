import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, ArrowRight, X, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTour } from "@/contexts/tour-context";
import { dashboardTour } from "@/lib/tours";

interface WelcomeCardProps {
  tenantId: string;
  businessType: string;
  subscriptionTier?: string;
  onCreateFirst?: () => void;
}

const WELCOME_DISMISSED_KEY = "mybizstream_welcome_dismissed";

export function WelcomeCard({ tenantId, businessType, subscriptionTier = "free", onCreateFirst }: WelcomeCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { startTour, completedTours } = useTour();
  const hasCompletedTour = completedTours.includes(dashboardTour.id);

  const handleStartTour = () => {
    startTour(dashboardTour);
  };

  useEffect(() => {
    const dismissed = localStorage.getItem(`${WELCOME_DISMISSED_KEY}_${tenantId}`);
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, [tenantId]);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      localStorage.setItem(`${WELCOME_DISMISSED_KEY}_${tenantId}`, "true");
      return { success: true };
    },
    onSuccess: () => {
      setIsDismissed(true);
    },
  });

  if (isDismissed) {
    return null;
  }

  const tierDisplay = subscriptionTier === "free" ? "Free Plan" : 
                      subscriptionTier === "basic" ? "Basic Plan" : 
                      subscriptionTier === "pro" ? "Pro Plan" : "Free Plan";

  const tierColor = subscriptionTier === "pro" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                    subscriptionTier === "basic" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    "bg-muted text-muted-foreground";

  const getCreateButtonText = () => {
    switch (businessType) {
      case "clinic":
        return "Add your first patient";
      case "salon":
        return "Add your first appointment";
      case "pg":
        return "Add your first tenant";
      case "coworking":
        return "Add your first member";
      case "service":
        return "Add your first booking";
      case "real_estate":
        return "Add your first property";
      case "tourism":
        return "Add your first package";
      case "education":
        return "Add your first student";
      case "logistics":
        return "Add your first shipment";
      case "legal":
        return "Add your first case";
      case "furniture_manufacturing":
        return "Add your first order";
      case "software_services":
      case "consulting":
        return "Add your first project";
      default:
        return "Create your first record";
    }
  };

  return (
    <Card className="relative border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-welcome">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={() => dismissMutation.mutate()}
        data-testid="button-dismiss-welcome"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg" data-testid="text-welcome-title">Welcome to MyBizStream</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span data-testid="text-welcome-plan">You're on the</span>
              <Badge variant="secondary" className={tierColor} data-testid="badge-plan-tier">
                {tierDisplay}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-welcome-description">
          Start managing your business today. Create your first record to get started, or explore the dashboard.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleStartTour} data-testid="button-start-tour">
            <PlayCircle className="h-4 w-4 mr-2" />
            {hasCompletedTour ? "Replay Tour" : "Take a Tour"}
          </Button>
          {onCreateFirst ? (
            <Button variant="outline" onClick={onCreateFirst} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              {getCreateButtonText()}
            </Button>
          ) : (
            <Button variant="outline" asChild data-testid="button-create-first">
              <Link href="/customers">
                <Plus className="h-4 w-4 mr-2" />
                {getCreateButtonText()}
              </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={() => dismissMutation.mutate()} data-testid="button-skip-welcome">
            Skip for now
          </Button>
          {subscriptionTier === "free" && (
            <Button variant="ghost" asChild data-testid="link-view-pricing">
              <Link href="/pricing">
                View pricing
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
