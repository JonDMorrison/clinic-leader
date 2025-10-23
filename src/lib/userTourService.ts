import { supabase } from "@/integrations/supabase/client";

export interface TourStatus {
  id: string;
  user_id: string;
  completed: boolean;
  current_step: number;
  updated_at: string;
}

export const userTourService = {
  async getTourStatus(userId: string): Promise<TourStatus | null> {
    const { data, error } = await supabase
      .from("user_tour_status")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching tour status:", error);
      return null;
    }

    return data;
  },

  async startTour(userId: string): Promise<TourStatus | null> {
    // Check if tour status already exists
    const existing = await this.getTourStatus(userId);
    if (existing) {
      return existing;
    }

    // Get user's team_id first
    const { data: userData } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", userId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("user_tour_status")
      .insert({
        user_id: userId,
        organization_id: userData?.team_id,
        completed: false,
        current_step: 0,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error starting tour:", error);
      // If unique constraint violation, try to fetch existing record
      if (error.code === "23505") {
        return await this.getTourStatus(userId);
      }
      return null;
    }

    return data;
  },

  async updateStep(userId: string, step: number): Promise<void> {
    const { error } = await supabase
      .from("user_tour_status")
      .update({ current_step: step })
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating tour step:", error);
    }
  },

  async completeTour(userId: string): Promise<void> {
    const { error } = await supabase
      .from("user_tour_status")
      .update({ completed: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error completing tour:", error);
    }
  },

  async resetTour(userId: string): Promise<void> {
    const { error } = await supabase
      .from("user_tour_status")
      .update({ completed: false, current_step: 0 })
      .eq("user_id", userId);

    if (error) {
      console.error("Error resetting tour:", error);
    }
  },

  async relaunchTour(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("user_tour_status")
      .update({ completed: false, current_step: 0 })
      .eq("user_id", userId);

    if (error) {
      console.error("Error relaunching tour:", error);
      return false;
    }

    return true;
  },

  async getAnalytics(orgId: string): Promise<{
    total_users: number;
    completed_count: number;
    pending_count: number;
    completion_rate: number;
  } | null> {
    const { data, error } = await supabase
      .rpc("get_onboarding_metrics", { org_id: orgId });

    if (error) {
      console.error("Error fetching analytics:", error);
      return null;
    }

    return data?.[0] || null;
  },

  async getUserDetails(orgId: string): Promise<any[]> {
    const { data, error } = await supabase
      .rpc("get_user_onboarding_details", { org_id: orgId });

    if (error) {
      console.error("Error fetching user details:", error);
      return [];
    }

    return data || [];
  },
};
