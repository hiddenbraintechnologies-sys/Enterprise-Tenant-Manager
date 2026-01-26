import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  Users,
  FileText,
  Shield,
  LayoutDashboard,
  ArrowRight,
  ClipboardList,
  Globe,
} from "lucide-react";
import { LandingLayout } from "@/components/landing/landing-layout";
import { Seo } from "@/components/seo";

const businessTypes = [
  { name: "Software Services", icon: LayoutDashboard },
  { name: "Consulting", icon: ClipboardList },
  { name: "Healthcare Clinics", icon: Users },
  { name: "Co-working Spaces", icon: Calendar },
  { name: "PGs & Hostels", icon: Building2 },
  { name: "General Services", icon: FileText },
];

const features = [
  { icon: ClipboardList, text: "Projects & timesheets" },
  { icon: FileText, text: "Invoices & payments" },
  { icon: Shield, text: "Compliance support" },
  { icon: LayoutDashboard, text: "Unified dashboard" },
  { icon: Users, text: "Team collaboration" },
  { icon: Globe, text: "Multi-currency" },
];

export default function LandingGlobal() {
  return (
    <LandingLayout showCountryPrompt={true}>
      <Seo
        title="Business Management Platform for Growing Teams | MyBizStream"
        description="One dashboard for operations, invoicing, payments, and compliance. Start free. Local pricing available by country."
        canonicalUrl="https://payodsoft.co.uk/"
      />
      <section className="relative overflow-hidden px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl" data-testid="text-hero-title">
            Business management platform
            <span className="block text-primary">for growing teams</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
            One dashboard for operations, invoicing, payments, and compliance.
          </p>
          <Button size="lg" className="mt-8" asChild data-testid="button-get-started-hero">
            <a href="/register">
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-xl font-semibold sm:text-2xl" data-testid="text-modules-title">
            Built for diverse businesses
          </h2>
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {businessTypes.map((type) => (
              <div
                key={type.name}
                className="flex flex-col items-center gap-2 rounded-lg bg-background p-3 border text-center"
                data-testid={`card-business-${type.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <type.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium">{type.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-semibold sm:text-2xl" data-testid="text-features-title">
            Everything you need
          </h2>
          <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
                data-testid={`feature-${feature.text.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold sm:text-2xl" data-testid="text-final-cta-title">
            Get started today
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Free plan available. No credit card required.
          </p>
          <Button size="lg" className="mt-6" asChild data-testid="button-cta-signup">
            <a href="/register">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </LandingLayout>
  );
}
