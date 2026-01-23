import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AddonDto, AddonCategory } from "@/lib/api/superAdminMarketplace";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: AddonDto | null;
  onSave: (payload: {
    slug: string;
    name: string;
    category: AddonCategory;
    shortDescription?: string;
    fullDescription?: string;
    iconUrl?: string;
    bannerUrl?: string;
    trialDays?: number;
  }) => Promise<void>;
};

const CATEGORIES: { value: AddonCategory; label: string }[] = [
  { value: "analytics", label: "Analytics" },
  { value: "automation", label: "Automation" },
  { value: "billing", label: "Billing" },
  { value: "booking", label: "Booking" },
  { value: "communication", label: "Communication" },
  { value: "compliance", label: "Compliance" },
  { value: "crm", label: "CRM" },
  { value: "healthcare", label: "Healthcare" },
  { value: "integration", label: "Integration" },
  { value: "inventory", label: "Inventory" },
  { value: "marketing", label: "Marketing" },
  { value: "payments", label: "Payments" },
  { value: "reporting", label: "Reporting" },
  { value: "scheduling", label: "Scheduling" },
  { value: "security", label: "Security" },
  { value: "utilities", label: "Utilities" },
];

export function AddonEditorModal({ open, onOpenChange, mode, initial, onSave }: Props) {
  const [saving, setSaving] = useState(false);

  const defaults = useMemo(
    () => ({
      slug: initial?.slug ?? "",
      name: initial?.name ?? "",
      category: (initial?.category ?? "utilities") as AddonCategory,
      shortDescription: initial?.shortDescription ?? "",
      fullDescription: initial?.fullDescription ?? "",
      iconUrl: initial?.iconUrl ?? "",
      bannerUrl: initial?.bannerUrl ?? "",
      trialDays: initial?.trialDays ?? 0,
    }),
    [initial]
  );

  const [slug, setSlug] = useState(defaults.slug);
  const [name, setName] = useState(defaults.name);
  const [category, setCategory] = useState<AddonCategory>(defaults.category);
  const [shortDescription, setShortDescription] = useState(defaults.shortDescription);
  const [fullDescription, setFullDescription] = useState(defaults.fullDescription);
  const [iconUrl, setIconUrl] = useState(defaults.iconUrl);
  const [bannerUrl, setBannerUrl] = useState(defaults.bannerUrl);
  const [trialDays, setTrialDays] = useState(defaults.trialDays);

  useEffect(() => {
    setSlug(defaults.slug);
    setName(defaults.name);
    setCategory(defaults.category);
    setShortDescription(defaults.shortDescription);
    setFullDescription(defaults.fullDescription);
    setIconUrl(defaults.iconUrl);
    setBannerUrl(defaults.bannerUrl);
    setTrialDays(defaults.trialDays);
  }, [defaults, open]);

  const canSave = slug.trim().length >= 2 && name.trim().length >= 2;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
        name: name.trim(),
        category,
        shortDescription: shortDescription?.trim() || undefined,
        fullDescription: fullDescription?.trim() || undefined,
        iconUrl: iconUrl?.trim() || undefined,
        bannerUrl: bannerUrl?.trim() || undefined,
        trialDays: trialDays || undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle data-testid="text-addon-editor-title">
            {mode === "create" ? "Create Add-on" : "Edit Add-on"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Slug</Label>
              <Input
                data-testid="input-addon-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="payroll-addon"
                disabled={mode === "edit"}
              />
              <p className="text-xs text-muted-foreground">Used as unique identifier (e.g., payroll, hrms).</p>
            </div>

            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                data-testid="input-addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Payroll"
              />
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as AddonCategory)}>
                <SelectTrigger data-testid="select-addon-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} data-testid={`option-category-${c.value}`}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Trial Days</Label>
              <Input
                data-testid="input-addon-trial-days"
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value) || 0)}
                placeholder="14"
              />
            </div>

            <div className="grid gap-2">
              <Label>Icon URL (optional)</Label>
              <Input
                data-testid="input-addon-icon"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Banner URL (optional)</Label>
              <Input
                data-testid="input-addon-banner"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Short Description (optional)</Label>
            <Input
              data-testid="input-addon-short-description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief summary of the add-on"
            />
          </div>

          <div className="grid gap-2">
            <Label>Full Description (optional)</Label>
            <Textarea
              data-testid="textarea-addon-full-description"
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              placeholder="Run salaries, payslips, statutory deductions and bank files."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} data-testid="button-addon-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving} data-testid="button-addon-save">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
