import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { startOfYear, endOfYear, format } from "date-fns";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  threshold: number;
  current: number;
}

export interface TeamLeader {
  userId: string;
  name: string;
  avatarUrl?: string;
  count: number;
}

export interface ProgressStats {
  issuesSolved: number;
  rocksCompleted: number;
  milestonesHit: number;
  shoutoutsGiven: number;
  meetingsHeld: number;
  newTeamMembers: number;
  topMonth: { month: string; score: number } | null;
  longestStreak: { metric: string; weeks: number } | null;
  biggestImprovement: { metric: string; percentChange: number } | null;
  topCoreValue: { name: string; count: number } | null;
  teamLeaders: {
    issueChampion: TeamLeader | null;
    rockStar: TeamLeader | null;
    cultureChampion: TeamLeader | null;
  };
  badges: Badge[];
  yearRange: { start: Date; end: Date };
  hasData: boolean;
}

export const useProgressStats = () => {
  const { data: currentUser } = useCurrentUser();
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());

  return useQuery({
    queryKey: ["progress-stats", currentUser?.team_id, currentYear],
    queryFn: async (): Promise<ProgressStats> => {
      if (!currentUser?.team_id) {
        throw new Error("No team found");
      }

      const teamId = currentUser.team_id;
      const yearStartStr = format(yearStart, "yyyy-MM-dd");
      const yearEndStr = format(yearEnd, "yyyy-MM-dd");

      // Fetch all data in parallel
      const [
        issuesResult,
        rocksResult,
        milestonesResult,
        shoutoutsResult,
        meetingsResult,
        usersResult,
        coreValuesResult,
        metricsResult,
      ] = await Promise.all([
        // Issues solved this year
        supabase
          .from("issues")
          .select("id, solved_at, owner_id")
          .eq("organization_id", teamId)
          .eq("status", "solved")
          .gte("solved_at", yearStartStr)
          .lte("solved_at", yearEndStr),

        // Rocks completed this year (get all and filter by team users)
        supabase
          .from("rocks")
          .select("id, owner_id, status, updated_at")
          .eq("status", "done"),

        // Milestones achieved this year
        supabase
          .from("metric_milestones")
          .select("id, achieved_at, milestone_type")
          .eq("organization_id", teamId)
          .gte("achieved_at", yearStartStr)
          .lte("achieved_at", yearEndStr),

        // Shoutouts given this year
        supabase
          .from("core_value_shoutouts")
          .select("id, core_value_id, created_by, recognized_user_id, created_at")
          .eq("organization_id", teamId)
          .gte("created_at", yearStartStr)
          .lte("created_at", yearEndStr),

        // Meetings held this year
        supabase
          .from("meetings")
          .select("id, scheduled_for, status")
          .eq("organization_id", teamId)
          .eq("status", "completed")
          .gte("scheduled_for", yearStartStr)
          .lte("scheduled_for", yearEndStr),

        // Team members (to calculate new members and filter rocks)
        supabase
          .from("users")
          .select("id, full_name, avatar_url, created_at")
          .eq("team_id", teamId),

        // Core values for shoutout analysis
        supabase
          .from("org_core_values")
          .select("id, title")
          .eq("organization_id", teamId),

        // Metrics for improvement analysis
        supabase
          .from("metrics")
          .select("id, name, metric_results(value, week_start)")
          .eq("organization_id", teamId)
          .order("week_start", { foreignTable: "metric_results", ascending: true }),
      ]);

      // Get user IDs for this team
      const teamUserIds = usersResult.data?.map(u => u.id) || [];

      // Filter rocks by team users
      const teamRocks = rocksResult.data?.filter(r => teamUserIds.includes(r.owner_id || "")) || [];
      const rocksCompleted = teamRocks.length;

      // Issues solved
      const issuesSolved = issuesResult.data?.length || 0;

      // Milestones hit
      const milestonesHit = milestonesResult.data?.length || 0;

      // Shoutouts given
      const shoutoutsGiven = shoutoutsResult.data?.length || 0;

      // Meetings held
      const meetingsHeld = meetingsResult.data?.length || 0;

      // New team members this year
      const newTeamMembers = usersResult.data?.filter(u => {
        const createdAt = new Date(u.created_at);
        return createdAt >= yearStart && createdAt <= yearEnd;
      }).length || 0;

      // Calculate top month by issues + rocks
      const monthScores: Record<string, number> = {};
      issuesResult.data?.forEach(issue => {
        if (issue.solved_at) {
          const month = format(new Date(issue.solved_at), "MMMM");
          monthScores[month] = (monthScores[month] || 0) + 1;
        }
      });
      teamRocks.forEach(rock => {
        if (rock.updated_at) {
          const month = format(new Date(rock.updated_at), "MMMM");
          monthScores[month] = (monthScores[month] || 0) + 2; // Rocks worth more
        }
      });

      const topMonth = Object.entries(monthScores).length > 0
        ? Object.entries(monthScores).reduce((a, b) => a[1] > b[1] ? a : b)
        : null;

      // Calculate biggest improvement
      let biggestImprovement: { metric: string; percentChange: number } | null = null;
      metricsResult.data?.forEach(metric => {
        const results = metric.metric_results || [];
        if (results.length >= 2) {
          const firstValue = Number(results[0]?.value) || 0;
          const lastValue = Number(results[results.length - 1]?.value) || 0;
          if (firstValue > 0) {
            const percentChange = ((lastValue - firstValue) / firstValue) * 100;
            if (!biggestImprovement || percentChange > biggestImprovement.percentChange) {
              biggestImprovement = { metric: metric.name, percentChange: Math.round(percentChange) };
            }
          }
        }
      });

      // Top core value
      const coreValueCounts: Record<string, number> = {};
      shoutoutsResult.data?.forEach(shoutout => {
        if (shoutout.core_value_id) {
          coreValueCounts[shoutout.core_value_id] = (coreValueCounts[shoutout.core_value_id] || 0) + 1;
        }
      });
      const topCoreValueId = Object.entries(coreValueCounts).length > 0
        ? Object.entries(coreValueCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : null;
      const topCoreValue = topCoreValueId
        ? { 
            name: coreValuesResult.data?.find(cv => cv.id === topCoreValueId)?.title || "Unknown",
            count: coreValueCounts[topCoreValueId]
          }
        : null;

      // Team leaders
      const issuesByUser: Record<string, number> = {};
      issuesResult.data?.forEach(issue => {
        if (issue.owner_id) {
          issuesByUser[issue.owner_id] = (issuesByUser[issue.owner_id] || 0) + 1;
        }
      });
      const topIssueSolver = Object.entries(issuesByUser).length > 0
        ? Object.entries(issuesByUser).reduce((a, b) => a[1] > b[1] ? a : b)
        : null;

      const rocksByUser: Record<string, number> = {};
      teamRocks.forEach(rock => {
        if (rock.owner_id) {
          rocksByUser[rock.owner_id] = (rocksByUser[rock.owner_id] || 0) + 1;
        }
      });
      const topRockCompleter = Object.entries(rocksByUser).length > 0
        ? Object.entries(rocksByUser).reduce((a, b) => a[1] > b[1] ? a : b)
        : null;

      const shoutoutsByUser: Record<string, number> = {};
      shoutoutsResult.data?.forEach(shoutout => {
        if (shoutout.created_by) {
          shoutoutsByUser[shoutout.created_by] = (shoutoutsByUser[shoutout.created_by] || 0) + 1;
        }
      });
      const topShoutoutGiver = Object.entries(shoutoutsByUser).length > 0
        ? Object.entries(shoutoutsByUser).reduce((a, b) => a[1] > b[1] ? a : b)
        : null;

      const getUserInfo = (userId: string): TeamLeader | null => {
        const user = usersResult.data?.find(u => u.id === userId);
        if (!user) return null;
        return {
          userId,
          name: user.full_name || "Team Member",
          avatarUrl: user.avatar_url || undefined,
          count: 0,
        };
      };

      // Build badges
      const badges: Badge[] = [
        {
          id: "problem-solver",
          name: "Problem Solver",
          description: "Solved 10+ issues",
          icon: "🔧",
          threshold: 10,
          current: issuesSolved,
          unlocked: issuesSolved >= 10,
        },
        {
          id: "goal-crusher",
          name: "Goal Crusher",
          description: "Completed 5+ rocks",
          icon: "🎯",
          threshold: 5,
          current: rocksCompleted,
          unlocked: rocksCompleted >= 5,
        },
        {
          id: "record-breaker",
          name: "Record Breaker",
          description: "Hit 3+ all-time highs",
          icon: "🏆",
          threshold: 3,
          current: milestonesHit,
          unlocked: milestonesHit >= 3,
        },
        {
          id: "culture-champion",
          name: "Culture Champion",
          description: "Gave 10+ shoutouts",
          icon: "⭐",
          threshold: 10,
          current: shoutoutsGiven,
          unlocked: shoutoutsGiven >= 10,
        },
        {
          id: "meeting-master",
          name: "Meeting Master",
          description: "Held 20+ meetings",
          icon: "📅",
          threshold: 20,
          current: meetingsHeld,
          unlocked: meetingsHeld >= 20,
        },
        {
          id: "team-builder",
          name: "Team Builder",
          description: "Added 3+ team members",
          icon: "👥",
          threshold: 3,
          current: newTeamMembers,
          unlocked: newTeamMembers >= 3,
        },
      ];

      const hasData = issuesSolved > 0 || rocksCompleted > 0 || milestonesHit > 0 || 
                      shoutoutsGiven > 0 || meetingsHeld > 0;

      return {
        issuesSolved,
        rocksCompleted,
        milestonesHit,
        shoutoutsGiven,
        meetingsHeld,
        newTeamMembers,
        topMonth: topMonth ? { month: topMonth[0], score: topMonth[1] } : null,
        longestStreak: null, // Complex calculation, can be added later
        biggestImprovement,
        topCoreValue,
        teamLeaders: {
          issueChampion: topIssueSolver ? { ...getUserInfo(topIssueSolver[0])!, count: topIssueSolver[1] } : null,
          rockStar: topRockCompleter ? { ...getUserInfo(topRockCompleter[0])!, count: topRockCompleter[1] } : null,
          cultureChampion: topShoutoutGiver ? { ...getUserInfo(topShoutoutGiver[0])!, count: topShoutoutGiver[1] } : null,
        },
        badges,
        yearRange: { start: yearStart, end: yearEnd },
        hasData,
      };
    },
    enabled: !!currentUser?.team_id,
  });
};
