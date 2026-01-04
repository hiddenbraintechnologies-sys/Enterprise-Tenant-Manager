import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";

interface GenericSetupStepProps {
  step: {
    stepKey: string;
    title: string;
    description: string;
    config: Record<string, any>;
  };
  stepData: Record<string, any>;
  onComplete: (data: any) => void;
  isLoading: boolean;
}

export function GenericSetupStep({ step, stepData, onComplete, isLoading }: GenericSetupStepProps) {
  const [notes, setNotes] = useState(stepData.notes || "");
  const [acknowledged, setAcknowledged] = useState(stepData.acknowledged || false);

  const handleComplete = () => {
    onComplete({ 
      notes, 
      acknowledged: true,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-md p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm text-foreground">
              This step helps you configure your {step.title.toLowerCase()}. You can complete the detailed setup later from your dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any notes or reminders for this setup..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="resize-none"
          data-testid="input-notes"
        />
        <p className="text-xs text-muted-foreground">
          You can add notes here to remind yourself what to set up later.
        </p>
      </div>

      <Button 
        onClick={handleComplete} 
        className="w-full" 
        disabled={isLoading}
        data-testid="button-continue"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Continue
      </Button>
    </div>
  );
}
