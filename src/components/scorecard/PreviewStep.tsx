import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface PreviewStepProps {
  preview: any;
  includeTargets: boolean;
}

export function PreviewStep({ preview, includeTargets }: PreviewStepProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-success">{preview.totalNew}</span> will be created
          {preview.totalSkipped > 0 && (
            <>, <span className="font-semibold text-muted-foreground">{preview.totalSkipped}</span> already exist</>
          )}
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {Object.entries(preview.groups).map(([group, items]: [string, any]) => (
          <div key={group} className="space-y-2">
            <h4 className="font-semibold text-sm">{group}</h4>
            <div className="space-y-1 pl-4 border-l-2 border-border">
              {items.map((item: any) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {item.exists ? (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    <span className={item.exists ? "text-muted-foreground" : ""}>
                      {item.name}
                    </span>
                    {item.is_computed && (
                      <Badge variant="muted" className="text-xs">
                        Computed
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.suggestedOwner && (
                      <span className="text-xs text-muted-foreground">
                        → {item.suggestedOwner.full_name}
                      </span>
                    )}
                    {includeTargets && item.target && (
                      <Badge variant="brand" className="text-xs">
                        Target: {item.target}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
