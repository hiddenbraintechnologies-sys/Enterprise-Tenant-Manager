import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Bell, CheckCircle } from "lucide-react";
import { Helmet } from "react-helmet";

interface ComingSoonPageProps {
  countryCode: string;
  countryName: string;
  countryFlag: string;
}

const COUNTRY_DATA: Record<string, { name: string; flag: string }> = {
  uae: { name: "United Arab Emirates", flag: "AE" },
  uk: { name: "United Kingdom", flag: "UK" },
  sg: { name: "Singapore", flag: "SG" },
  my: { name: "Malaysia", flag: "MY" }
};

export function ComingSoonPage({ countryCode, countryName, countryFlag }: ComingSoonPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const waitlistMutation = useMutation({
    mutationFn: async (data: { email: string; countryCode: string }) => {
      const res = await apiRequest("POST", "/api/public/waitlist", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when we launch in your region."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    waitlistMutation.mutate({ email: email.trim(), countryCode });
  };

  const handleCountryChange = (country: string) => {
    setLocation(`/${country}`);
  };

  return (
    <>
      <Helmet>
        <title>MyBizStream {countryName} - Coming Soon</title>
        <meta name="description" content={`MyBizStream is launching soon in ${countryName}. Join our waitlist to be notified when we launch.`} />
        <link rel="canonical" href={`https://mybizstream.com/${countryCode}`} />
        <meta property="og:title" content={`MyBizStream ${countryName} - Coming Soon`} />
        <meta property="og:description" content={`Join our waitlist. We're launching soon in ${countryName}!`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://mybizstream.com/${countryCode}`} />
      </Helmet>

      <LandingLayout currentCountry={countryCode} onCountryChange={handleCountryChange}>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 text-lg px-4 py-2" data-testid="badge-country">
              {countryFlag}
            </Badge>

            <div className="flex items-center justify-center gap-3 mb-6">
              <Clock className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-coming-soon-title">
              Launching Soon in {countryName}
            </h1>

            <p className="text-xl text-muted-foreground mb-12" data-testid="text-coming-soon-subtitle">
              We're working hard to bring MyBizStream to your region. Join our waitlist and be the first to know when we launch.
            </p>

            <Card className="max-w-md mx-auto" data-testid="card-waitlist">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Bell className="h-5 w-5" />
                  Get Notified
                </CardTitle>
                <CardDescription>
                  We'll send you an email when we launch
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-4" data-testid="waitlist-success">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-lg font-medium">You're on the list!</p>
                    <p className="text-muted-foreground">We'll notify you when we launch.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-waitlist-email"
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={waitlistMutation.isPending}
                      data-testid="button-join-waitlist"
                    >
                      {waitlistMutation.isPending ? "Joining..." : "Join Waitlist"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <p className="mt-8 text-sm text-muted-foreground">
              Already have an account in another region?{" "}
              <a href="/login" className="text-primary hover:underline" data-testid="link-login">
                Log in here
              </a>
            </p>
          </div>
        </div>
      </LandingLayout>
    </>
  );
}

export function UAELandingPage() {
  return <ComingSoonPage countryCode="uae" countryName="United Arab Emirates" countryFlag="AE" />;
}

export function UKLandingPage() {
  return <ComingSoonPage countryCode="uk" countryName="United Kingdom" countryFlag="UK" />;
}

export function SGLandingPage() {
  return <ComingSoonPage countryCode="sg" countryName="Singapore" countryFlag="SG" />;
}

export function MYLandingPage() {
  return <ComingSoonPage countryCode="my" countryName="Malaysia" countryFlag="MY" />;
}

export default ComingSoonPage;
