import { useCountry } from "@/contexts/country-context";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function CountrySelector() {
  const { country, setCountry, supportedCountries } = useCountry();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-country-selector">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{country.name}</span>
          <Badge variant="secondary" className="text-xs">
            {country.currency.symbol}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Select Region
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedCountries.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCountry(c.code)}
            className={`flex items-center justify-between gap-2 ${country.code === c.code ? "bg-accent" : ""}`}
            data-testid={`menu-item-country-${c.code.toLowerCase()}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{c.flag}</span>
              <span>{c.name}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              {c.currency.symbol} {c.currency.code}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
