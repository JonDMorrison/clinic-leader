import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface HeadlinesCaptureProps {
  headlines: string[];
  onHeadlinesChange: (headlines: string[]) => void;
}

export const HeadlinesCapture = ({ headlines, onHeadlinesChange }: HeadlinesCaptureProps) => {
  const [newHeadline, setNewHeadline] = useState("");

  const handleAdd = () => {
    if (newHeadline.trim()) {
      onHeadlinesChange([...headlines, newHeadline.trim()]);
      setNewHeadline("");
    }
  };

  const handleRemove = (index: number) => {
    onHeadlinesChange(headlines.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer/Employee Headlines (5 min)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share good news, wins, and important updates (keep it brief!)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newHeadline}
              onChange={(e) => setNewHeadline(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a headline..."
              maxLength={200}
            />
            <Button onClick={handleAdd} disabled={!newHeadline.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {headlines.length > 0 && (
            <div className="space-y-2">
              {headlines.map((headline, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <span className="text-sm">{headline}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {headlines.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No headlines yet. Add important updates above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
