import { PlayCircle, UserPlus, Settings, BarChart3 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign Up Free",
    description: "Create your account in seconds. No credit card required to get started.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Configure Your Business",
    description: "Select your business type and customize modules to match your workflow.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Start Managing",
    description: "Add customers, create invoices, track projects, and grow your business.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-20 border-t" data-testid="section-how-it-works">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <PlayCircle className="h-4 w-4" />
            How It Works
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl" data-testid="text-how-it-works-title">
            Get started in 3 simple steps
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            From signup to managing your entire business - it takes just minutes to get up and running.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center p-6"
              data-testid={`step-${step.number}`}
            >
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-muted-foreground/30" />
              )}
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                <step.icon className="h-7 w-7" />
              </div>
              <span className="text-xs font-bold text-primary mb-2">STEP {step.number}</span>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
