import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CURRENCY_CONFIGS, getCurrencySymbol, formatCurrency } from "@/lib/currency-service";
import { Plus, RefreshCw, TrendingUp, TrendingDown, ArrowRightLeft, Trash2, Edit2, DollarSign } from "lucide-react";
import type { ExchangeRate } from "@shared/schema";

export default function ExchangeRatesPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [rateValue, setRateValue] = useState("");
  const [source, setSource] = useState("manual");

  const currencies = Object.keys(CURRENCY_CONFIGS);

  const { data: exchangeRates, isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/platform-admin/exchange-rates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { fromCurrency: string; toCurrency: string; rate: string; source: string }) => {
      return apiRequest("POST", "/api/platform-admin/exchange-rates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/exchange-rates"] });
      toast({ title: "Exchange rate created successfully" });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create exchange rate", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { rate?: string; source?: string } }) => {
      return apiRequest("PATCH", `/api/platform-admin/exchange-rates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/exchange-rates"] });
      toast({ title: "Exchange rate updated successfully" });
      resetForm();
      setEditingRate(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update exchange rate", description: error.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/platform-admin/exchange-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/exchange-rates"] });
      toast({ title: "Exchange rate deactivated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to deactivate exchange rate", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFromCurrency("USD");
    setToCurrency("INR");
    setRateValue("");
    setSource("manual");
  };

  const handleSubmit = () => {
    if (!rateValue || parseFloat(rateValue) <= 0) {
      toast({ title: "Please enter a valid rate", variant: "destructive" });
      return;
    }

    if (editingRate) {
      updateMutation.mutate({
        id: editingRate.id,
        data: { rate: rateValue, source },
      });
    } else {
      if (fromCurrency === toCurrency) {
        toast({ title: "From and To currencies must be different", variant: "destructive" });
        return;
      }
      createMutation.mutate({
        fromCurrency,
        toCurrency,
        rate: rateValue,
        source,
      });
    }
  };

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setFromCurrency(rate.fromCurrency);
    setToCurrency(rate.toCurrency);
    setRateValue(rate.rate);
    setSource(rate.source || "manual");
  };

  const activeRates = exchangeRates?.filter((r) => r.isActive) || [];
  const inactiveRates = exchangeRates?.filter((r) => !r.isActive) || [];

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-exchange-rates-title">Exchange Rates</h1>
          <p className="text-muted-foreground">Manage currency exchange rates for multi-currency support</p>
        </div>
        <Dialog open={isAddDialogOpen || !!editingRate} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingRate(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-exchange-rate">
              <Plus className="h-4 w-4 mr-2" />
              Add Exchange Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRate ? "Edit Exchange Rate" : "Add Exchange Rate"}</DialogTitle>
              <DialogDescription>
                {editingRate 
                  ? "Update the exchange rate value"
                  : "Create a new currency exchange rate pair"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromCurrency">From Currency</Label>
                  <Select 
                    value={fromCurrency} 
                    onValueChange={setFromCurrency}
                    disabled={!!editingRate}
                  >
                    <SelectTrigger data-testid="select-from-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((code) => (
                        <SelectItem key={code} value={code}>
                          {getCurrencySymbol(code)} {code} - {CURRENCY_CONFIGS[code].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toCurrency">To Currency</Label>
                  <Select 
                    value={toCurrency} 
                    onValueChange={setToCurrency}
                    disabled={!!editingRate}
                  >
                    <SelectTrigger data-testid="select-to-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((code) => (
                        <SelectItem key={code} value={code}>
                          {getCurrencySymbol(code)} {code} - {CURRENCY_CONFIGS[code].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-center text-muted-foreground">
                <span className="text-lg font-medium">1 {fromCurrency}</span>
                <ArrowRightLeft className="mx-3 h-5 w-5" />
                <span className="text-lg font-medium">? {toCurrency}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate">Exchange Rate</Label>
                <div className="relative">
                  <Input
                    id="rate"
                    type="number"
                    step="0.00000001"
                    placeholder="Enter rate (e.g., 83.12)"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                    data-testid="input-exchange-rate"
                  />
                </div>
                {rateValue && parseFloat(rateValue) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    1 {fromCurrency} = {parseFloat(rateValue).toFixed(4)} {toCurrency}
                    <br />
                    1 {toCurrency} = {(1 / parseFloat(rateValue)).toFixed(8)} {fromCurrency}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger data-testid="select-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    <SelectItem value="api">External API</SelectItem>
                    <SelectItem value="bank">Bank Rate</SelectItem>
                    <SelectItem value="interbank">Interbank Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingRate(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-exchange-rate"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingRate ? "Update Rate" : "Create Rate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rates</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-rates-count">
              {isLoading ? <Skeleton className="h-8 w-12" /> : activeRates.length}
            </div>
            <p className="text-xs text-muted-foreground">Currency pairs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Rates</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inactive-rates-count">
              {isLoading ? <Skeleton className="h-8 w-12" /> : inactiveRates.length}
            </div>
            <p className="text-xs text-muted-foreground">Historical rates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supported Currencies</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-supported-currencies-count">
              {currencies.length}
            </div>
            <p className="text-xs text-muted-foreground">Available currencies</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Exchange Rates</CardTitle>
          <CardDescription>Currently active currency conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activeRates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active exchange rates configured</p>
              <p className="text-sm">Add your first exchange rate to enable multi-currency support</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency Pair</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Inverse Rate</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRates.map((rate) => (
                  <TableRow key={rate.id} data-testid={`row-exchange-rate-${rate.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{rate.fromCurrency}</Badge>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline">{rate.toCurrency}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      1 {rate.fromCurrency} = {parseFloat(rate.rate).toFixed(4)} {rate.toCurrency}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      1 {rate.toCurrency} = {parseFloat(rate.inverseRate).toFixed(8)} {rate.fromCurrency}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {rate.source || "manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(rate.validFrom)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(rate)}
                          data-testid={`button-edit-rate-${rate.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deactivateMutation.mutate(rate.id)}
                          disabled={deactivateMutation.isPending}
                          data-testid={`button-deactivate-rate-${rate.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inactiveRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Rates</CardTitle>
            <CardDescription>Previously active exchange rates</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency Pair</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveRates.slice(0, 10).map((rate) => (
                  <TableRow key={rate.id} className="opacity-60" data-testid={`row-inactive-rate-${rate.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{rate.fromCurrency}</Badge>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline">{rate.toCurrency}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {parseFloat(rate.rate).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {rate.source || "manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(rate.validFrom)} - {formatDate(rate.validTo)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Inactive</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supported Currencies</CardTitle>
          <CardDescription>All currencies available in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {currencies.map((code) => {
              const config = CURRENCY_CONFIGS[code];
              return (
                <div
                  key={code}
                  className="flex items-center gap-2 p-3 rounded-md border"
                  data-testid={`currency-${code}`}
                >
                  <span className="text-lg font-bold">{config.symbol}</span>
                  <div>
                    <p className="font-medium text-sm">{code}</p>
                    <p className="text-xs text-muted-foreground">{config.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
