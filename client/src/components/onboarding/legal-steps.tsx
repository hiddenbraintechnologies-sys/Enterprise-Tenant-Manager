import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Scale, Briefcase, Users, FileText } from "lucide-react";

interface StepProps {
  stepData: Record<string, any>;
  onComplete: (data: any) => void;
  isPending: boolean;
}

const firmProfileSchema = z.object({
  firmName: z.string().min(2, "Firm name is required"),
  registrationNumber: z.string().optional(),
  foundedYear: z.string().optional(),
  specialization: z.string().optional(),
});

export function FirmProfileStep({ stepData, onComplete, isPending }: StepProps) {
  const form = useForm({
    resolver: zodResolver(firmProfileSchema),
    defaultValues: {
      firmName: stepData?.firmName || "",
      registrationNumber: stepData?.registrationNumber || "",
      foundedYear: stepData?.foundedYear || "",
      specialization: stepData?.specialization || "",
    },
  });

  const handleSubmit = (data: z.infer<typeof firmProfileSchema>) => {
    onComplete(data);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Firm Profile</CardTitle>
        </div>
        <CardDescription>Enter your law firm details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firmName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firm Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Smith & Associates" {...field} data-testid="input-firm-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bar Registration #</FormLabel>
                    <FormControl>
                      <Input placeholder="Registration number" {...field} data-testid="input-registration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="foundedYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Founded Year</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2015" {...field} data-testid="input-founded-year" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Specialization</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Corporate Law" {...field} data-testid="input-specialization" />
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

const PRACTICE_AREAS = [
  "Corporate Law",
  "Criminal Law",
  "Family Law",
  "Real Estate Law",
  "Intellectual Property",
  "Tax Law",
  "Labor & Employment",
  "Immigration Law",
  "Banking & Finance",
  "Civil Litigation",
  "Environmental Law",
  "Healthcare Law",
];

export function PracticeAreasStep({ stepData, onComplete, isPending }: StepProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    stepData?.areas || []
  );
  const [customArea, setCustomArea] = useState("");

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const addCustomArea = () => {
    if (customArea && !selectedAreas.includes(customArea)) {
      setSelectedAreas([...selectedAreas, customArea]);
      setCustomArea("");
    }
  };

  const handleSubmit = () => {
    if (selectedAreas.length === 0) {
      return;
    }
    onComplete({ areas: selectedAreas });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Practice Areas</CardTitle>
        </div>
        <CardDescription>Select your areas of legal practice (at least one)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {PRACTICE_AREAS.map((area) => (
            <div
              key={area}
              className="flex items-center space-x-2 p-2 rounded-md border hover-elevate cursor-pointer"
              onClick={() => toggleArea(area)}
              data-testid={`checkbox-area-${area.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Checkbox checked={selectedAreas.includes(area)} />
              <Label className="cursor-pointer text-sm">{area}</Label>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom practice area"
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            data-testid="input-custom-area"
          />
          <Button type="button" variant="outline" onClick={addCustomArea} data-testid="button-add-area">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {selectedAreas.filter(a => !PRACTICE_AREAS.includes(a)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedAreas.filter(a => !PRACTICE_AREAS.includes(a)).map(area => (
              <span key={area} className="px-2 py-1 bg-muted rounded-md text-sm flex items-center gap-1">
                {area}
                <button onClick={() => toggleArea(area)} className="text-muted-foreground">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          disabled={isPending || selectedAreas.length === 0} 
          data-testid="button-continue"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface LawyerEntry {
  name: string;
  designation: string;
  barNumber: string;
  email: string;
}

export function LawyerStaffStep({ stepData, onComplete, isPending }: StepProps) {
  const [lawyers, setLawyers] = useState<LawyerEntry[]>(
    stepData?.lawyers || [{ name: "", designation: "", barNumber: "", email: "" }]
  );

  const addLawyer = () => {
    setLawyers([...lawyers, { name: "", designation: "", barNumber: "", email: "" }]);
  };

  const removeLawyer = (index: number) => {
    if (lawyers.length > 1) {
      setLawyers(lawyers.filter((_, i) => i !== index));
    }
  };

  const updateLawyer = (index: number, field: keyof LawyerEntry, value: string) => {
    const updated = [...lawyers];
    updated[index][field] = value;
    setLawyers(updated);
  };

  const handleSubmit = () => {
    const validLawyers = lawyers.filter(l => l.name);
    onComplete({ lawyers: validLawyers });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Lawyers & Staff</CardTitle>
        </div>
        <CardDescription>Add attorneys and support staff (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lawyers.map((lawyer, index) => (
          <div key={index} className="p-3 border rounded-md space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Member {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLawyer(index)}
                disabled={lawyers.length === 1}
                data-testid={`button-remove-lawyer-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Name"
                value={lawyer.name}
                onChange={(e) => updateLawyer(index, "name", e.target.value)}
                data-testid={`input-lawyer-name-${index}`}
              />
              <Input
                placeholder="Designation (e.g., Partner)"
                value={lawyer.designation}
                onChange={(e) => updateLawyer(index, "designation", e.target.value)}
                data-testid={`input-lawyer-designation-${index}`}
              />
              <Input
                placeholder="Bar Number"
                value={lawyer.barNumber}
                onChange={(e) => updateLawyer(index, "barNumber", e.target.value)}
                data-testid={`input-lawyer-bar-${index}`}
              />
              <Input
                placeholder="Email"
                value={lawyer.email}
                onChange={(e) => updateLawyer(index, "email", e.target.value)}
                data-testid={`input-lawyer-email-${index}`}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addLawyer} className="w-full" data-testid="button-add-lawyer">
          <Plus className="h-4 w-4 mr-2" /> Add Team Member
        </Button>
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

interface CaseTemplateEntry {
  name: string;
  category: string;
  description: string;
}

export function CaseTemplatesStep({ stepData, onComplete, isPending }: StepProps) {
  const [templates, setTemplates] = useState<CaseTemplateEntry[]>(
    stepData?.templates || [{ name: "", category: "", description: "" }]
  );

  const addTemplate = () => {
    setTemplates([...templates, { name: "", category: "", description: "" }]);
  };

  const removeTemplate = (index: number) => {
    if (templates.length > 1) {
      setTemplates(templates.filter((_, i) => i !== index));
    }
  };

  const updateTemplate = (index: number, field: keyof CaseTemplateEntry, value: string) => {
    const updated = [...templates];
    updated[index][field] = value;
    setTemplates(updated);
  };

  const handleSubmit = () => {
    const validTemplates = templates.filter(t => t.name);
    onComplete({ templates: validTemplates });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle data-testid="text-step-title">Case Templates</CardTitle>
        </div>
        <CardDescription>Create reusable case templates (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map((template, index) => (
          <div key={index} className="p-3 border rounded-md space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Template {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTemplate(index)}
                disabled={templates.length === 1}
                data-testid={`button-remove-template-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Template Name"
                value={template.name}
                onChange={(e) => updateTemplate(index, "name", e.target.value)}
                data-testid={`input-template-name-${index}`}
              />
              <Input
                placeholder="Category (e.g., Divorce)"
                value={template.category}
                onChange={(e) => updateTemplate(index, "category", e.target.value)}
                data-testid={`input-template-category-${index}`}
              />
            </div>
            <Textarea
              placeholder="Brief description of case type"
              value={template.description}
              onChange={(e) => updateTemplate(index, "description", e.target.value)}
              data-testid={`input-template-description-${index}`}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addTemplate} className="w-full" data-testid="button-add-template">
          <Plus className="h-4 w-4 mr-2" /> Add Template
        </Button>
        <Button onClick={handleSubmit} className="w-full" disabled={isPending} data-testid="button-continue">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
