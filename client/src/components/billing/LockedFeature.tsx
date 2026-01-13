import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";

type Props = {
  moduleKey: string;
};

export function LockedFeature({ moduleKey }: Props) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-xl w-full p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-muted rounded-full">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold" data-testid="text-locked-feature-title">
            {t("lockedFeature.title")}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-locked-feature-body">
          {t("lockedFeature.body")}
        </p>

        <Button
          className="w-full"
          data-testid="button-upgrade-locked"
          onClick={() =>
            setLocation(`/packages?reason=locked&module=${encodeURIComponent(moduleKey)}`)
          }
        >
          {t("lockedFeature.upgradeButton")}
        </Button>
      </Card>
    </div>
  );
}
