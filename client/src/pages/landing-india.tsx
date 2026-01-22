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
import { Seo } from "@/components/seo";
import { useTranslation } from "react-i18next";

export default function LandingIndia() {
  const { t } = useTranslation();

  const businessTypes = [
    { key: "software", icon: LayoutDashboard },
    { key: "consulting", icon: ClipboardList },
    { key: "furniture", icon: Building2 },
    { key: "healthcare", icon: UserCheck },
    { key: "coworking", icon: Users },
    { key: "pgs", icon: Building2 },
    { key: "general", icon: Calendar },
  ];

  const features = [
    { key: "projects", icon: ClipboardList },
    { key: "invoices", icon: FileText },
    { key: "gst", icon: BadgeIndianRupee },
    { key: "whatsapp", icon: MessageSquare },
    { key: "security", icon: Shield },
    { key: "dashboard", icon: LayoutDashboard },
  ];

  const securityFeatures = [
    { key: "login", icon: Lock },
    { key: "roles", icon: UserCheck },
    { key: "twoFa", icon: Shield },
    { key: "session", icon: Clock },
    { key: "audit", icon: ClipboardList },
  ];

  return (
    <LandingLayout>
      <Seo
        title="Simple Business Software for Indian SMBs | MyBizStream"
        description="Manage projects, invoices, GST, and payments. Start free. Plans from ₹99/month. Built for Indian businesses."
        canonicalUrl="https://payodsoft.co.uk/in"
      />
      <section className="relative overflow-hidden px-6 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl" data-testid="text-hero-title">
            {t("landing.india.heroTitle")}
            <span className="block text-primary">{t("landing.india.heroTitleHighlight")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t("landing.india.heroDescription")}
            <span className="block mt-2">{t("landing.india.heroSubtext")}</span>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("landing.india.trustText")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild data-testid="button-get-started-hero">
              <a href="/register">
                {t("landing.india.getStartedFree")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-view-pricing">
              <a href="#pricing">{t("landing.india.viewPricing")}</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-businesses-title">
            {t("landing.india.builtForTitle")}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businessTypes.map((type) => (
              <div
                key={type.key}
                className="flex items-center gap-3 rounded-lg bg-background p-4 border"
                data-testid={`card-business-${type.key}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <type.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{t(`landing.india.businessTypes.${type.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-features-title">
            {t("landing.india.featuresTitle")}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="flex items-center gap-4 rounded-lg border bg-card p-5"
                data-testid={`feature-${feature.key}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{t(`landing.india.features.${feature.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-pricing-title">
            {t("landing.india.pricingTitle")}
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
                  <a href="/register">{t("landing.india.getStartedFree")}</a>
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
                  <a href="/register">{t("landing.india.getStartedFree")}</a>
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
                  <a href="/register">{t("landing.india.getStartedFree")}</a>
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("landing.india.pricingSubtitle")}
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-onboarding-title">
            {t("landing.india.onboardingTitle")}
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center" data-testid="step-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                1
              </div>
              <h3 className="mt-4 font-medium">{t("landing.india.onboarding.step1Title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("landing.india.onboarding.step1Desc")}</p>
            </div>
            <div className="text-center" data-testid="step-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                2
              </div>
              <h3 className="mt-4 font-medium">{t("landing.india.onboarding.step2Title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("landing.india.onboarding.step2Desc")}</p>
            </div>
            <div className="text-center" data-testid="step-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                3
              </div>
              <h3 className="mt-4 font-medium">{t("landing.india.onboarding.step3Title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("landing.india.onboarding.step3Desc")}</p>
            </div>
            <div className="text-center" data-testid="step-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                4
              </div>
              <h3 className="mt-4 font-medium">{t("landing.india.onboarding.step4Title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("landing.india.onboarding.step4Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-security-title">
            {t("landing.india.securityTitle")}
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            {securityFeatures.map((feature) => (
              <div
                key={feature.key}
                className="flex items-center gap-3 rounded-lg border bg-background px-5 py-3"
                data-testid={`security-${feature.key}`}
              >
                <feature.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{t(`landing.india.security.${feature.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl" data-testid="text-final-cta-title">
            {t("landing.india.getStartedFree")}
          </h2>
          <Button size="lg" className="mt-8" asChild data-testid="button-cta-signup">
            <a href="/register">
              {t("landing.india.getStartedFree")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </LandingLayout>
  );
}
