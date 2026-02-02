import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/tenant-context";
import { useCountry } from "@/contexts/country-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Customer, Booking } from "@shared/schema";
import { format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  User,
  Upload,
  Link2,
  Trash2,
  AlertTriangle,
  Pill,
  Heart,
  ClipboardList,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";

const CLINIC_BUSINESS_TYPES = ["clinic", "clinic_healthcare", "hospital", "diagnostics"];

interface PatientDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

const patientProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  medicalNotes: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  bloodType: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type PatientProfileValues = z.infer<typeof patientProfileSchema>;

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { businessType } = useTenant();
  const { formatCurrency } = useCountry();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [documents, setDocuments] = useState<PatientDocument[]>([]);

  const isClinic = CLINIC_BUSINESS_TYPES.includes(businessType || "");
  const entityLabel = isClinic ? "Patient" : "Customer";

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["/api/customers", id],
    enabled: !!id,
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", { customerId: id }],
    enabled: !!id,
  });

  const { data: documentsData } = useQuery<PatientDocument[]>({
    queryKey: ["/api/customers", id, "documents"],
    enabled: !!id && isClinic,
  });

  useEffect(() => {
    if (documentsData) {
      setDocuments(documentsData);
    }
  }, [documentsData]);

  const form = useForm<PatientProfileValues>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      medicalNotes: "",
      allergies: "",
      medications: "",
      bloodType: "",
      emergencyContact: "",
      emergencyPhone: "",
      dateOfBirth: "",
    },
  });

  useEffect(() => {
    if (customer) {
      const metadata = (customer as any).metadata || {};
      form.reset({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "",
        medicalNotes: metadata.medicalNotes || "",
        allergies: metadata.allergies || "",
        medications: metadata.medications || "",
        bloodType: metadata.bloodType || "",
        emergencyContact: metadata.emergencyContact || "",
        emergencyPhone: metadata.emergencyPhone || "",
        dateOfBirth: metadata.dateOfBirth || "",
      });
    }
  }, [customer, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: PatientProfileValues) => {
      const { medicalNotes, allergies, medications, bloodType, emergencyContact, emergencyPhone, dateOfBirth, ...basicData } = data;
      const payload = {
        ...basicData,
        metadata: {
          medicalNotes,
          allergies,
          medications,
          bloodType,
          emergencyContact,
          emergencyPhone,
          dateOfBirth,
        },
      };
      return apiRequest("PATCH", `/api/customers/${id}`, payload);
    },
    onSuccess: () => {
      toast({ title: `${entityLabel} updated successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", id] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/customers/${id}/document-share-link`);
      return res.json();
    },
    onSuccess: (data) => {
      setShareLink(data.shareUrl);
      setShareDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest("DELETE", `/api/customers/${id}/documents/${docId}`);
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", id, "documents"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PatientProfileValues) => {
    updateMutation.mutate(data);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title={entityLabel} breadcrumbs={[{ label: isClinic ? "Patients" : "Customers", href: "/customers" }, { label: "Loading..." }]}>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout title={entityLabel} breadcrumbs={[{ label: isClinic ? "Patients" : "Customers", href: "/customers" }, { label: "Not Found" }]}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{entityLabel} not found</p>
            <Button variant="outline" className="mt-4" onClick={() => setLocation("/customers")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {isClinic ? "Patients" : "Customers"}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardLayout
      title={customer.name}
      breadcrumbs={[
        { label: isClinic ? "Patients" : "Customers", href: "/customers" },
        { label: customer.name },
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{customer.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                    {customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {customer.email}
                      </span>
                    )}
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLocation("/customers")} data-testid="button-back">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} data-testid="button-edit-patient">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="appointments" data-testid="tab-appointments">
              <Calendar className="mr-2 h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} data-testid="input-patient-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} disabled={!isEditing} data-testid="input-patient-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} data-testid="input-patient-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isClinic && (
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} disabled={!isEditing} data-testid="input-patient-dob" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} disabled={!isEditing} data-testid="input-patient-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {isClinic && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-red-500" />
                          Medical Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="bloodType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Blood Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., A+, B-, O+" {...field} disabled={!isEditing} data-testid="input-blood-type" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="allergies"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Allergies
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Penicillin, Peanuts" {...field} disabled={!isEditing} data-testid="input-allergies" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medications"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="flex items-center gap-2">
                                <Pill className="h-4 w-4 text-blue-500" />
                                Current Medications
                              </FormLabel>
                              <FormControl>
                                <Textarea placeholder="List current medications..." {...field} disabled={!isEditing} data-testid="input-medications" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="medicalNotes"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4" />
                                Medical Notes
                              </FormLabel>
                              <FormControl>
                                <Textarea rows={4} placeholder="Medical history, conditions, notes..." {...field} disabled={!isEditing} data-testid="input-medical-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Emergency Contact</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="emergencyContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Emergency contact name" {...field} disabled={!isEditing} data-testid="input-emergency-contact" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="emergencyPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="Emergency contact phone" {...field} disabled={!isEditing} data-testid="input-emergency-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea rows={3} placeholder="General notes..." {...field} disabled={!isEditing} data-testid="input-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        form.reset();
                      }}
                      data-testid="button-cancel-edit"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-patient">
                      <Save className="mr-2 h-4 w-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Medical Documents</CardTitle>
                  <CardDescription>Upload and manage patient documents, reports, and prescriptions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => generateShareLinkMutation.mutate()}
                    disabled={generateShareLinkMutation.isPending}
                    data-testid="button-request-documents"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Request Documents
                  </Button>
                  <ObjectUploader
                    onGetUploadParameters={async (file) => {
                      const res = await fetch("/api/uploads/request-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: file.name,
                          size: file.size,
                          contentType: file.type,
                          customerId: id,
                          folder: `patients/${id}/records`,
                        }),
                      });
                      const { uploadURL } = await res.json();
                      return {
                        method: "PUT" as const,
                        url: uploadURL,
                        headers: { "Content-Type": file.type },
                      };
                    }}
                    onComplete={() => {
                      toast({ title: "Document uploaded successfully" });
                      queryClient.invalidateQueries({ queryKey: ["/api/customers", id, "documents"] });
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </ObjectUploader>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">No documents yet</p>
                    <p className="text-sm">Upload documents or request them from the patient</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(doc.uploadedAt), "MMM d, yyyy")} • {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDocumentMutation.mutate(doc.id)}
                            data-testid={`button-delete-doc-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment History</CardTitle>
              </CardHeader>
              <CardContent>
                {!bookings || bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">No appointments yet</p>
                    <Button variant="outline" className="mt-4" onClick={() => setLocation("/bookings?action=new")}>
                      Schedule Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="font-medium">{format(new Date(booking.bookingDate), "MMM d, yyyy")}</p>
                          <p className="text-sm text-muted-foreground">{booking.bookingTime}</p>
                        </div>
                        <Badge variant={booking.status === "completed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"}>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">No billing records yet</p>
                  <p className="text-sm">Invoices and payments will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document Upload Link</DialogTitle>
            <DialogDescription>
              Share this link with the patient to allow them to upload documents directly. The link expires in 48 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={shareLink} readOnly data-testid="input-share-link" />
            <Button onClick={copyShareLink} data-testid="button-copy-share-link">
              Copy
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
