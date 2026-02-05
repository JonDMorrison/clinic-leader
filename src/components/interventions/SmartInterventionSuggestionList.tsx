/**
 * SmartInterventionSuggestionList
 * 
 * Container component that displays multiple detection banners
 * with filtering and bulk actions.
 */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, X } from "lucide-react";
import { SmartInterventionSuggestionBanner } from "./SmartInterventionSuggestionBanner";
import { QuickInterventionModal, type InterventionOriginContext } from "./QuickInterventionModal";
import { useAssistedInterventionDetection } from "@/hooks/useAssistedInterventionDetection";
import { createDetectionSourceMetadata } from "@/lib/interventions/assistedInterventionDetection";
import type { DetectedIntervention } from "@/lib/interventions/assistedInterventionDetection";

interface SmartInterventionSuggestionListProps {
  organizationId: string | undefined;
  maxVisible?: number;
  compact?: boolean;
}

export function SmartInterventionSuggestionList({
  organizationId,
  maxVisible = 3,
  compact = false,
}: SmartInterventionSuggestionListProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState<DetectedIntervention | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    detections,
    hasDetections,
    isLoading,
    dismissDetection,
    refetch,
  } = useAssistedInterventionDetection({
    organizationId,
    enabled: !!organizationId,
  });

  if (isLoading || !hasDetections) {
    return null;
  }

  const visibleDetections = expanded ? detections : detections.slice(0, maxVisible);
  const hasMore = detections.length > maxVisible;

  const handleConfirm = (detection: DetectedIntervention) => {
    setSelectedDetection(detection);
  };

  const handleEdit = (detection: DetectedIntervention) => {
    setSelectedDetection(detection);
  };

  const handleDismiss = (detectionId: string) => {
    dismissDetection(detectionId);
  };

  const handleDismissAll = () => {
    detections.forEach(d => dismissDetection(d.id));
  };

  const handleInterventionCreated = (interventionId: string) => {
    if (selectedDetection) {
      // The modal will have already saved the detection_source metadata
      dismissDetection(selectedDetection.id);
      setSelectedDetection(null);
      refetch();
    }
  };

  // Build origin context for the modal
  const getOriginContext = (detection: DetectedIntervention): InterventionOriginContext => {
    const detectionMetadata = createDetectionSourceMetadata(detection);
    
    return {
      originType: "detection",
      preSelectedMetricId: detection.metricId || undefined,
      suggestedTitle: detection.suggestedTitle,
      suggestedDescription: detection.suggestedDescription,
      detectionSource: detectionMetadata,
    };
  };

  if (compact) {
    // Compact mode: just show a summary banner
    return (
      <>
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {detections.length} smart suggestion{detections.length !== 1 ? "s" : ""}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              AI Detected
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : "View"}
          </Button>
        </div>

        <AnimatePresence>
          {expanded && (
            <div className="space-y-2 mt-2">
              {detections.map((detection) => (
                <SmartInterventionSuggestionBanner
                  key={detection.id}
                  detection={detection}
                  onConfirm={handleConfirm}
                  onEdit={handleEdit}
                  onDismiss={handleDismiss}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {selectedDetection && organizationId && (
          <QuickInterventionModal
            open={true}
            onClose={() => setSelectedDetection(null)}
            organizationId={organizationId}
            originContext={getOriginContext(selectedDetection)}
            onSuccess={handleInterventionCreated}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Smart Suggestions</span>
            <Badge variant="secondary">
              {detections.length}
            </Badge>
          </div>
          {detections.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleDismissAll}
            >
              <X className="h-3 w-3 mr-1" />
              Dismiss all
            </Button>
          )}
        </div>

        {/* Detection Banners */}
        <AnimatePresence mode="popLayout">
          {visibleDetections.map((detection) => (
            <SmartInterventionSuggestionBanner
              key={detection.id}
              detection={detection}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
              onDismiss={handleDismiss}
              isProcessing={isProcessing}
            />
          ))}
        </AnimatePresence>

        {/* Show More/Less */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {detections.length - maxVisible} more
              </>
            )}
          </Button>
        )}
      </div>

      {/* Creation Modal */}
      {selectedDetection && organizationId && (
        <QuickInterventionModal
          open={true}
          onClose={() => setSelectedDetection(null)}
          organizationId={organizationId}
          originContext={getOriginContext(selectedDetection)}
          onSuccess={handleInterventionCreated}
        />
      )}
    </>
  );
}
