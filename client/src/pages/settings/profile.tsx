import { useState, useRef, useEffect } from "react";
import { SettingsLayout } from "@/components/settings-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, ExternalLink, Loader2 } from "lucide-react";

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<number>(0);

  // Initialize avatarVersion from user data so page refresh shows correct image
  useEffect(() => {
    const userAvatarUrl = (user as any)?.avatarUrl;
    const userUpdatedAt = (user as any)?.updatedAt;
    if (userAvatarUrl && !avatarVersion) {
      setAvatarVersion(userUpdatedAt ? new Date(userUpdatedAt).getTime() : Date.now());
    }
  }, [(user as any)?.avatarUrl, (user as any)?.updatedAt]);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const prepareRes = await fetch("/api/me/avatar/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contentType: file.type,
          size: file.size,
        }),
      });
      
      if (!prepareRes.ok) {
        const error = await prepareRes.json();
        throw new Error(error.message || "Failed to prepare upload");
      }
      
      const { putUrl, avatarUrl } = await prepareRes.json();

      const uploadRes = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      const confirmRes = await fetch("/api/me/avatar/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl }),
      });
      
      if (!confirmRes.ok) {
        const error = await confirmRes.json();
        throw new Error(error.message || "Failed to save avatar");
      }
      
      return confirmRes.json();
    },
    onSuccess: (data: { success: boolean; avatarUrl: string }) => {
      const nextVersion = Date.now();
      setAvatarVersion(nextVersion);

      // Optimistically update cached /api/auth/me immediately
      queryClient.setQueryData(["/api/auth/me"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          avatarUrl: data.avatarUrl ?? old.avatarUrl,
        };
      });

      toast({
        title: "Avatar updated",
        description: "Your profile photo has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me/avatar/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to remove avatar");
      }

      return res.json();
    },
    onSuccess: () => {
      const nextVersion = Date.now();
      setAvatarVersion(nextVersion);

      queryClient.setQueryData(["/api/auth/me"], (old: any) => {
        if (!old) return old;
        return { ...old, avatarUrl: null };
      });

      toast({ title: "Photo removed", description: "Your profile photo has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Remove failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    uploadAvatarMutation.mutate(file);
  };

  const authProvider = (user as any)?.authProvider as string | undefined;
  const isSSO = authProvider && authProvider !== "email" && authProvider !== "local";
  
  // Cache-bust avatar URL to prevent stale images after upload
  const baseAvatar = (user as any)?.avatarUrl || user?.profileImageUrl;
  const displayAvatar = baseAvatar && avatarVersion
    ? `${baseAvatar}${baseAvatar.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : baseAvatar;

  return (
    <SettingsLayout title="Profile">
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Your personal account information
          </p>
        </header>

        <Separator />

        {/* Profile Photo Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Photo</h2>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={displayAvatar || undefined} alt={user?.firstName || "User"} />
              <AvatarFallback className="text-lg">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
                data-testid="input-avatar-upload"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || removeAvatarMutation.isPending}
                  data-testid="button-upload-avatar"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload photo
                    </>
                  )}
                </Button>
                {(user as any)?.avatarUrl && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeAvatarMutation.mutate()}
                    disabled={removeAvatarMutation.isPending || isUploading}
                    data-testid="button-remove-avatar"
                  >
                    {removeAvatarMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      "Remove photo"
                    )}
                  </Button>
                )}
              </div>
              {isSSO && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Linked to {authProvider === "google" ? "Google" : authProvider === "microsoft" ? "Microsoft" : "SSO provider"}
                  </p>
                  <p>Upload a photo to override, or update via your provider and re-login.</p>
                </div>
              )}
              {!isSSO && (
                <p className="text-xs text-muted-foreground">
                  Max 5MB. JPG, PNG, or GIF.
                </p>
              )}
            </div>
          </div>
        </section>

        <Separator />

        {/* Personal Information Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Personal information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={user?.firstName || ""}
                disabled
                className="bg-muted"
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={user?.lastName || ""}
                disabled
                className="bg-muted"
                data-testid="input-last-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
              data-testid="input-email"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Profile details are managed externally. Contact support if you need to make changes.
          </p>
        </section>
      </div>
    </SettingsLayout>
  );
}
