import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, GraduationCap, BookOpen, DollarSign, Users } from "lucide-react";

interface StepProps {
  stepData: Record<string, any>;
  onComplete: (data: any) => void;
  isPending: boolean;
}

const institutionSchema = z.object({
  institutionName: z.string().min(2, "Institution name is required"),
  institutionType: z.string().min(1, "Select institution type"),
  affiliation: z.string().optional(),
  establishedYear: z.string().optional(),
});

export function InstitutionSetupStep({ stepData, onComplete, isPending }: StepProps) {
  const form = useForm({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      institutionName: stepData?.institutionName || "",
      institutionType: stepData?.institutionType || "",
      affiliation: stepData?.affiliation || "",
      establishedYear: stepData?.establishedYear || "",
    },
  });

  const handleSubmit = (data: z.infer<typeof institutionSchema>) => {
    onComplete(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Institution Details</CardTitle>
        </div>
        <CardDescription>Enter your educational institution information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="institutionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ABC Academy" {...field} data-testid="input-institution-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="institutionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-institution-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="coaching">Coaching Institute</SelectItem>
                      <SelectItem value="vocational">Vocational Training</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="affiliation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Affiliation/Board</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CBSE, State Board" {...field} data-testid="input-affiliation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="establishedYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Established Year</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 2010" {...field} data-testid="input-established-year" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-continue">
              Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

interface CourseEntry {
  name: string;
  duration: string;
  batches: string;
}

const coursesBatchesSchema = z.object({
  courses: z.array(z.object({
    name: z.string().min(1, "Course name required"),
    duration: z.string().min(1, "Duration required"),
    batches: z.string().min(1, "Number of batches required"),
  })).min(1, "Add at least one course"),
});

export function CoursesBatchesStep({ stepData, onComplete, isPending }: StepProps) {
  const [courses, setCourses] = useState<CourseEntry[]>(
    stepData?.courses || [{ name: "", duration: "", batches: "" }]
  );
  const [error, setError] = useState<string | null>(null);

  const addCourse = () => {
    setCourses([...courses, { name: "", duration: "", batches: "" }]);
    setError(null);
  };

  const removeCourse = (index: number) => {
    if (courses.length > 1) {
      setCourses(courses.filter((_, i) => i !== index));
    }
  };

  const updateCourse = (index: number, field: keyof CourseEntry, value: string) => {
    const updated = [...courses];
    updated[index][field] = value;
    setCourses(updated);
    setError(null);
  };

  const handleSubmit = () => {
    const validCourses = courses.filter(c => c.name && c.duration && c.batches);
    if (validCourses.length === 0) {
      setError("Please add at least one complete course with name, duration, and batches");
      return;
    }
    onComplete({ courses: validCourses });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Courses & Batches</CardTitle>
        </div>
        <CardDescription>Add your courses and student batches</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {courses.map((course, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Course Name *</Label>
                <Input
                  placeholder="e.g., Class 10"
                  value={course.name}
                  onChange={(e) => updateCourse(index, "name", e.target.value)}
                  data-testid={`input-course-name-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Duration *</Label>
                <Input
                  placeholder="e.g., 1 year"
                  value={course.duration}
                  onChange={(e) => updateCourse(index, "duration", e.target.value)}
                  data-testid={`input-course-duration-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Batches *</Label>
                <Input
                  placeholder="e.g., 3"
                  value={course.batches}
                  onChange={(e) => updateCourse(index, "batches", e.target.value)}
                  data-testid={`input-course-batches-${index}`}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeCourse(index)}
              disabled={courses.length === 1}
              data-testid={`button-remove-course-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addCourse} className="w-full" data-testid="button-add-course">
          <Plus className="h-4 w-4 mr-2" /> Add Course
        </Button>
        {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface FeeEntry {
  category: string;
  amount: string;
  frequency: string;
}

export function FeeStructureStep({ stepData, onComplete, isPending }: StepProps) {
  const [fees, setFees] = useState<FeeEntry[]>(
    stepData?.fees || [{ category: "", amount: "", frequency: "monthly" }]
  );
  const [error, setError] = useState<string | null>(null);

  const addFee = () => {
    setFees([...fees, { category: "", amount: "", frequency: "monthly" }]);
    setError(null);
  };

  const removeFee = (index: number) => {
    if (fees.length > 1) {
      setFees(fees.filter((_, i) => i !== index));
    }
  };

  const updateFee = (index: number, field: keyof FeeEntry, value: string) => {
    const updated = [...fees];
    updated[index][field] = value;
    setFees(updated);
    setError(null);
  };

  const handleSubmit = () => {
    const validFees = fees.filter(f => f.category && f.amount);
    if (validFees.length === 0) {
      setError("Please add at least one fee category with name and amount");
      return;
    }
    onComplete({ fees: validFees });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Fee Structure</CardTitle>
        </div>
        <CardDescription>Set up your fee categories and amounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fees.map((fee, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Category *</Label>
                <Input
                  placeholder="e.g., Tuition Fee"
                  value={fee.category}
                  onChange={(e) => updateFee(index, "category", e.target.value)}
                  data-testid={`input-fee-category-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount *</Label>
                <Input
                  placeholder="e.g., 5000"
                  value={fee.amount}
                  onChange={(e) => updateFee(index, "amount", e.target.value)}
                  data-testid={`input-fee-amount-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Frequency</Label>
                <Select value={fee.frequency} onValueChange={(v) => updateFee(index, "frequency", v)}>
                  <SelectTrigger data-testid={`select-fee-frequency-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeFee(index)}
              disabled={fees.length === 1}
              data-testid={`button-remove-fee-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addFee} className="w-full" data-testid="button-add-fee">
          <Plus className="h-4 w-4 mr-2" /> Add Fee Category
        </Button>
        {error && <p className="text-sm text-destructive" data-testid="text-error">{error}</p>}
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface StaffEntry {
  name: string;
  role: string;
  email: string;
}

export function AdminStaffStep({ stepData, onComplete, isPending }: StepProps) {
  const [staff, setStaff] = useState<StaffEntry[]>(
    stepData?.staff || [{ name: "", role: "", email: "" }]
  );

  const addStaff = () => {
    setStaff([...staff, { name: "", role: "", email: "" }]);
  };

  const removeStaff = (index: number) => {
    if (staff.length > 1) {
      setStaff(staff.filter((_, i) => i !== index));
    }
  };

  const updateStaff = (index: number, field: keyof StaffEntry, value: string) => {
    const updated = [...staff];
    updated[index][field] = value;
    setStaff(updated);
  };

  const handleSubmit = () => {
    const validStaff = staff.filter(s => s.name && s.role);
    onComplete({ staff: validStaff });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Admin Staff</CardTitle>
        </div>
        <CardDescription>Add administrative staff members (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.map((member, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  placeholder="Staff name"
                  value={member.name}
                  onChange={(e) => updateStaff(index, "name", e.target.value)}
                  data-testid={`input-staff-name-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Input
                  placeholder="e.g., Principal"
                  value={member.role}
                  onChange={(e) => updateStaff(index, "role", e.target.value)}
                  data-testid={`input-staff-role-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  placeholder="email@example.com"
                  value={member.email}
                  onChange={(e) => updateStaff(index, "email", e.target.value)}
                  data-testid={`input-staff-email-${index}`}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeStaff(index)}
              disabled={staff.length === 1}
              data-testid={`button-remove-staff-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addStaff} className="w-full" data-testid="button-add-staff">
          <Plus className="h-4 w-4 mr-2" /> Add Staff Member
        </Button>
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
