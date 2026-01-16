import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Lang = "en" | "hi" | "ms" | "ta";

interface BillingToggleProps {
  billingCycle: "monthly" | "yearly";
  onCycleChange: (cycle: "monthly" | "yearly") => void;
  lang: Lang;
  yearlySavings?: string;
}

const CONTENT = {
  monthly: { en: "Monthly", hi: "मासिक" },
  yearly: { en: "Yearly", hi: "वार्षिक" },
  saveYearly: { en: "Save up to ₹189/year", hi: "₹189/वर्ष तक बचाएं" }
};

export function BillingToggle({ billingCycle, onCycleChange, lang, yearlySavings }: BillingToggleProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2" data-testid="billing-cycle-toggle">
        <Button
          variant={billingCycle === "monthly" ? "default" : "outline"}
          size="sm"
          onClick={() => onCycleChange("monthly")}
          data-testid="button-cycle-monthly"
        >
          {CONTENT.monthly[lang]}
        </Button>
        <Button
          variant={billingCycle === "yearly" ? "default" : "outline"}
          size="sm"
          onClick={() => onCycleChange("yearly")}
          data-testid="button-cycle-yearly"
        >
          {CONTENT.yearly[lang]}
        </Button>
      </div>
      {billingCycle === "yearly" && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-green-600" data-testid="badge-yearly-savings">
            {yearlySavings || CONTENT.saveYearly[lang]}
          </Badge>
        </div>
      )}
    </div>
  );
}
