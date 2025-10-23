import { Badge as CustomBadge } from "@/components/ui/Badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface PreviewRockStepProps {
  preview: any;
  quarter: string;
}

export function PreviewRockStep({ preview, quarter }: PreviewRockStepProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-success">{preview.totalNew}</span> will be created for {quarter}
          {preview.totalSkipped > 0 && (
            <>, <span className="font-semibold text-muted-foreground">{preview.totalSkipped}</span> already exist</>
          )}
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {Object.entries(preview.groups).map(([group, items]: [string, any]) => (
          <div key={group} className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CustomBadge variant="success">{group}</CustomBadge>
            </h4>
            <div className="space-y-1 pl-4 border-l-2 border-border">
              {items.map((item: any) => (
                <div
                  key={item.title}
                  className="flex items-start justify-between py-2 text-sm"
                >
                  <div className="flex items-start gap-2 flex-1">
                    {item.exists ? (
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className={item.exists ? "text-muted-foreground" : ""}>
                        {item.title}
                      </span>
                      {item.note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {item.suggestedOwner && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        → {item.suggestedOwner.full_name}
                      </span>
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
