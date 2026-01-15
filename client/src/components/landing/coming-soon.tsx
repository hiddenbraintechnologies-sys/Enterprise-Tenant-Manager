import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Check, Loader2 } from "lucide-react";
import { LandingLayout } from "./landing-layout";
import { type CountryCode } from "./country-selector";
import { Seo } from "@/components/seo";
import { useToast } from "@/hooks/use-toast";

const COUNTRY_PATHS: Record<CountryCode, string> = {
  IN: "in",
  UK: "uk",
  AE: "uae",
  SG: "sg",
  MY: "my",
};

interface ComingSoonPageProps {
  countryCode: CountryCode;
  countryName: string;
}

export function ComingSoonPage({ countryCode, countryName }: ComingSoonPageProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const countryPath = COUNTRY_PATHS[countryCode] || countryCode.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          countryCode: countryPath 
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSubmitted(true);
        setEmail("");
        toast({ title: "You're on the list!", description: data.message });
      } else {
        toast({ 
          title: "Error", 
          description: data.error || "Failed to join waitlist", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to join waitlist. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LandingLayout>
      <Seo
        title={`MyBizStream in ${countryName} – Launching Soon`}
        description={`MyBizStream is launching soon in ${countryName}. Join the waitlist for early access.`}
        canonicalUrl={`https://payodsoft.co.uk/${countryPath}`}
      />
      <section className="px-6 py-20 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-24 items-center justify-center rounded-lg border-2 bg-muted text-2xl font-bold mb-6">
            {countryCode}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-coming-soon-title">
            We're launching in {countryName} soon
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            MyBizStream is expanding to {countryName} with local pricing, compliance features, and dedicated support.
          </p>

          <Card className="mt-10 mx-auto max-w-md" data-testid="card-waitlist">
            <CardHeader>
              <CardTitle className="text-lg">Get notified when we launch</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex items-center justify-center gap-2 py-4 text-primary" data-testid="waitlist-success">
                  <Check className="h-5 w-5" />
                  <span>You're on the list!</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-waitlist-email"
                  />
                  <Button type="submit" disabled={isLoading} data-testid="button-notify-me">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Notify me
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Button variant="outline" className="mt-10" asChild data-testid="button-back-to-global">
            <a href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Global
            </a>
          </Button>
        </div>
      </section>
    </LandingLayout>
  );
}
