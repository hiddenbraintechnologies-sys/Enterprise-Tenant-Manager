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
import { Plus, Search, Users, Calendar, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const batchFormSchema = z.object({
  name: z.string().min(1, "Batch name is required"),
  courseId: z.string().min(1, "Course is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  maxStudents: z.coerce.number().min(1).optional(),
  schedule: z.string().optional(),
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).default("upcoming"),
});

type BatchFormValues = z.infer<typeof batchFormSchema>;

interface Batch {
  id: string;
  name: string;
  courseId: string;
  courseName?: string;
  startDate: string;
  endDate?: string;
  maxStudents?: number;
  enrolledStudents?: number;
  schedule?: string;
  status: string;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
}

function BatchStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    upcoming: "secondary",
    ongoing: "default",
    completed: "outline",
    cancelled: "destructive",
  };
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
}

function BatchCard({ batch }: { batch: Batch }) {
  return (
    <Card data-testid={`card-batch-${batch.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{batch.name}</CardTitle>
          <BatchStatusBadge status={batch.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {batch.courseName && (
            <p className="font-medium text-muted-foreground">{batch.courseName}</p>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(batch.startDate).toLocaleDateString()}
              {batch.endDate && ` - ${new Date(batch.endDate).toLocaleDateString()}`}
            </span>
          </div>
          {batch.schedule && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{batch.schedule}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {batch.enrolledStudents || 0}
              {batch.maxStudents ? ` / ${batch.maxStudents}` : ""} students
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BatchFormDialog({
  open,
  onOpenChange,
  courses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
}) {
  const { toast } = useToast();
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      name: "",
      courseId: "",
      startDate: "",
      endDate: "",
      schedule: "",
      status: "upcoming",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: BatchFormValues) =>
      apiRequest("POST", "/api/education/batches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/education/batches"] });
      toast({ title: "Batch created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create batch", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Batch</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Morning Batch - Jan 2026" {...field} data-testid="input-batch-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-course">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="maxStudents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Students (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="e.g., 30" {...field} data-testid="input-max-students" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mon-Fri 9AM-12PM" {...field} data-testid="input-schedule" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-batch">
              {createMutation.isPending ? "Creating..." : "Create Batch"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function EducationBatches() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: batches, isLoading } = useQuery<Batch[]>({
    queryKey: ["/api/education/batches"],
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/education/courses"],
  });

  const filteredBatches = batches?.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Batches">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search batches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-batches"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-batch">
            <Plus className="mr-2 h-4 w-4" />
            Create Batch
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
        ) : filteredBatches && filteredBatches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No batches found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Create your first batch to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-batch">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Batch
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <BatchFormDialog open={dialogOpen} onOpenChange={setDialogOpen} courses={courses} />
    </DashboardLayout>
  );
}
