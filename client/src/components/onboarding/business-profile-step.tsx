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

const businessProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
  tagline: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  logo: z.string().url().optional().or(z.literal("")),
});

type BusinessProfileData = z.infer<typeof businessProfileSchema>;

interface BusinessProfileStepProps {
  step: any;
  stepData: Partial<BusinessProfileData>;
  onComplete: (data: BusinessProfileData) => void;
  isLoading: boolean;
}

export function BusinessProfileStep({ step, stepData, onComplete, isLoading }: BusinessProfileStepProps) {
  const form = useForm<BusinessProfileData>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      displayName: stepData.displayName || "",
      tagline: stepData.tagline || "",
      description: stepData.description || "",
      logo: stepData.logo || "",
    },
  });

  const handleSubmit = (data: BusinessProfileData) => {
    onComplete(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Display Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="My Awesome Business" 
                  {...field} 
                  data-testid="input-display-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tagline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tagline (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Your business in a sentence" 
                  {...field} 
                  data-testid="input-tagline"
                />
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
                <Textarea 
                  placeholder="Tell us about your business..."
                  className="resize-none"
                  {...field} 
                  data-testid="input-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/logo.png" 
                  {...field} 
                  data-testid="input-logo-url"
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
