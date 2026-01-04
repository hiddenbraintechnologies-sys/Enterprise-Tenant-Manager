import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const contactInfoSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

type ContactInfoData = z.infer<typeof contactInfoSchema>;

interface ContactInfoStepProps {
  step: any;
  stepData: Partial<ContactInfoData>;
  onComplete: (data: ContactInfoData) => void;
  isLoading: boolean;
}

export function ContactInfoStep({ step, stepData, onComplete, isLoading }: ContactInfoStepProps) {
  const form = useForm<ContactInfoData>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      email: stepData.email || "",
      phone: stepData.phone || "",
      address: stepData.address || "",
      website: stepData.website || "",
    },
  });

  const handleSubmit = (data: ContactInfoData) => {
    onComplete(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Email</FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  placeholder="contact@business.com" 
                  {...field} 
                  data-testid="input-email"
                />
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
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="tel"
                  placeholder="+1 (555) 123-4567" 
                  {...field} 
                  data-testid="input-phone"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Address (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="123 Main St, City, State, ZIP"
                  className="resize-none"
                  {...field} 
                  data-testid="input-address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://www.mybusiness.com" 
                  {...field} 
                  data-testid="input-website"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-continue">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continue
        </Button>
      </form>
    </Form>
  );
}
