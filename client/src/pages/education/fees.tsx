import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, DollarSign, Calendar, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const feeFormSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  feeType: z.string().min(1, "Fee type is required"),
  amount: z.coerce.number().min(0, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue", "waived"]).default("pending"),
});

type FeeFormValues = z.infer<typeof feeFormSchema>;

interface FeeRecord {
  id: string;
  studentId: string;
  studentName?: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate?: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

function FeeStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    paid: "default",
    overdue: "destructive",
    waived: "outline",
  };
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
}

function FeeCard({ fee }: { fee: FeeRecord }) {
  const balance = fee.amount - fee.paidAmount;

  return (
    <Card data-testid={`card-fee-${fee.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{fee.feeType}</CardTitle>
          <FeeStatusBadge status={fee.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {fee.studentName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{fee.studentName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Due: {new Date(fee.dueDate).toLocaleDateString()}</span>
          </div>
          <div className="pt-2 border-t mt-2">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-semibold">₹{fee.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid:</span>
              <span>₹{fee.paidAmount.toLocaleString()}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between text-destructive font-semibold">
                <span>Balance:</span>
                <span>₹{balance.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeeFormDialog({
  open,
  onOpenChange,
  students,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
}) {
  const { toast } = useToast();
  const form = useForm<FeeFormValues>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: {
      studentId: "",
      feeType: "",
      amount: 0,
      dueDate: "",
      description: "",
      status: "pending",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FeeFormValues) =>
      apiRequest("POST", "/api/education/fees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/education/fees"] });
      toast({ title: "Fee record created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create fee record", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fee Record</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-student">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="feeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-fee-type">
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tuition">Tuition Fee</SelectItem>
                      <SelectItem value="admission">Admission Fee</SelectItem>
                      <SelectItem value="exam">Exam Fee</SelectItem>
                      <SelectItem value="library">Library Fee</SelectItem>
                      <SelectItem value="lab">Lab Fee</SelectItem>
                      <SelectItem value="sports">Sports Fee</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} data-testid="input-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-due-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional notes..." {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-fee">
              {createMutation.isPending ? "Creating..." : "Add Fee Record"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function EducationFees() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: fees, isLoading } = useQuery<FeeRecord[]>({
    queryKey: ["/api/education/fees"],
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/education/students"],
  });

  const filteredFees = fees?.filter((f) =>
    f.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    f.feeType.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = fees?.filter((f) => f.status === "pending" || f.status === "overdue")
    .reduce((sum, f) => sum + (f.amount - f.paidAmount), 0) || 0;

  const totalCollected = fees?.reduce((sum, f) => sum + f.paidAmount, 0) || 0;

  return (
    <DashboardLayout title="Fees">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">₹{totalCollected.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending Collection</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search fees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-fees"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-fee">
            <Plus className="mr-2 h-4 w-4" />
            Add Fee Record
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFees && filteredFees.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFees.map((fee) => (
              <FeeCard key={fee.id} fee={fee} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No fee records found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Add your first fee record to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-fee">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fee Record
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <FeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} students={students} />
    </DashboardLayout>
  );
}
