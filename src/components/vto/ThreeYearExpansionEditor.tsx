import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Building2, Handshake, ShoppingCart, Stethoscope, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExpansionItem,
  ExpansionItemType,
  ExpansionItemStatus,
  EXPANSION_TYPE_LABELS,
  EXPANSION_STATUS_COLORS,
} from "@/lib/vto/models";

interface ThreeYearExpansionEditorProps {
  items: ExpansionItem[];
  onChange: (items: ExpansionItem[]) => void;
  users: Array<{ id: string; full_name: string }>;
}

const TYPE_ICONS: Record<ExpansionItemType, React.ReactNode> = {
  location: <Building2 className="h-4 w-4" />,
  partnership: <Handshake className="h-4 w-4" />,
  acquisition: <ShoppingCart className="h-4 w-4" />,
  service_line: <Stethoscope className="h-4 w-4" />,
  staffing: <Users className="h-4 w-4" />,
};

export function ThreeYearExpansionEditor({ items, onChange, users }: ThreeYearExpansionEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addItem = () => {
    const newItem: ExpansionItem = {
      id: crypto.randomUUID(),
      type: 'location',
      title: '',
      description: '',
      status: 'planned',
    };
    onChange([...items, newItem]);
    setExpandedId(newItem.id);
  };

  const updateItem = (id: string, updates: Partial<ExpansionItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">3-Year Expansion Plan</label>
          <p className="text-xs text-muted-foreground">
            Locations, partnerships, acquisitions, service lines, and staffing
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          <p className="mb-2">No expansion items yet</p>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Expansion Item
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 space-y-3 bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{TYPE_ICONS[item.type]}</span>
                  <Badge variant="outline" className={EXPANSION_STATUS_COLORS[item.status]}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select
                    value={item.type}
                    onValueChange={(val) => updateItem(item.id, { type: val as ExpansionItemType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPANSION_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            {TYPE_ICONS[key as ExpansionItemType]}
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select
                    value={item.status}
                    onValueChange={(val) => updateItem(item.id, { status: val as ExpansionItemStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  placeholder="e.g., Open 2nd clinic location in Tacoma"
                  value={item.title}
                  onChange={(e) => updateItem(item.id, { title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Details about this expansion..."
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Expected Revenue Impact</label>
                  <Input
                    type="number"
                    placeholder="500000"
                    value={item.expected_revenue_impact || ''}
                    onChange={(e) => updateItem(item.id, { expected_revenue_impact: Number(e.target.value) || undefined })}
                  />
                  {item.expected_revenue_impact && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(item.expected_revenue_impact)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Owner</label>
                  <Select
                    value={item.owner_id || ''}
                    onValueChange={(val) => updateItem(item.id, { owner_id: val || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
