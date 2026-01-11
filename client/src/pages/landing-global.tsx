import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Star,
  TrendingUp,
  Zap,
  Headphones,
} from "lucide-react";
import { LandingLayout } from "@/components/landing/landing-layout";
import { Seo } from "@/components/seo";

const stats = [
  { value: "500+", label: "Businesses served" },
  { value: "10K+", label: "Invoices generated" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support available" },
];

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Founder, TechSoft Solutions",
    content: "MyBizStream simplified our invoicing and project tracking. We save hours every week.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "Owner, Wellness Spa",
    content: "The booking system is intuitive. Our clients love the automated reminders.",
    rating: 5,
  },
  {
    name: "Amit Kumar",
    role: "Director, Kumar Consulting",
    content: "Finally, a platform that understands Indian business needs. GST compliance is seamless.",
    rating: 5,
  },
];

const faqs = [
  {
    question: "Is there really a free plan?",
    answer: "Yes! Our Free plan includes core features for 1 user with up to 50 records. No credit card required to start.",
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer: "Absolutely. You can change your plan at any time. When upgrading, you pay the prorated difference. When downgrading, changes take effect at the next billing cycle.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use industry-standard encryption, secure authentication, and role-based access controls. Your data is backed up regularly and never shared with third parties.",
  },
  {
    question: "Do you support multiple currencies?",
    answer: "Yes! We support 15+ currencies with automatic exchange rate updates for international invoicing and payments.",
  },
  {
    question: "What kind of support do you offer?",
    answer: "Free users get community support. Paid plans include email support with response within 24 hours. Pro plans get priority support with faster response times.",
  },
];

const trustBadges = [
  { icon: Shield, text: "Bank-grade security" },
  { icon: Zap, text: "99.9% uptime SLA" },
  { icon: Headphones, text: "Dedicated support" },
  { icon: TrendingUp, text: "Regular updates" },
];

const businessTypes = [
  { name: "Software Services", icon: LayoutDashboard },
  { name: "Consulting", icon: ClipboardList },
  { name: "Furniture Manufacturing", icon: Building2 },
  { name: "Healthcare Clinics", icon: Users },
  { name: "Co-working Spaces", icon: Calendar },
  { name: "PGs & Hostels", icon: Building2 },
  { name: "General Services", icon: FileText },
];

const features = [
  { icon: ClipboardList, text: "Projects & timesheets" },
  { icon: FileText, text: "Invoices & payment tracking" },
  { icon: Shield, text: "Local compliance support" },
  { icon: LayoutDashboard, text: "One unified dashboard" },
  { icon: Users, text: "Team collaboration" },
  { icon: Globe, text: "Multi-currency support" },
];

export default function LandingGlobal() {
  return (
    <LandingLayout showCountryPrompt={true}>
      <Seo
        title="Business Management Platform for Growing Teams | MyBizStream"
        description="One dashboard for operations, invoicing, payments, and compliance. Start free. Local pricing available by country."
        canonicalUrl="https://payodsoft.co.uk/"
      />
      <section className="relative overflow-hidden px-6 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl" data-testid="text-hero-title">
            Business management platform
            <span className="block text-primary">for growing teams</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            One dashboard for operations, invoicing, payments, and compliance.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild data-testid="button-get-started-hero">
              <a href="/register">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Launching country-specific pricing & compliance packs.
          </p>
          <a 
            href="/in" 
            className="mt-3 inline-flex items-center text-sm text-primary hover:underline"
            data-testid="link-india-pricing"
          >
            See India pricing
            <ArrowRight className="ml-1 h-3 w-3" />
          </a>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-modules-title">
            Built for diverse businesses
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

      <section className="border-t bg-primary/5 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-testimonials-title">
            Trusted by growing businesses
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="bg-card" data-testid={`testimonial-${testimonial.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-6">
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">"{testimonial.content}"</p>
                  <div className="mt-4">
                    <div className="font-medium">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl" data-testid="text-pricing-title">
            Local pricing available by country
          </h2>
          <p className="mt-4 text-muted-foreground">
            Select your country to see pricing in your local currency with region-specific features.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card className="text-center" data-testid="card-tier-free">
              <CardHeader>
                <CardTitle>Free</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Get started at no cost</p>
              </CardContent>
            </Card>
            <Card className="text-center border-primary" data-testid="card-tier-basic">
              <CardHeader>
                <CardTitle>Basic</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">For small teams</p>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="card-tier-pro">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Full features unlocked</p>
              </CardContent>
            </Card>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Choose your country above to see detailed pricing.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl" data-testid="text-faq-title">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} data-testid={`faq-item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {trustBadges.map((badge) => (
              <div
                key={badge.text}
                className="flex items-center gap-2"
                data-testid={`trust-${badge.text.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <badge.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{badge.text}</span>
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
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Join hundreds of businesses already using MyBizStream to streamline their operations.
          </p>
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
