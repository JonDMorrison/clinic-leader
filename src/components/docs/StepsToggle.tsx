import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ListOrdered } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepsToggleProps {
  steps: string[];
}

export const StepsToggle = ({ steps }: StepsToggleProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="text-xs h-7 gap-1.5"
      >
        <ListOrdered className="h-3.5 w-3.5" />
        {expanded ? "Hide" : "Show"} steps ({steps.length})
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ol className="mt-2 ml-4 space-y-1.5 list-decimal list-outside text-sm">
              {steps.map((step, index) => (
                <li key={index} className="text-muted-foreground pl-1">
                  {step}
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
