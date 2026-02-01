import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Link as LinkIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ImageUploaderProps {
  label: string;
  type: "logo" | "favicon";
  value: string | null;
  onChange: (url: string | null) => void;
  acceptTypes: string;
  description: string;
  previewClassName?: string;
}

const ALLOWED_LOGO_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];
const ALLOWED_FAVICON_TYPES = ["image/png", "image/x-icon", "image/vnd.microsoft.icon"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function ImageUploader({
  label,
  type,
  value,
  onChange,
  acceptTypes,
  description,
  previewClassName = "h-16 w-auto",
}: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualUrl, setManualUrl] = useState(value || "");

  const allowedTypes = type === "logo" ? ALLOWED_LOGO_TYPES : ALLOWED_FAVICON_TYPES;

  const validateFile = useCallback((file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Allowed: ${type === "logo" ? "PNG, SVG, JPG, WebP" : "PNG, ICO"}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 2MB`;
    }
    return null;
  }, [type, allowedTypes]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast({ title: "Invalid file", description: error, variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const uploadResponse = await apiRequest("POST", "/api/branding/upload", {
        type,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });

      const { uploadURL, objectPath } = await uploadResponse.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await apiRequest("POST", "/api/branding/confirm-upload", {
        type,
        objectPath,
      });

      onChange(objectPath);
      setManualUrl(objectPath);
      
      // Invalidate branding cache to update sidebar logo and favicon immediately
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/branding"] });
      
      toast({ title: "Upload complete", description: `${label} has been updated.` });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ 
        title: "Upload failed", 
        description: "Failed to upload image. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    setManualUrl("");
  };

  const handleManualUrlApply = () => {
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      <div className="flex flex-col gap-3">
        {value ? (
          <div className="border rounded-lg p-3 bg-muted/50 flex items-center gap-3">
            <img 
              src={value} 
              alt={`${label} preview`}
              className={`object-contain ${previewClassName}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50'%3E%3Crect fill='%23eee' width='100' height='50'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='10'%3ENo Preview%3C/text%3E%3C/svg%3E";
              }}
              data-testid={`img-preview-${type}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{value.split("/").pop()}</p>
              <p className="text-xs text-muted-foreground truncate">{value}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              data-testid={`button-remove-${type}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">No {type} uploaded</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            onChange={handleFileSelect}
            className="hidden"
            data-testid={`input-file-${type}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
            data-testid={`button-upload-${type}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {label}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{description}</p>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-fit text-xs"
          data-testid={`button-toggle-advanced-${type}`}
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide URL input
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Enter URL manually
            </>
          )}
        </Button>

        {showAdvanced && (
          <div className="flex gap-2">
            <Input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="flex-1"
              data-testid={`input-url-${type}`}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleManualUrlApply}
              disabled={!manualUrl.trim() || manualUrl === value}
              data-testid={`button-apply-url-${type}`}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
