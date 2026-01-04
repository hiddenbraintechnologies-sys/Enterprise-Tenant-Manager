import { Button } from "@/components/ui/button";
import { Loader2, PartyPopper, Rocket } from "lucide-react";

interface CompletionStepProps {
  step: any;
  stepData: Record<string, any>;
  onComplete: (data: any) => void;
  isLoading: boolean;
}

export function CompletionStep({ step, stepData, onComplete, isLoading }: CompletionStepProps) {
  const handleComplete = () => {
    onComplete({ 
      finishedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="text-center space-y-6 py-4">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <PartyPopper className="h-8 w-8 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-semibold" data-testid="text-completion-title">
          You're all set!
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your business account is now configured and ready to use. 
          You can always update your settings from the dashboard.
        </p>
      </div>

      <div className="bg-muted/50 rounded-md p-4 text-left max-w-sm mx-auto">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          What's next?
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Explore your dashboard</li>
          <li>Add your first customers</li>
          <li>Set up your services</li>
          <li>Configure notifications</li>
        </ul>
      </div>

      <Button 
        onClick={handleComplete} 
        size="lg"
        className="w-full max-w-sm" 
        disabled={isLoading}
        data-testid="button-go-to-dashboard"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Go to Dashboard
      </Button>
    </div>
  );
}
