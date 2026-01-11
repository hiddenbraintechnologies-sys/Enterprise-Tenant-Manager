import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  Users,
  FileText,
  Shield,
  MessageSquare,
  LayoutDashboard,
  ArrowRight,
  Check,
  Clock,
  Lock,
  UserCheck,
  ClipboardList,
  BadgeIndianRupee,
} from "lucide-react";
import { LandingLayout } from "@/components/landing/landing-layout";

const businessTypes = [
  { name: "Software Services & IT Companies", icon: LayoutDashboard },
  { name: "Consulting Firms", icon: ClipboardList },
  { name: "Furniture Manufacturing & Sales", icon: Building2 },
  { name: "Clinics & Small Healthcare Practices", icon: UserCheck },
  { name: "Co-working Spaces", icon: Users },
  { name: "PGs & Hostels", icon: Building2 },
  { name: "General Service Businesses", icon: Calendar },
];

const features = [
  { icon: ClipboardList, text: "Projects & timesheets" },
  { icon: FileText, text: "Invoices & payment tracking" },
  { icon: BadgeIndianRupee, text: "GST-ready billing" },
  { icon: MessageSquare, text: "WhatsApp automation (Pro)" },
  { icon: Shield, text: "Secure admin controls" },
  { icon: LayoutDashboard, text: "One simple dashboard" },
];

const securityFeatures = [
  { icon: Lock, text: "Secure login" },
  { icon: UserCheck, text: "Role-based access" },
  { icon: Shield, text: "Admin 2FA" },
  { icon: Clock, text: "Session control" },
  { icon: ClipboardList, text: "Audit logs" },
];

const onboardingSteps = [
  { step: 1, title: "Sign up", description: "Create your free account" },
  { step: 2, title: "Choose your business type", description: "Tell us about your business" },
  { step: 3, title: "Start using the dashboard", description: "Get productive immediately" },
  { step: 4, title: "Upgrade only when needed", description: "Grow at your own pace" },
];

export default function LandingIndia() {
  return (
    <LandingLayout currentCountry="IN">
      <section className="relative overflow-hidden px-6 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl" data-testid="text-hero-title">
            Simple business software
            <span className="block text-primary">for Indian SMBs</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Start free. Upgrade only when you grow.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild data-testid="button-get-started-hero">
              <a href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-view-pricing">
              <a href="#pricing">View Pricing</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-businesses-title">
            Built for real Indian businesses
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businessTypes.map((type) => (
              <div
                key={type.name}
                className="flex items-center gap-3 rounded-lg bg-background p-4 border"
                data-testid={`card-business-${type.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <type.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{type.name}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Restaurants & Hotels — Coming Soon
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-features-title">
            Everything you need to run your business
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-4 rounded-lg border bg-card p-5"
                data-testid={`feature-${feature.text.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-pricing-title">
            Simple, honest pricing
          </h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Card className="relative" data-testid="card-pricing-free">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">FREE</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">₹0</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>1 user</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>50 records</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Core dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>No credit card</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/register">Get Started</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative" data-testid="card-pricing-basic">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">BASIC</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">₹99</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>3 users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>500 records</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Invoices & GST</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/register">Get Started</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative border-primary" data-testid="card-pricing-pro">
              <Badge className="absolute -top-3 right-4">Most Popular</Badge>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">PRO</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">₹199</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>10 users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Unlimited records</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>WhatsApp automation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <a href="/register">Get Started</a>
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Upgrade only when you need it. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-onboarding-title">
            Get started in minutes
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {onboardingSteps.map((item) => (
              <div key={item.step} className="text-center" data-testid={`step-${item.step}`}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mt-4 font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-security-title">
            Built with security in mind
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            {securityFeatures.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-3 rounded-lg border bg-background px-5 py-3"
                data-testid={`security-${feature.text.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <feature.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl" data-testid="text-final-cta-title">
            Start free today
          </h2>
          <Button size="lg" className="mt-8" asChild data-testid="button-cta-signup">
            <a href="/register">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required
          </p>
        </div>
      </section>
    </LandingLayout>
  );
}
