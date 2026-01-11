import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  MessageSquare,
  LayoutDashboard,
  ArrowRight,
  Check,
  Clock,
  Lock,
  UserCheck,
  ClipboardList,
  BadgeIndianRupee,
  Star,
  TrendingUp,
  Zap,
  Headphones,
} from "lucide-react";
import { LandingLayout } from "@/components/landing/landing-layout";
import { Seo } from "@/components/seo";

const stats = [
  { value: "500+", label: "Indian SMBs" },
  { value: "10K+", label: "GST invoices" },
  { value: "99.9%", label: "Uptime" },
  { value: "1 hr", label: "Avg. support response" },
];

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Founder, TechSoft Solutions, Mumbai",
    content: "MyBizStream simplified our invoicing and project tracking. We save hours every week on GST compliance.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "Owner, Aura Wellness Spa, Bangalore",
    content: "The booking system is intuitive. Our clients love the WhatsApp reminders.",
    rating: 5,
  },
  {
    name: "Amit Kumar",
    role: "Director, Kumar Consulting, Delhi",
    content: "Finally, a platform that understands Indian business needs. GST filing is now seamless.",
    rating: 5,
  },
];

const faqs = [
  {
    question: "Is there really a free plan?",
    answer: "Yes! Our Free plan includes core features for 1 user with up to 50 records. No credit card required to start.",
  },
  {
    question: "How does GST compliance work?",
    answer: "All invoices are automatically formatted with GST details (CGST, SGST, IGST). You can generate GST-ready reports for filing. We support both regular and composition scheme businesses.",
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer: "Absolutely. You can change your plan at any time. When upgrading, you pay the prorated difference. When downgrading, changes take effect at the next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major payment methods including UPI, credit/debit cards, net banking, and wallets through Razorpay.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use industry-standard encryption, secure authentication, and role-based access controls. Your data is stored in India and backed up regularly.",
  },
  {
    question: "Do you offer WhatsApp notifications?",
    answer: "Yes! Pro plan users get WhatsApp automation for appointment reminders, invoice notifications, and payment confirmations.",
  },
];

const trustBadges = [
  { icon: Shield, text: "Bank-grade security" },
  { icon: BadgeIndianRupee, text: "Made for India" },
  { icon: Headphones, text: "Indian support team" },
  { icon: TrendingUp, text: "Regular updates" },
];

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
    <LandingLayout>
      <Seo
        title="Simple Business Software for Indian SMBs | MyBizStream"
        description="Manage projects, invoices, GST, and payments. Start free. Plans from ₹99/month. Built for Indian businesses."
        canonicalUrl="https://payodsoft.co.uk/in"
      />
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
            Trusted by Indian businesses
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
            Join 500+ Indian businesses already using MyBizStream to simplify their operations.
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
