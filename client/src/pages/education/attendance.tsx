import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: "present" | "absent" | "late" | "excused";
  date: string;
}

interface Batch {
  id: string;
  name: string;
}

function AttendanceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    present: "default",
    absent: "destructive",
    late: "secondary",
    excused: "outline",
  };
  const icons: Record<string, JSX.Element | undefined> = {
    present: <CheckCircle className="h-3 w-3 mr-1" />,
    absent: <XCircle className="h-3 w-3 mr-1" />,
    late: <Clock className="h-3 w-3 mr-1" />,
  };
  return (
    <Badge variant={variants[status] || "outline"} className="flex items-center">
      {icons[status]}
      {status}
    </Badge>
  );
}

function StudentAttendanceRow({ 
  student, 
  attendance, 
  onStatusChange 
}: { 
  student: Student;
  attendance?: AttendanceRecord;
  onStatusChange: (studentId: string, status: string) => void;
}) {
  const currentStatus = attendance?.status || "present";

  return (
    <div className="flex items-center justify-between p-3 border rounded-md" data-testid={`attendance-row-${student.id}`}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
          {student.firstName[0]}{student.lastName[0]}
        </div>
        <span className="font-medium">{student.firstName} {student.lastName}</span>
      </div>
      <Select value={currentStatus} onValueChange={(value) => onStatusChange(student.id, value)}>
        <SelectTrigger className="w-32" data-testid={`select-status-${student.id}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="present">Present</SelectItem>
          <SelectItem value="absent">Absent</SelectItem>
          <SelectItem value="late">Late</SelectItem>
          <SelectItem value="excused">Excused</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function EducationAttendance() {
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: batches = [], isLoading: batchesLoading } = useQuery<Batch[]>({
    queryKey: ["/api/education/batches"],
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/education/students", selectedBatch],
    enabled: !!selectedBatch,
  });

  const { data: existingAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/education/attendance", selectedBatch, selectedDate],
    enabled: !!selectedBatch && !!selectedDate,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { batchId: string; date: string; attendance: Record<string, string> }) =>
      apiRequest("POST", "/api/education/attendance", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/education/attendance"] });
      toast({ title: "Attendance saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save attendance", variant: "destructive" });
    },
  });

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = () => {
    if (!selectedBatch) {
      toast({ title: "Please select a batch", variant: "destructive" });
      return;
    }

    const finalAttendance: Record<string, string> = {};
    students.forEach((student) => {
      const existing = existingAttendance.find((a) => a.studentId === student.id);
      finalAttendance[student.id] = attendanceData[student.id] || existing?.status || "present";
    });

    saveMutation.mutate({
      batchId: selectedBatch,
      date: selectedDate,
      attendance: finalAttendance,
    });
  };

  const presentCount = students.filter((s) => {
    const status = attendanceData[s.id] || existingAttendance.find((a) => a.studentId === s.id)?.status || "present";
    return status === "present";
  }).length;

  const absentCount = students.filter((s) => {
    const status = attendanceData[s.id] || existingAttendance.find((a) => a.studentId === s.id)?.status;
    return status === "absent";
  }).length;

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Select Batch</label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger data-testid="select-batch">
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <Button onClick={handleSave} disabled={!selectedBatch || saveMutation.isPending} data-testid="button-save">
                {saveMutation.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedBatch && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{students.length}</p>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{presentCount}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{absentCount}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {studentsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : students.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {students.map((student) => (
                  <StudentAttendanceRow
                    key={student.id}
                    student={student}
                    attendance={existingAttendance.find((a) => a.studentId === student.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : selectedBatch ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No students in this batch</h3>
              <p className="text-muted-foreground">Add students to this batch to mark attendance</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a batch</h3>
              <p className="text-muted-foreground">Choose a batch above to mark attendance</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
