import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

export default function NotAuthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-not-authorized-title">
            Access Denied
          </CardTitle>
          <CardDescription data-testid="text-not-authorized-description">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="default"
            className="w-full"
            onClick={() => window.history.back()}
            data-testid="button-go-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full" data-testid="button-go-home">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
