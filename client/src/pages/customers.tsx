import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Mail, Phone, Edit, Trash2, Users, Share2, Copy, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";
import { format } from "date-fns";

const PHONE_VALIDATION_BY_COUNTRY: Record<string, { minLength: number; maxLength: number; pattern?: RegExp; message: string }> = {
  IN: { minLength: 10, maxLength: 10, pattern: /^[6-9]\d{9}$/, message: "Indian phone number must be exactly 10 digits starting with 6-9" },
  MY: { minLength: 9, maxLength: 11, message: "Malaysian phone number must be 9-11 digits" },
  UK: { minLength: 10, maxLength: 11, message: "UK phone number must be 10-11 digits" },
  AE: { minLength: 9, maxLength: 9, message: "UAE phone number must be exactly 9 digits" },
  SG: { minLength: 8, maxLength: 8, message: "Singapore phone number must be exactly 8 digits" },
  US: { minLength: 10, maxLength: 10, message: "US phone number must be exactly 10 digits" },
};

function validatePhoneForCountry(val: string | undefined): boolean {
  if (!val || val.trim() === "") return true;
  const country = localStorage.getItem("selectedCountry") || "IN";
  const rules = PHONE_VALIDATION_BY_COUNTRY[country] || { minLength: 7, maxLength: 15 };
  const digitsOnly = val.replace(/[\s\-\+\(\)]/g, "");
  if (digitsOnly.length < rules.minLength || digitsOnly.length > rules.maxLength) return false;
  if (rules.pattern && !rules.pattern.test(digitsOnly)) return false;
  return true;
}

function getPhoneErrorMessage(): string {
  const country = localStorage.getItem("selectedCountry") || "IN";
  const rules = PHONE_VALIDATION_BY_COUNTRY[country];
  return rules?.message || "Phone number must be 7-15 digits";
}

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().refine(validatePhoneForCountry, { message: "Invalid phone number for selected country" }),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

function CustomerDialog({
  customer,
  open,
  onOpenChange,
  onSuccess,
}: {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!customer;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      notes: customer?.notes ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: customer?.name ?? "",
        email: customer?.email ?? "",
        phone: customer?.phone ?? "",
        address: customer?.address ?? "",
        notes: customer?.notes ?? "",
      });
    }
  }, [open, customer, form]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/customers/${customer.id}`, data);
      }
      return apiRequest("POST", "/api/customers", data);
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Customer updated" : "Customer created",
        description: isEditing ? "The customer has been updated." : "The customer has been added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update customer information." : "Enter the customer details below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer name" {...field} data-testid="input-customer-name" />
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
                    <Input type="email" placeholder="email@example.com" {...field} data-testid="input-customer-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => {
                const country = localStorage.getItem("selectedCountry") || "IN";
                const placeholders: Record<string, string> = {
                  IN: "9876543210",
                  MY: "123456789",
                  UK: "7911123456",
                  AE: "501234567",
                  SG: "91234567",
                  US: "2025551234",
                };
                const hints: Record<string, string> = {
                  IN: "10 digits starting with 6-9",
                  MY: "9-11 digits",
                  UK: "10-11 digits",
                  AE: "9 digits",
                  SG: "8 digits",
                  US: "10 digits",
                };
                return (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={placeholders[country] || "Phone number"} 
                        maxLength={15}
                        {...field} 
                        data-testid="input-customer-phone" 
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{hints[country] || "7-15 digits"}</p>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Full address" {...field} data-testid="input-customer-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} data-testid="input-customer-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-customer">
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface PortalInviteResponse {
  id: string;
  inviteUrl: string;
}

interface PortalSettings {
  id: string;
  isEnabled: boolean;
  portalUrl: string;
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: portalSettings } = useQuery<PortalSettings>({
    queryKey: ["/api/customer-portal/settings"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Customer deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ customerId, email }: { customerId: string; email: string }) => {
      const res = await apiRequest("POST", "/api/customer-portal/invites", {
        customerId,
        email,
        sentVia: "link",
      });
      return res.json() as Promise<PortalInviteResponse>;
    },
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopiedId(data.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast({
          title: "Invite link copied!",
          description: "Share this link with your customer to give them portal access.",
        });
      } catch {
        toast({
          title: "Invite created",
          description: "Copy the invite link from the portal invites section.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/invites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (customer: Customer) => {
    if (!portalSettings?.isEnabled) {
      toast({
        title: "Portal not enabled",
        description: "Enable the customer portal in Settings first.",
        variant: "destructive",
      });
      return;
    }
    if (!customer.email) {
      toast({
        title: "Email required",
        description: "Please add an email address for this customer first.",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate({ customerId: customer.id, email: customer.email });
  };

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingCustomer(undefined);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout title="Customers" breadcrumbs={[{ label: "Customers" }]}>
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-customers"
            />
          </div>
          <Button onClick={handleAdd} className="w-full sm:w-auto" data-testid="button-add-customer">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="rounded-md border p-4"
                    data-testid={`customer-card-${customer.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{customer.name}</p>
                        {customer.email && (
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {customer.email}
                          </p>
                        )}
                        {customer.phone && (
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            {customer.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${customer.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleSendInvite(customer)}
                              disabled={inviteMutation.isPending}
                              data-testid={`menu-invite-${customer.id}`}
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Share Portal Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(customer)}
                              data-testid={`menu-edit-${customer.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setDeleteConfirmOpen(true);
                              }}
                              disabled={deleteMutation.isPending}
                              className="text-destructive"
                              data-testid={`menu-delete-${customer.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          {customer.email ? (
                            <span className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {customer.email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <span className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {customer.createdAt ? format(new Date(customer.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendInvite(customer)}
                              disabled={inviteMutation.isPending}
                              data-testid={`button-invite-customer-${customer.id}`}
                              title="Share portal access"
                            >
                              <Share2 className="mr-1 h-4 w-4" />
                              Share
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(customer)}
                              data-testid={`button-edit-customer-${customer.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setDeleteConfirmOpen(true);
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-customer-${customer.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {searchQuery ? "No customers found" : "No customers yet"}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={handleAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Customer
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        customer={editingCustomer}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setEditingCustomer(undefined)}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customerToDelete?.name ? `"${customerToDelete.name}"` : "this customer"}? 
              This action cannot be undone and will permanently remove the customer record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (customerToDelete) {
                  deleteMutation.mutate(customerToDelete.id);
                }
                setDeleteConfirmOpen(false);
                setCustomerToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
