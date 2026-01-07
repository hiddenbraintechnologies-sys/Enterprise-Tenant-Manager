import { useCountry } from "@/contexts/country-context";
import { Globe, Check } from "lucide-react";
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
  const { country, setCountry, supportedCountries, isLocked } = useCountry();

  // If locked to a single country (tenant mode), show a static display
  if (isLocked) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md bg-muted/50" data-testid="display-country-locked">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">{country.name}</span>
        <Badge variant="secondary" className="text-xs">
          {country.currency.code}
        </Badge>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-country-selector">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{country.name}</span>
          <Badge variant="secondary" className="text-xs">
            {country.currency.code}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Select Region
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedCountries.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCountry(c.code)}
            className="flex items-center justify-between gap-2"
            data-testid={`menu-item-country-${c.code.toLowerCase()}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded border bg-muted text-xs font-medium">
                {c.flag}
              </div>
              <span>{c.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {c.currency.symbol} {c.currency.code}
              </span>
              {country.code === c.code && <Check className="h-4 w-4 text-primary" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
