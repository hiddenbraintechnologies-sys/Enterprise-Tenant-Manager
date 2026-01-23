import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { AddonEditorModal } from "@/components/super-admin/marketplace/addon-editor-modal";
import { getAddonIcon } from "@/lib/marketplace/icon-map";
import { superAdminMarketplaceApi, type AddonDto, type AddonCategory } from "@/lib/api/superAdminMarketplace";

export default function SuperAdminMarketplaceCatalogPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<AddonDto | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sa-marketplace-addons"],
    queryFn: () => superAdminMarketplaceApi.listAddons(),
  });

  const addons = data?.addons ?? [];

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return addons;
    return addons.filter((a) => {
      return (
        a.name.toLowerCase().includes(t) ||
        a.slug.toLowerCase().includes(t) ||
        a.category.toLowerCase().includes(t) ||
        a.status.toLowerCase().includes(t)
      );
    });
  }, [addons, q]);

  const saveAddon = useMutation({
    mutationFn: async (payload: {
      slug: string;
      name: string;
      category: AddonCategory;
      shortDescription?: string;
      fullDescription?: string;
      iconUrl?: string;
      bannerUrl?: string;
      trialDays?: number;
    }) => {
      if (editorMode === "create") return superAdminMarketplaceApi.createAddon(payload);
      if (!selected) throw new Error("No add-on selected");
      return superAdminMarketplaceApi.updateAddon(selected.id, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sa-marketplace-addons"] });
    },
  });

  const publishAddon = useMutation({
    mutationFn: (addonId: string) => superAdminMarketplaceApi.publishAddon(addonId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sa-marketplace-addons"] });
    },
  });

  const archiveAddon = useMutation({
    mutationFn: (addonId: string) => superAdminMarketplaceApi.archiveAddon(addonId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sa-marketplace-addons"] });
    },
  });

  const restoreAddon = useMutation({
    mutationFn: (addonId: string) => superAdminMarketplaceApi.restoreAddon(addonId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sa-marketplace-addons"] });
    },
  });

  function openCreate() {
    setSelected(null);
    setEditorMode("create");
    setEditorOpen(true);
  }

  function openEdit(addon: AddonDto) {
    setSelected(addon);
    setEditorMode("edit");
    setEditorOpen(true);
  }

  return (
    <div className="p-6 space-y-4" data-testid="marketplace-catalog-page">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Marketplace Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Create add-ons, publish them, archive old ones. Rollout by country happens in the matrix page.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-addon">
          <Plus className="h-4 w-4 mr-2" />
          Create add-on
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, slug, category..."
          className="max-w-md"
          data-testid="input-search-addons"
        />
        <Badge variant="outline" data-testid="badge-addon-count">{filtered.length} shown</Badge>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Failed to load add-ons</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{String((error as Error).message || error)}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3" data-testid="grid-addons">
        {isLoading ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading...</CardContent></Card>
        ) : (
          filtered.map((a) => (
            <Card key={a.id} data-testid={`card-addon-${a.slug}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border flex items-center justify-center bg-muted/20">
                    {getAddonIcon(a.slug)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium" data-testid={`text-addon-name-${a.slug}`}>{a.name}</div>
                      <Badge variant={a.status === "published" ? "default" : a.status === "draft" ? "secondary" : "outline"} data-testid={`badge-addon-status-${a.slug}`}>
                        {a.status}
                      </Badge>
                      <Badge variant="outline">{a.category}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.slug}</div>
                    {a.shortDescription ? <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.shortDescription}</div> : null}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid={`button-addon-menu-${a.slug}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(a)} data-testid={`menu-edit-${a.slug}`}>Edit</DropdownMenuItem>
                    {a.status === "draft" && (
                      <DropdownMenuItem onClick={() => publishAddon.mutate(a.id)} data-testid={`menu-publish-${a.slug}`}>
                        Publish
                      </DropdownMenuItem>
                    )}
                    {a.status === "archived" && (
                      <DropdownMenuItem onClick={() => restoreAddon.mutate(a.id)} data-testid={`menu-restore-${a.slug}`}>
                        Restore
                      </DropdownMenuItem>
                    )}
                    {a.status !== "archived" && (
                      <DropdownMenuItem className="text-destructive" onClick={() => archiveAddon.mutate(a.id)} data-testid={`menu-archive-${a.slug}`}>
                        Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddonEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        mode={editorMode}
        initial={selected}
        onSave={async (payload) => {
          await saveAddon.mutateAsync(payload);
        }}
      />
    </div>
  );
}
