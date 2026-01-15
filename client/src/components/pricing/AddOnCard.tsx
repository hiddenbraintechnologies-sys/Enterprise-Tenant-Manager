import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Users, IndianRupee } from "lucide-react";

type Lang = "en" | "hi";

export interface AddOnTier {
  min: number;
  max: number;
  monthlyPrice: number;
  yearlyPrice?: number;
}

export interface AddOnData {
  id: string;
  name: { en: string; hi: string };
  tagline: { en: string; hi: string };
  subtitle: { en: string; hi: string };
  badge: { en: string; hi: string };
  tiers: AddOnTier[];
  features: { en: string[]; hi: string[] };
  cta: { en: string; hi: string };
  trialDays?: number;
}

interface AddOnCardProps {
  addon: AddOnData;
  lang: Lang;
  billingCycle: "monthly" | "yearly";
  isEnabled?: boolean;
  onAdd: () => void;
  onManage?: () => void;
}

const CONTENT = {
  perMonth: { en: "/month", hi: "/माह" },
  perYear: { en: "/year", hi: "/वर्ष" },
  employees: { en: "Employees", hi: "कर्मचारी" },
  price: { en: "Price", hi: "मूल्य" },
  employeePricing: { en: "Employee-Based Pricing", hi: "कर्मचारी-आधारित मूल्य निर्धारण" },
  featuresIncluded: { en: "Features Included", hi: "शामिल विशेषताएं" },
  manageInBilling: { en: "Manage in Billing", hi: "बिलिंग में प्रबंधित करें" }
};

export function AddOnCard({ addon, lang, billingCycle, isEnabled, onAdd, onManage }: AddOnCardProps) {
  return (
    <Card className="overflow-hidden" data-testid={`card-addon-${addon.id}`}>
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
              <IndianRupee className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg" data-testid={`text-addon-title-${addon.id}`}>
                {addon.name[lang]}
              </CardTitle>
              <CardDescription data-testid={`text-addon-tagline-${addon.id}`}>
                {addon.tagline[lang]}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" data-testid={`badge-addon-${addon.id}`}>
            {addon.badge[lang]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {addon.subtitle[lang]}
        </p>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {CONTENT.employeePricing[lang]}
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm" data-testid={`table-addon-tiers-${addon.id}`}>
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-4 font-medium">{CONTENT.employees[lang]}</th>
                    <th className="text-right py-2 px-4 font-medium">{CONTENT.price[lang]}</th>
                  </tr>
                </thead>
                <tbody>
                  {addon.tiers.map((tier, idx) => {
                    const price = billingCycle === "yearly" && tier.yearlyPrice 
                      ? tier.yearlyPrice 
                      : tier.monthlyPrice;
                    const period = billingCycle === "yearly" && tier.yearlyPrice 
                      ? CONTENT.perYear[lang] 
                      : CONTENT.perMonth[lang];
                    
                    return (
                      <tr key={idx} className="border-t" data-testid={`row-tier-${idx}`}>
                        <td className="py-3 px-4">{tier.min}–{tier.max}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          ₹{price}{period}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Check className="h-4 w-4" />
              {CONTENT.featuresIncluded[lang]}
            </h4>
            <ul className="space-y-3">
              {addon.features[lang].map((feature, idx) => {
                const isTrialFeature = addon.trialDays && idx === addon.features[lang].length - 1;
                return (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    {isTrialFeature ? (
                      <Clock className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    <span>{feature}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t bg-muted/30">
        {isEnabled ? (
          <Button 
            variant="outline"
            className="w-full md:w-auto" 
            onClick={onManage}
            data-testid={`button-manage-${addon.id}`}
          >
            {CONTENT.manageInBilling[lang]}
          </Button>
        ) : (
          <Button 
            className="w-full md:w-auto" 
            onClick={onAdd}
            data-testid={`button-add-${addon.id}`}
          >
            {addon.cta[lang]}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
