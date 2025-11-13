import { useState } from "react";
import { ClarityShell } from "@/components/clarity/ClarityShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { DroppableBoard } from "@/components/clarity/traction/DroppableBoard";
import { GoalCard } from "@/components/clarity/traction/GoalCard";
import { LinkDrawer } from "@/components/clarity/traction/LinkDrawer";
import { ActivityFeed } from "@/components/clarity/traction/ActivityFeed";
import { NewGoalDialog } from "@/components/clarity/traction/NewGoalDialog";

interface Goal {
  id: string;
  title: string;
  owner: string;
  status: "on_track" | "at_risk" | "off_track" | "complete";
  dueDate: string;
  linkedKpis: string[];
  board: "one_year" | "quarterly" | "issues";
}

export default function TractionEngine() {
  const { data: user } = useCurrentUser();
  const [linkDrawerOpen, setLinkDrawerOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newGoalDialog, setNewGoalDialog] = useState<{
    open: boolean;
    board: "one_year" | "quarterly" | "issues" | null;
  }>({ open: false, board: null });

  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      title: "Expand to second location",
      owner: "Sarah Chen",
      status: "on_track",
      dueDate: "Dec 2025",
      linkedKpis: ["1", "3"],
      board: "one_year",
    },
    {
      id: "2",
      title: "Hire 3 practitioners",
      owner: "Mike Johnson",
      status: "at_risk",
      dueDate: "Jun 2025",
      linkedKpis: ["4"],
      board: "one_year",
    },
    {
      id: "3",
      title: "Launch new service line",
      owner: "Emily Davis",
      status: "on_track",
      dueDate: "Sep 2025",
      linkedKpis: ["1", "2"],
      board: "one_year",
    },
    {
      id: "4",
      title: "Q1 Revenue Growth",
      owner: "Finance Team",
      status: "complete",
      dueDate: "Mar 2025",
      linkedKpis: ["1"],
      board: "quarterly",
    },
    {
      id: "5",
      title: "Marketing Campaign",
      owner: "Marketing",
      status: "on_track",
      dueDate: "Mar 2025",
      linkedKpis: ["3"],
      board: "quarterly",
    },
    {
      id: "6",
      title: "Staff Training Program",
      owner: "HR",
      status: "at_risk",
      dueDate: "Feb 2025",
      linkedKpis: ["4", "5"],
      board: "quarterly",
    },
    {
      id: "7",
      title: "EHR integration delays",
      owner: "Tech Lead",
      status: "off_track",
      dueDate: "Urgent",
      linkedKpis: [],
      board: "issues",
    },
    {
      id: "8",
      title: "Permit approval pending",
      owner: "Operations",
      status: "at_risk",
      dueDate: "This week",
      linkedKpis: [],
      board: "issues",
    },
  ]);

  const oneYearGoals = goals.filter((g) => g.board === "one_year");
  const quarterlyGoals = goals.filter((g) => g.board === "quarterly");
  const issueGoals = goals.filter((g) => g.board === "issues");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeGoal = goals.find((g) => g.id === active.id);
    if (!activeGoal) return;

    const overId = over.id as string;
    let newBoard: "one_year" | "quarterly" | "issues" | null = null;

    if (["one_year", "quarterly", "issues"].includes(overId)) {
      newBoard = overId as "one_year" | "quarterly" | "issues";
    } else {
      const overGoal = goals.find((g) => g.id === overId);
      if (overGoal) {
        newBoard = overGoal.board;
      }
    }

    if (newBoard && newBoard !== activeGoal.board) {
      setGoals((prev) =>
        prev.map((g) => (g.id === active.id ? { ...g, board: newBoard! } : g))
      );
    } else if (active.id !== over.id) {
      const board = activeGoal.board;
      const boardGoals = goals.filter((g) => g.board === board);
      const oldIndex = boardGoals.findIndex((g) => g.id === active.id);
      const newIndex = boardGoals.findIndex((g) => g.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(boardGoals, oldIndex, newIndex);
        setGoals((prev) => [
          ...prev.filter((g) => g.board !== board),
          ...reordered,
        ]);
      }
    }
  };

  const handleLink = (goal: Goal) => {
    setSelectedGoal(goal);
    setLinkDrawerOpen(true);
  };

  const handleSaveLinks = (kpiIds: string[]) => {
    if (selectedGoal) {
      setGoals((prev) =>
        prev.map((g) => (g.id === selectedGoal.id ? { ...g, linkedKpis: kpiIds } : g))
      );
    }
  };

  const handleAddGoal = (board: "one_year" | "quarterly" | "issues") => {
    setNewGoalDialog({ open: true, board });
  };

  const handleSaveNewGoal = (goalData: any) => {
    const newGoal: Goal = {
      id: `new-${Date.now()}`,
      title: goalData.title,
      owner: goalData.owner,
      status: "on_track",
      dueDate: goalData.dueDate || "TBD",
      linkedKpis: [],
      board: goalData.type,
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const miniMapSections = [
    { id: "one-year", label: "1-Year Plan", complete: false, href: "/clarity/traction#one-year" },
    { id: "quarterly", label: "Quarterly", complete: false, href: "/clarity/traction#quarterly" },
    { id: "issues", label: "Issues", complete: false, href: "/clarity/traction#issues" },
  ];

  return (
    <ClarityShell
      organizationId={user?.team_id || ""}
      autosaveStatus="saved"
      miniMapSections={miniMapSections}
    >
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-[1fr_1fr_1fr_300px] gap-6">
          <DroppableBoard
            id="one_year"
            title="1-Year Plan"
            items={oneYearGoals}
            onAddNew={() => handleAddGoal("one_year")}
          >
            {oneYearGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                id={goal.id}
                title={goal.title}
                owner={goal.owner}
                status={goal.status}
                dueDate={goal.dueDate}
                linkedKpis={goal.linkedKpis.length}
                onLink={() => handleLink(goal)}
              />
            ))}
          </DroppableBoard>

          <DroppableBoard
            id="quarterly"
            title="Quarterly Priorities"
            items={quarterlyGoals}
            onAddNew={() => handleAddGoal("quarterly")}
          >
            {quarterlyGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                id={goal.id}
                title={goal.title}
                owner={goal.owner}
                status={goal.status}
                dueDate={goal.dueDate}
                linkedKpis={goal.linkedKpis.length}
                onLink={() => handleLink(goal)}
              />
            ))}
          </DroppableBoard>

          <DroppableBoard
            id="issues"
            title="Issues"
            items={issueGoals}
            onAddNew={() => handleAddGoal("issues")}
          >
            {issueGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                id={goal.id}
                title={goal.title}
                owner={goal.owner}
                status={goal.status}
                dueDate={goal.dueDate}
                linkedKpis={goal.linkedKpis.length}
                onLink={() => handleLink(goal)}
              />
            ))}
          </DroppableBoard>

          <ActivityFeed />
        </div>
      </DndContext>

      {selectedGoal && (
        <LinkDrawer
          open={linkDrawerOpen}
          onOpenChange={setLinkDrawerOpen}
          goalTitle={selectedGoal.title}
          linkedKpis={selectedGoal.linkedKpis}
          onSave={handleSaveLinks}
        />
      )}

      {newGoalDialog.board && (
        <NewGoalDialog
          open={newGoalDialog.open}
          onOpenChange={(open) => setNewGoalDialog({ open, board: null })}
          boardType={newGoalDialog.board}
          onSave={handleSaveNewGoal}
        />
      )}
    </ClarityShell>
  );
}
