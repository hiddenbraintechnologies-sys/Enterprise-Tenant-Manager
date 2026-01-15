import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = "en" | "hi";

export interface PlanData {
  id: string;
  tier: "free" | "basic" | "pro";
  name: { en: string; hi: string };
  tagline: { en: string; hi: string };
  subtitle?: { en: string; hi: string };
  monthlyPrice: number;
  yearlyPrice: number;
  features: { en: string[]; hi: string[] };
  cta: { en: string; hi: string };
  recommended?: boolean;
}

interface PlanCardProps {
  plan: PlanData;
  lang: Lang;
  billingCycle: "monthly" | "yearly";
  isCurrent: boolean;
  isLoading?: boolean;
  onSelect: (tier: string) => void;
}

const CONTENT = {
  perMonth: { en: "/month", hi: "/माह" },
  perYear: { en: "/year", hi: "/वर्ष" },
  currentPlan: { en: "Current Plan", hi: "वर्तमान प्लान" },
  recommended: { en: "Recommended", hi: "अनुशंसित" },
  free: { en: "Free", hi: "मुफ़्त" },
  save: { en: "Save", hi: "बचाएं" }
};

const tierIcons: Record<string, React.ReactNode> = {
  free: <Zap className="h-6 w-6" />,
  basic: <Star className="h-6 w-6" />,
  pro: <Sparkles className="h-6 w-6" />
};

export function PlanCard({ plan, lang, billingCycle, isCurrent, isLoading, onSelect }: PlanCardProps) {
  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const savings = (plan.monthlyPrice * 12) - plan.yearlyPrice;
  const isRecommended = plan.recommended;

  return (
    <Card 
      className={cn(
        "relative flex flex-col",
        isRecommended && "border-primary shadow-lg md:scale-105 z-10"
      )}
      data-testid={`card-plan-${plan.tier}`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground" data-testid="badge-recommended">
            {CONTENT.recommended[lang]}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <div className={cn(
            "p-3 rounded-full",
            plan.tier === "free" ? "bg-muted" :
            plan.tier === "basic" ? "bg-blue-100 dark:bg-blue-900/50" :
            "bg-purple-100 dark:bg-purple-900/50"
          )}>
            {tierIcons[plan.tier]}
          </div>
        </div>
        <CardTitle className="text-xl" data-testid={`text-plan-name-${plan.tier}`}>
          {plan.name[lang]}
        </CardTitle>
        <CardDescription className="min-h-[40px]" data-testid={`text-plan-tagline-${plan.tier}`}>
          {plan.tagline[lang]}
          {plan.subtitle && (
            <span className="block text-xs mt-1">{plan.subtitle[lang]}</span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <div className="text-center mb-6">
          {price === 0 ? (
            <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.tier}`}>
              {CONTENT.free[lang]}
            </span>
          ) : (
            <>
              <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.tier}`}>
                ₹{price}
              </span>
              <span className="text-muted-foreground">
                {billingCycle === "yearly" ? CONTENT.perYear[lang] : CONTENT.perMonth[lang]}
              </span>
              {billingCycle === "yearly" && savings > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-green-600 text-xs" data-testid={`badge-savings-${plan.tier}`}>
                    {CONTENT.save[lang]} ₹{savings}
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        <ul className="space-y-3">
          {plan.features[lang].map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          variant={isRecommended ? "default" : "outline"}
          disabled={isCurrent || isLoading}
          onClick={() => onSelect(plan.tier)}
          data-testid={`button-select-${plan.tier}`}
        >
          {isCurrent ? CONTENT.currentPlan[lang] : plan.cta[lang]}
        </Button>
      </CardFooter>
    </Card>
  );
}
