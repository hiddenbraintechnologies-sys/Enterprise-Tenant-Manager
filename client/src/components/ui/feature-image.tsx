import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  getFeatureIcon, 
  getFeatureScreenshot,
  getFeatureVideo as getFeatureVideoConfig,
  type ScreenshotVariant,
  type FeatureKey 
} from "@/config/feature-assets";

interface FeatureImageProps {
  featureKey: FeatureKey | string;
  variant?: ScreenshotVariant;
  alt?: string;
  className?: string;
  iconClassName?: string;
  showFallbackIcon?: boolean;
  aspectRatio?: "video" | "square" | "wide";
  loading?: "lazy" | "eager";
}

export function FeatureImage({
  featureKey,
  variant,
  alt,
  className,
  iconClassName,
  showFallbackIcon = true,
  aspectRatio = "video",
  loading = "lazy",
}: FeatureImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const screenshotUrl = getFeatureScreenshot(featureKey, variant);
  const Icon = getFeatureIcon(featureKey);
  
  const handleError = useCallback(() => {
    setHasError(true);
  }, []);
  
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);
  
  const aspectRatioClass = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[21/9]",
  }[aspectRatio];
  
  if (!screenshotUrl || hasError) {
    if (!showFallbackIcon || !Icon) {
      return null;
    }
    
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg",
          aspectRatioClass,
          className
        )}
        data-testid={`feature-fallback-${featureKey}`}
      >
        <Icon 
          className={cn(
            "w-12 h-12 text-muted-foreground/50",
            iconClassName
          )} 
        />
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        aspectRatioClass,
        className
      )}
      data-testid={`feature-image-${featureKey}`}
    >
      {!isLoaded && showFallbackIcon && Icon && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
          <Icon className={cn("w-8 h-8 text-muted-foreground/30", iconClassName)} />
        </div>
      )}
      <img
        src={screenshotUrl}
        alt={alt || `${featureKey} feature preview`}
        loading={loading}
        onError={handleError}
        onLoad={handleLoad}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

interface FeatureVideoProps {
  featureKey: FeatureKey | string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  showFallbackImage?: boolean;
}

export function FeatureVideo({
  featureKey,
  className,
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false,
  showFallbackImage = true,
}: FeatureVideoProps) {
  const [hasError, setHasError] = useState(false);
  
  const video = getFeatureVideoConfig(featureKey);
  
  if (!video || hasError) {
    if (showFallbackImage) {
      return <FeatureImage featureKey={featureKey} className={className} />;
    }
    return null;
  }
  
  return (
    <div 
      className={cn("relative overflow-hidden rounded-lg", className)}
      data-testid={`feature-video-${featureKey}`}
    >
      <video
        src={video.src}
        poster={video.poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
