import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Package, Truck, Clock, CheckCircle } from "lucide-react";

interface TrackingEvent {
  id: string;
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

interface ShipmentTracking {
  id: string;
  trackingNumber: string;
  status: string;
  senderName: string;
  receiverName: string;
  originCity: string;
  destinationCity: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    picked_up: "outline",
    in_transit: "default",
    out_for_delivery: "default",
    delivered: "outline",
    failed: "destructive",
    returned: "destructive",
  };
  return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
}

function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tracking events available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
            {index < events.length - 1 && (
              <div className="w-0.5 h-full bg-muted-foreground/20 my-1" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{event.status.replace("_", " ")}</span>
              <span className="text-muted-foreground">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{event.location}</p>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackingResult({ shipment }: { shipment: ShipmentTracking }) {
  return (
    <Card data-testid={`tracking-result-${shipment.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              {shipment.trackingNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {shipment.originCity} → {shipment.destinationCity}
            </p>
          </div>
          <StatusBadge status={shipment.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div>
            <p className="text-sm font-medium">From</p>
            <p className="text-sm text-muted-foreground">{shipment.senderName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">To</p>
            <p className="text-sm text-muted-foreground">{shipment.receiverName}</p>
          </div>
        </div>
        
        {shipment.estimatedDelivery && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            <span>Estimated Delivery: {new Date(shipment.estimatedDelivery).toLocaleDateString()}</span>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-4">Tracking History</h4>
          <TrackingTimeline events={shipment.events} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LogisticsTracking() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: shipment, isLoading, isError } = useQuery<ShipmentTracking>({
    queryKey: ["/api/logistics/tracking", searchQuery],
    enabled: !!searchQuery,
  });

  const handleSearch = () => {
    if (trackingNumber.trim()) {
      setSearchQuery(trackingNumber.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <DashboardLayout title="Shipment Tracking">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  data-testid="input-tracking-number"
                />
              </div>
              <Button onClick={handleSearch} data-testid="button-track">
                <MapPin className="mr-2 h-4 w-4" />
                Track
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        )}

        {isError && searchQuery && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Shipment not found</h3>
              <p className="text-muted-foreground text-center">
                No shipment found with tracking number "{searchQuery}". Please check the number and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {shipment && <TrackingResult shipment={shipment} />}

        {!searchQuery && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Track Your Shipment</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Enter your tracking number above to get real-time updates on your shipment's location and delivery status.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
