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
    const { data, error } = await supabase
      .from("user_tour_status")
      .insert({
        user_id: userId,
        completed: false,
        current_step: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error starting tour:", error);
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
};
