import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { Globe } from "lucide-react";

interface Country {
  code: string;
  name: string;
  flag: string;
  isLive: boolean;
}

const COUNTRIES: Country[] = [
  { code: "in", name: "India", flag: "IN", isLive: true },
  { code: "uae", name: "UAE", flag: "AE", isLive: false },
  { code: "uk", name: "United Kingdom", flag: "UK", isLive: false },
  { code: "sg", name: "Singapore", flag: "SG", isLive: false },
  { code: "my", name: "Malaysia", flag: "MY", isLive: false }
];

interface LandingLayoutProps {
  children: React.ReactNode;
  currentCountry?: string;
  onCountryChange?: (country: string) => void;
}

export function LandingLayout({ children, currentCountry = "in", onCountryChange }: LandingLayoutProps) {
  const handleCountryChange = (code: string) => {
    localStorage.setItem("app:country", code);
    document.cookie = `country=${code};path=/;max-age=31536000`;
    onCountryChange?.(code);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold" data-testid="link-logo">
            MyBizStream
          </Link>

          <div className="flex items-center gap-3">
            <Select value={currentCountry} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-[140px]" data-testid="select-country">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem 
                    key={country.code} 
                    value={country.code}
                    data-testid={`select-country-${country.code}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ThemeToggle />

            <Button asChild variant="outline" data-testid="button-login">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild data-testid="button-register">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">MyBizStream</h3>
              <p className="text-sm text-muted-foreground">
                Streamline your business operations with our all-in-one platform.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing" data-testid="link-footer-pricing">Pricing</Link></li>
                <li><Link href="/features" data-testid="link-footer-features">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" data-testid="link-footer-privacy">Privacy Policy</Link></li>
                <li><Link href="/terms" data-testid="link-footer-terms">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact" data-testid="link-footer-contact">Contact Us</Link></li>
                <li><Link href="/help" data-testid="link-footer-help">Help Center</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MyBizStream. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { COUNTRIES };
