import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTour, type TourStep } from "@/contexts/tour-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
}

function getElementPosition(selector: string): SpotlightPosition | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

function calculateTooltipPosition(
  spotlight: SpotlightPosition,
  placement: TourStep["placement"] = "bottom",
  tooltipWidth: number = 320,
  tooltipHeight: number = 200
): TooltipPosition {
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = spotlight.top - tooltipHeight - padding;
      left = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;
      break;
    case "bottom":
      top = spotlight.top + spotlight.height + padding;
      left = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;
      break;
    case "left":
      top = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
      left = spotlight.left - tooltipWidth - padding;
      break;
    case "right":
      top = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
      left = spotlight.left + spotlight.width + padding;
      break;
  }

  if (left < padding) left = padding;
  if (left + tooltipWidth > viewportWidth - padding) {
    left = viewportWidth - tooltipWidth - padding;
  }
  if (top < padding) top = padding;
  if (top + tooltipHeight > viewportHeight + window.scrollY - padding) {
    top = spotlight.top - tooltipHeight - padding;
  }

  return { top, left };
}

export function TourOverlay() {
  const { state, nextStep, prevStep, endTour, skipTour } = useTour();
  const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ top: 0, left: 0 });

  const currentStep = state.activeTour?.steps[state.currentStepIndex];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.activeTour 
    ? state.currentStepIndex === state.activeTour.steps.length - 1 
    : false;
  const totalSteps = state.activeTour?.steps.length || 0;

  const updatePositions = useCallback(() => {
    if (!currentStep) return;
    
    const pos = getElementPosition(currentStep.target);
    if (pos) {
      const padding = currentStep.spotlightPadding ?? 8;
      const paddedPos = {
        top: pos.top - padding,
        left: pos.left - padding,
        width: pos.width + padding * 2,
        height: pos.height + padding * 2,
      };
      setSpotlight(paddedPos);
      
      const tooltipPosition = calculateTooltipPosition(
        paddedPos,
        currentStep.placement
      );
      setTooltipPos(tooltipPosition);

      const element = document.querySelector(currentStep.target);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setSpotlight(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!state.isRunning) return;

    updatePositions();

    const handleResize = () => updatePositions();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [state.isRunning, state.currentStepIndex, updatePositions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isRunning) return;
      
      if (e.key === "Escape") {
        skipTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isRunning, nextStep, prevStep, skipTour]);

  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (!state.isRunning || !currentStep) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] animate-in fade-in duration-200"
      data-testid="tour-overlay"
    >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ minHeight: document.documentElement.scrollHeight }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlight && (
                <rect
                  x={spotlight.left}
                  y={spotlight.top}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#tour-spotlight-mask)"
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          />
        </svg>

        {spotlight && (
          <div
            className="absolute z-[10000] animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              width: 320,
            }}
          >
            <Card className="shadow-xl border-2 border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{currentStep.title}</CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={skipTour}
                    data-testid="button-tour-close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= state.currentStepIndex
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground pb-3">
                {currentStep.content}
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-2 pt-0">
                <span className="text-xs text-muted-foreground">
                  Step {state.currentStepIndex + 1} of {totalSteps}
                </span>
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={prevStep}
                      data-testid="button-tour-prev"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  {isLastStep ? (
                    <Button
                      size="sm"
                      onClick={endTour}
                      data-testid="button-tour-finish"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Finish
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={nextStep}
                      data-testid="button-tour-next"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>,
    document.body
  );
}
