import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Building2,
  Calendar,
  Users,
  BarChart3,
  CreditCard,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Intelligent booking system with conflict detection and recurring appointments.",
  },
  {
    icon: Users,
    title: "Customer Management",
    description: "Complete CRM with customer profiles, history tracking, and notes.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time insights into revenue, bookings, and business performance.",
  },
  {
    icon: CreditCard,
    title: "Billing & Payments",
    description: "Invoicing, payment tracking, and wallet management in one place.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with role-based access control.",
  },
  {
    icon: Zap,
    title: "Multi-Business Support",
    description: "Perfect for PGs, salons, gyms, coaching centers, and more.",
  },
];

const businessTypes = [
  "PG / Hostels / Co-living",
  "Salons & Beauty Parlours",
  "Gyms & Fitness Centers",
  "Coaching / Training Institutes",
  "Service-based Businesses",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold" data-testid="text-logo">BizFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl" data-testid="text-hero-title">
            Manage Your Business
            <span className="block text-primary">Smarter & Faster</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            The all-in-one platform for small and medium businesses. Streamline bookings, 
            manage customers, track payments, and grow your business with powerful analytics.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
              <a href="/api/login">
                Sign In
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Business Types Section */}
      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Built for these businesses
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {businessTypes.map((type) => (
              <div
                key={type}
                className="flex items-center gap-2 rounded-md bg-background px-4 py-2 text-sm"
              >
                <Check className="h-4 w-4 text-primary" />
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-features-title">
              Everything You Need to Run Your Business
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Powerful features designed for modern businesses. Simple to use, yet powerful enough for growth.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to Transform Your Business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Join thousands of businesses already using BizFlow to streamline their operations.
          </p>
          <Button size="lg" className="mt-8" asChild data-testid="button-cta-signup">
            <a href="/api/login">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>BizFlow</span>
          </div>
          <p>Built for small & medium businesses</p>
        </div>
      </footer>
    </div>
  );
}
