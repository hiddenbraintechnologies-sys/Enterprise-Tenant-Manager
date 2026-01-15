import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  LogOut, 
  Calendar,
  DollarSign,
  User,
  Clock
} from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
}

interface Payslip {
  id: string;
  month: number;
  year: number;
  gross: string;
  net: string;
  totalDeductions: string;
  status: string;
  createdAt: string;
}

const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function EmployeePayslips() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("employee_portal_user");
    if (stored) {
      setEmployee(JSON.parse(stored));
    } else {
      setLocation("/employee/login");
    }
  }, [setLocation]);

  const { data: payslips, isLoading } = useQuery<Payslip[]>({
    queryKey: ["/api/employee-portal/payslips"],
    enabled: !!employee,
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/employee-portal/logout", {
        method: "POST",
        credentials: "include",
      });
      localStorage.removeItem("employee_portal_user");
      setLocation("/employee/login");
    } catch (error) {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  const handleDownloadPdf = async (payslipId: string) => {
    try {
      window.open(`/api/employee-portal/payslips/${payslipId}/pdf`, "_blank");
    } catch (error) {
      toast({ title: "Failed to download payslip", variant: "destructive" });
    }
  };

  if (!employee) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium" data-testid="text-employee-name">
                {employee.firstName} {employee.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{employee.designation}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">My Payslips</h1>
            <p className="text-muted-foreground">View and download your salary statements</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/employee/attendance")} data-testid="button-view-attendance">
            <Clock className="mr-2 h-4 w-4" />
            View Attendance
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-10 w-32 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : payslips && payslips.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {payslips.map((payslip) => (
              <Card key={payslip.id} className="hover-elevate transition-all" data-testid={`card-payslip-${payslip.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {monthNames[payslip.month]} {payslip.year}
                    </CardTitle>
                    <Badge 
                      variant={payslip.status === "paid" ? "default" : "secondary"}
                      data-testid={`badge-status-${payslip.id}`}
                    >
                      {payslip.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Net Pay</span>
                    <span className="text-2xl font-bold flex items-center" data-testid={`text-net-pay-${payslip.id}`}>
                      <DollarSign className="h-5 w-5" />
                      {parseFloat(payslip.net).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                    <div>Gross: {parseFloat(payslip.gross).toLocaleString()}</div>
                    <div>Deductions: {parseFloat(payslip.totalDeductions || "0").toLocaleString()}</div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownloadPdf(payslip.id)}
                    data-testid={`button-download-${payslip.id}`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-xl mb-2">No Payslips Found</CardTitle>
              <CardDescription>Your payslips will appear here once they are generated.</CardDescription>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
