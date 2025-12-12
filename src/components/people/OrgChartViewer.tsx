import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Users } from "lucide-react";

interface Seat {
  id: string;
  title: string;
  responsibilities: string[];
  user_id: string | null;
  reports_to_seat_id: string | null;
  department_id: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

interface Department {
  id: string;
  name: string;
}

interface OrgChartViewerProps {
  seats: Seat[];
  departments: Department[];
  onSeatClick?: (seat: Seat) => void;
}

interface TreeNode {
  seat: Seat;
  children: TreeNode[];
}

function buildTree(seats: Seat[]): TreeNode[] {
  const seatMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // Create nodes for all seats
  seats.forEach((seat) => {
    seatMap.set(seat.id, { seat, children: [] });
  });

  // Build tree structure
  seats.forEach((seat) => {
    const node = seatMap.get(seat.id)!;
    if (seat.reports_to_seat_id && seatMap.has(seat.reports_to_seat_id)) {
      seatMap.get(seat.reports_to_seat_id)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

function SeatCard({ seat, onClick }: { seat: Seat; onClick?: () => void }) {
  const initials = seat.user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div
      className={`w-48 cursor-pointer border rounded-lg bg-card hover:border-primary transition-colors ${
        !seat.user_id ? 'border-dashed border-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="p-3 text-center">
        <Avatar className="h-12 w-12 mx-auto mb-2">
          <AvatarFallback className={seat.user_id ? 'bg-primary/10 text-primary' : 'bg-muted'}>
            {seat.user_id ? initials : <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <p className="font-medium text-sm truncate">{seat.title}</p>
        {seat.user?.full_name ? (
          <p className="text-xs text-muted-foreground truncate">{seat.user.full_name}</p>
        ) : (
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium mt-1">
            Open Seat
          </span>
        )}
      </div>
    </div>
  );
}

function TreeLevel({ nodes, onSeatClick, level = 0 }: { nodes: TreeNode[]; onSeatClick?: (seat: Seat) => void; level?: number }) {
  if (nodes.length === 0) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-6 justify-center flex-wrap">
        {nodes.map((node) => (
          <div key={node.seat.id} className="flex flex-col items-center">
            <SeatCard seat={node.seat} onClick={() => onSeatClick?.(node.seat)} />
            {node.children.length > 0 && (
              <>
                <div className="w-px h-6 bg-border" />
                {node.children.length > 1 && (
                  <div 
                    className="h-px bg-border" 
                    style={{ 
                      width: `calc(${(node.children.length - 1) * 192}px + ${(node.children.length - 1) * 24}px)` 
                    }} 
                  />
                )}
                <div className="flex gap-6">
                  {node.children.map((child, idx) => (
                    <div key={child.seat.id} className="flex flex-col items-center">
                      <div className="w-px h-6 bg-border" />
                      <TreeLevel nodes={[child]} onSeatClick={onSeatClick} level={level + 1} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrgChartViewer({ seats, departments, onSeatClick }: OrgChartViewerProps) {
  const tree = useMemo(() => buildTree(seats), [seats]);

  // Group seats by department for seats without reports_to_seat_id
  const departmentGroups = useMemo(() => {
    const groups: Record<string, Seat[]> = {};
    seats.forEach((seat) => {
      if (!seat.reports_to_seat_id && seat.department_id) {
        if (!groups[seat.department_id]) {
          groups[seat.department_id] = [];
        }
        groups[seat.department_id].push(seat);
      }
    });
    return groups;
  }, [seats]);

  if (seats.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No seats defined yet</p>
        <p className="text-sm text-muted-foreground">Create seats in Seat Management to see your org chart</p>
      </div>
    );
  }

  // If there's a clear hierarchy, show tree view
  const hasHierarchy = seats.some((s) => s.reports_to_seat_id);

  if (hasHierarchy) {
    return (
      <div className="overflow-x-auto p-6">
        <TreeLevel nodes={tree} onSeatClick={onSeatClick} />
      </div>
    );
  }

  // Otherwise show department-grouped flat view
  return (
    <div className="space-y-6 p-6">
      {departments.map((dept) => {
        const deptSeats = seats.filter((s) => s.department_id === dept.id);
        if (deptSeats.length === 0) return null;

        return (
          <div key={dept.id}>
            <h3 className="font-medium text-sm text-muted-foreground mb-3">{dept.name}</h3>
            <div className="flex flex-wrap gap-4">
              {deptSeats.map((seat) => (
                <SeatCard key={seat.id} seat={seat} onClick={() => onSeatClick?.(seat)} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Unassigned department */}
      {(() => {
        const unassignedSeats = seats.filter((s) => !s.department_id);
        if (unassignedSeats.length === 0) return null;

        return (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-3">Unassigned</h3>
            <div className="flex flex-wrap gap-4">
              {unassignedSeats.map((seat) => (
                <SeatCard key={seat.id} seat={seat} onClick={() => onSeatClick?.(seat)} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
