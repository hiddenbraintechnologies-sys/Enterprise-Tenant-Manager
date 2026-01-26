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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Calendar, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const examFormSchema = z.object({
  name: z.string().min(1, "Exam name is required"),
  courseId: z.string().min(1, "Course is required"),
  date: z.string().min(1, "Date is required"),
  duration: z.coerce.number().min(1, "Duration is required"),
  totalMarks: z.coerce.number().min(1, "Total marks is required"),
  passingMarks: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]).default("scheduled"),
});

type ExamFormValues = z.infer<typeof examFormSchema>;

interface Exam {
  id: string;
  name: string;
  courseId: string;
  courseName?: string;
  date: string;
  duration: number;
  totalMarks: number;
  passingMarks?: number;
  description?: string;
  status: string;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
}

function ExamStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    scheduled: "secondary",
    ongoing: "default",
    completed: "outline",
    cancelled: "destructive",
  };
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
}

function ExamCard({ exam }: { exam: Exam }) {
  return (
    <Card data-testid={`card-exam-${exam.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{exam.name}</CardTitle>
          <ExamStatusBadge status={exam.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {exam.courseName && (
            <p className="font-medium text-muted-foreground">{exam.courseName}</p>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(exam.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{exam.duration} minutes</span>
          </div>
          <p className="text-muted-foreground">
            Total Marks: {exam.totalMarks}
            {exam.passingMarks ? ` (Pass: ${exam.passingMarks})` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ExamFormDialog({
  open,
  onOpenChange,
  courses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
}) {
  const { toast } = useToast();
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      name: "",
      courseId: "",
      date: "",
      duration: 60,
      totalMarks: 100,
      passingMarks: 40,
      description: "",
      status: "scheduled",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ExamFormValues) =>
      apiRequest("POST", "/api/education/exams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/education/exams"] });
      toast({ title: "Exam scheduled successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to schedule exam", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Exam</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mid-Term Examination" {...field} data-testid="input-exam-name" />
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
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} data-testid="input-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (mins)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} data-testid="input-duration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalMarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Marks</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} data-testid="input-total-marks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="passingMarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passing Marks (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} data-testid="input-passing-marks" />
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
                    <Textarea placeholder="Exam details..." {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-exam">
              {createMutation.isPending ? "Scheduling..." : "Schedule Exam"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function EducationExams() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/education/exams"],
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/education/courses"],
  });

  const filteredExams = exams?.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Exams">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-exams"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-exam">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Exam
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
        ) : filteredExams && filteredExams.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No exams found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try a different search term" : "Schedule your first exam to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-exam">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Exam
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <ExamFormDialog open={dialogOpen} onOpenChange={setDialogOpen} courses={courses} />
    </DashboardLayout>
  );
}
