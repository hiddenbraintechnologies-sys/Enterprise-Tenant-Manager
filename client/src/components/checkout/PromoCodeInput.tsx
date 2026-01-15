import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tag, Check, X, Loader2 } from "lucide-react";

interface PromoValidationResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  message: string;
  promo?: {
    id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
  };
}

interface PromoCodeInputProps {
  planId?: string;
  addonTierId?: string;
  amount: number;
  onPromoApplied: (result: PromoValidationResult | null) => void;
  lang?: "en" | "hi";
}

const CONTENT = {
  placeholder: { en: "Enter promo code", hi: "प्रोमो कोड दर्ज करें" },
  apply: { en: "Apply", hi: "लागू करें" },
  remove: { en: "Remove", hi: "हटाएं" },
  youSaved: { en: "You saved", hi: "आपने बचाया" },
  invalidCode: { en: "Invalid promo code", hi: "अमान्य प्रोमो कोड" }
};

export function PromoCodeInput({ 
  planId, 
  addonTierId, 
  amount, 
  onPromoApplied,
  lang = "en"
}: PromoCodeInputProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (promoCode: string) => {
      const res = await apiRequest("POST", "/api/billing/promos/validate", {
        code: promoCode,
        planId,
        addonTierId,
        amount
      });
      return res.json() as Promise<PromoValidationResult>;
    },
    onSuccess: (result) => {
      if (result.valid) {
        setAppliedPromo(result);
        onPromoApplied(result);
        toast({
          title: result.promo?.name || "Promo applied!",
          description: result.message
        });
      } else {
        toast({
          title: CONTENT.invalidCode[lang],
          description: result.message,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: CONTENT.invalidCode[lang],
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleApply = () => {
    if (!code.trim()) return;
    validateMutation.mutate(code.trim().toUpperCase());
  };

  const handleRemove = () => {
    setAppliedPromo(null);
    setCode("");
    onPromoApplied(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  if (appliedPromo && appliedPromo.valid) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-4" data-testid="promo-applied">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200" data-testid="text-promo-code">
                {appliedPromo.promo?.code}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400" data-testid="text-promo-savings">
                {CONTENT.youSaved[lang]} ₹{(appliedPromo.discountAmount / 100).toFixed(0)}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRemove}
            data-testid="button-remove-promo"
          >
            <X className="h-4 w-4 mr-1" />
            {CONTENT.remove[lang]}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="promo-input-container">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={CONTENT.placeholder[lang]}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="pl-10 uppercase"
            disabled={validateMutation.isPending}
            data-testid="input-promo-code"
          />
        </div>
        <Button 
          onClick={handleApply}
          disabled={!code.trim() || validateMutation.isPending}
          data-testid="button-apply-promo"
        >
          {validateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            CONTENT.apply[lang]
          )}
        </Button>
      </div>
    </div>
  );
}
