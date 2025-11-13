import { Input } from "@/components/ui/input";

interface ThreeYearPictureEditorProps {
  revenue: number;
  profit: number;
  headcount: number;
  descriptors: string;
  onChange: (data: { revenue: number; profit: number; headcount: number; descriptors: string }) => void;
}

export function ThreeYearPictureEditor({
  revenue,
  profit,
  headcount,
  descriptors,
  onChange,
}: ThreeYearPictureEditorProps) {
  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">3-Year Picture</label>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Revenue ($)</label>
          <Input
            type="number"
            placeholder="2000000"
            value={revenue || ""}
            onChange={(e) => onChange({ revenue: parseInt(e.target.value) || 0, profit, headcount, descriptors })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Profit %</label>
          <Input
            type="number"
            placeholder="18"
            value={profit || ""}
            onChange={(e) => onChange({ revenue, profit: parseInt(e.target.value) || 0, headcount, descriptors })}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Headcount</label>
          <Input
            type="number"
            placeholder="28"
            value={headcount || ""}
            onChange={(e) => onChange({ revenue, profit, headcount: parseInt(e.target.value) || 0, descriptors })}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Descriptors</label>
        <Input
          placeholder="Teaching clinic, Data-driven, Award-winning"
          value={descriptors}
          onChange={(e) => onChange({ revenue, profit, headcount, descriptors: e.target.value })}
        />
      </div>
    </div>
  );
}
