/**
 * Intervention Execution Health Score Calculator
 * 
 * Metrics:
 * - % To-Dos completed on time
 * - To-Do rollover rate (carried over from previous periods)
 * - Assignment churn rate (owner changes)
 * 
 * Score: 0-100 composite health score
 */

import { supabase } from "@/integrations/supabase/client";

export interface ExecutionHealthMetrics {
  todoCompletionRate: number;     // % completed on time (0-100)
  todoRolloverRate: number;       // % rolled over (lower is better, 0-100)
  assignmentChurnRate: number;    // % owner changes (lower is better, 0-100)
  overallScore: number;           // Weighted composite (0-100)
  totalTodos: number;
  completedTodos: number;
  overdueTodos: number;
}

interface TodoForHealth {
  id: string;
  done_at: string | null;
  due_date: string | null;
  created_at: string;
  owner_id: string | null;
}

/**
 * Calculate execution health score for an intervention
 * 
 * Weights:
 * - Completion rate: 50%
 * - Rollover rate: 30% (inverted - lower is better)
 * - Churn rate: 20% (inverted - lower is better)
 */
export function calculateExecutionHealthScore(
  todos: TodoForHealth[],
  now: Date = new Date()
): ExecutionHealthMetrics {
  if (todos.length === 0) {
    return {
      todoCompletionRate: 100,
      todoRolloverRate: 0,
      assignmentChurnRate: 0,
      overallScore: 100,
      totalTodos: 0,
      completedTodos: 0,
      overdueTodos: 0,
    };
  }

  const totalTodos = todos.length;
  const completedTodos = todos.filter((t) => t.done_at !== null).length;
  
  // Calculate completion rate
  const completionRate = (completedTodos / totalTodos) * 100;

  // Calculate on-time completion rate (more nuanced)
  let onTimeCompletions = 0;
  let overdueCompletions = 0;
  let currentlyOverdue = 0;

  for (const todo of todos) {
    if (todo.due_date) {
      const dueDate = new Date(todo.due_date);
      
      if (todo.done_at) {
        const completedDate = new Date(todo.done_at);
        if (completedDate <= dueDate) {
          onTimeCompletions++;
        } else {
          overdueCompletions++;
        }
      } else if (dueDate < now) {
        currentlyOverdue++;
      }
    } else if (todo.done_at) {
      // No due date but completed - count as on-time
      onTimeCompletions++;
    }
  }

  const todosWithDueDate = todos.filter((t) => t.due_date).length;
  const todoCompletionRate = todosWithDueDate > 0 
    ? ((onTimeCompletions) / todosWithDueDate) * 100
    : completionRate;

  // Rollover rate: % of todos that are overdue and incomplete
  const todoRolloverRate = totalTodos > 0 
    ? (currentlyOverdue / totalTodos) * 100
    : 0;

  // Assignment churn: Estimate from todos with no owner (indicating unclear ownership)
  // In production, would track owner_id changes in audit log
  const unassignedTodos = todos.filter((t) => !t.owner_id && !t.done_at).length;
  const assignmentChurnRate = totalTodos > 0
    ? (unassignedTodos / totalTodos) * 100
    : 0;

  // Calculate weighted score
  const completionWeight = 0.5;
  const rolloverWeight = 0.3;
  const churnWeight = 0.2;

  // Invert rollover and churn (lower is better)
  const rolloverScore = Math.max(0, 100 - todoRolloverRate);
  const churnScore = Math.max(0, 100 - assignmentChurnRate);

  const overallScore = Math.round(
    todoCompletionRate * completionWeight +
    rolloverScore * rolloverWeight +
    churnScore * churnWeight
  );

  return {
    todoCompletionRate: Math.round(todoCompletionRate),
    todoRolloverRate: Math.round(todoRolloverRate),
    assignmentChurnRate: Math.round(assignmentChurnRate),
    overallScore: Math.min(100, Math.max(0, overallScore)),
    totalTodos,
    completedTodos,
    overdueTodos: currentlyOverdue,
  };
}

/**
 * Fetch and calculate execution health for an intervention
 */
export async function getInterventionExecutionHealth(
  interventionId: string
): Promise<ExecutionHealthMetrics | null> {
  const { data: todos, error } = await supabase
    .from("todos")
    .select("id, done_at, due_date, created_at, owner_id")
    .eq("intervention_id", interventionId);

  if (error) {
    console.error("Error fetching todos for health score:", error);
    return null;
  }

  return calculateExecutionHealthScore(todos || []);
}

/**
 * Update intervention's execution_health_score in database
 */
export async function updateInterventionExecutionHealth(
  interventionId: string
): Promise<ExecutionHealthMetrics | null> {
  const health = await getInterventionExecutionHealth(interventionId);
  
  if (!health) return null;

  const { error } = await supabase
    .from("interventions")
    .update({
      execution_health_score: health.overallScore,
      execution_health_calculated_at: new Date().toISOString(),
    })
    .eq("id", interventionId);

  if (error) {
    console.error("Error updating execution health score:", error);
  }

  return health;
}

/**
 * Get health score badge variant
 */
export function getHealthScoreVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  if (score >= 40) return "outline";
  return "destructive";
}

/**
 * Get health score label
 */
export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Needs Attention";
  return "At Risk";
}
