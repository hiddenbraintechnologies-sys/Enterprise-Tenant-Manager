import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, LogIn, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [countdown, setCountdown] = useState(5);
  
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("accessToken");

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = hasToken ? "/" : "/login";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasToken]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold" data-testid="text-404-title">
                Page Not Found
              </h1>
              <p className="text-sm text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              Redirecting in {countdown} seconds...
            </p>

            <div className="flex flex-col gap-2 w-full mt-4">
              <a 
                href="/"
                className="w-full"
                data-testid="link-go-home"
              >
                <Button type="button" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Button>
              </a>
              
              {!hasToken && (
                <a 
                  href="/login"
                  className="w-full"
                  data-testid="link-go-login"
                >
                  <Button type="button" variant="outline" className="w-full">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </a>
              )}
              
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => window.history.go(-1)}
                className="w-full"
                data-testid="button-go-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
