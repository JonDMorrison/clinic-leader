import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Mapping {
  extractedField: string;
  value: any;
  suggestedMetric: string;
  confidence: number;
  mappedMetricId?: string;
}

interface MetricMappingTableProps {
  mappings: Mapping[];
  availableMetrics: Array<{ id: string; name: string }>;
  onMappingChange: (index: number, metricId: string) => void;
}

export function MetricMappingTable({ mappings, availableMetrics, onMappingChange }: MetricMappingTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Extracted Field</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Maps To KPI</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((mapping, index) => {
            const isHighConfidence = mapping.confidence >= 80;
            const metric = availableMetrics.find(m => 
              m.id === mapping.mappedMetricId || m.name === mapping.suggestedMetric
            );

            return (
              <TableRow key={index}>
                <TableCell className="font-medium">{mapping.extractedField}</TableCell>
                <TableCell>{mapping.value}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isHighConfidence && metric ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <Select
                      value={mapping.mappedMetricId || metric?.id}
                      onValueChange={(value) => onMappingChange(index, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select KPI" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMetrics.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={isHighConfidence ? "success" : "muted"}>
                    {mapping.confidence}%
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
