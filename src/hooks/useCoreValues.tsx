import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { useToast } from "./use-toast";

export interface CoreValue {
  id: string;
  organization_id: string;
  title: string;
  short_behavior: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CoreValueSpotlight {
  id: string;
  organization_id: string;
  current_core_value_id: string | null;
  rotation_mode: string;
  rotates_on_weekday: number;
  last_rotated_at: string | null;
  created_at: string;
}

export interface CoreValueShoutout {
  id: string;
  organization_id: string;
  meeting_id: string | null;
  created_by: string | null;
  recognized_user_id: string | null;
  core_value_id: string | null;
  note: string | null;
  created_at: string;
  // Joined fields
  recognized_user?: { full_name: string } | null;
  created_by_user?: { full_name: string } | null;
  core_value?: { title: string } | null;
}

const DEFAULT_CORE_VALUES = [
  {
    title: "Treat Our Patients Like We'd Want Our Family to be Treated",
    short_behavior: "Speak with empathy. Explain clearly. Choose the option you'd want for your own family.",
    sort_order: 0,
  },
  {
    title: "Dedicated Can-Do Attitude",
    short_behavior: "Take ownership. Find a way forward. Solve problems without passing the buck.",
    sort_order: 1,
  },
  {
    title: "Uncompromised Quality of Care – Be the Best at Whatever You Do",
    short_behavior: "Do it right the first time. Keep learning. Hold the standard even when busy.",
    sort_order: 2,
  },
  {
    title: "Returning Customer Service to Health Care",
    short_behavior: "Be responsive, respectful, and clear. Make it easy to get help and follow through.",
    sort_order: 3,
  },
  {
    title: "Patient Advocates",
    short_behavior: "Protect the patient's best interest. Communicate options. Remove friction and confusion.",
    sort_order: 4,
  },
];

export function useCoreValues() {
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const orgId = user?.team_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch core values for org
  const {
    data: coreValues,
    isLoading: valuesLoading,
    refetch: refetchValues,
  } = useQuery({
    queryKey: ["core-values", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("org_core_values")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as CoreValue[];
    },
    enabled: !!orgId,
  });

  // Fetch spotlight
  const {
    data: spotlight,
    isLoading: spotlightLoading,
    refetch: refetchSpotlight,
  } = useQuery({
    queryKey: ["core-value-spotlight", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      
      const { data, error } = await supabase
        .from("core_value_spotlight")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (error) throw error;
      return data as CoreValueSpotlight | null;
    },
    enabled: !!orgId,
  });

  // Seed default values if none exist
  const seedDefaults = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      
      // Check if values already exist
      const { data: existing } = await supabase
        .from("org_core_values")
        .select("id")
        .eq("organization_id", orgId)
        .limit(1);

      if (existing && existing.length > 0) return existing;

      // Insert defaults
      const valuesToInsert = DEFAULT_CORE_VALUES.map((v) => ({
        ...v,
        organization_id: orgId,
        is_active: true,
      }));

      const { data, error } = await supabase
        .from("org_core_values")
        .insert(valuesToInsert)
        .select();

      if (error) throw error;

      // Create spotlight with first value
      if (data && data.length > 0) {
        await supabase.from("core_value_spotlight").upsert({
          organization_id: orgId,
          current_core_value_id: data[0].id,
          rotation_mode: "weekly",
          rotates_on_weekday: 1,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-values", orgId] });
      queryClient.invalidateQueries({ queryKey: ["core-value-spotlight", orgId] });
    },
  });

  // Update core value
  const updateValue = useMutation({
    mutationFn: async (value: Partial<CoreValue> & { id: string }) => {
      const { data, error } = await supabase
        .from("org_core_values")
        .update({
          title: value.title,
          short_behavior: value.short_behavior,
          is_active: value.is_active,
          sort_order: value.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", value.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-values", orgId] });
      toast({ title: "Core value updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  // Set spotlight value
  const setSpotlightValue = useMutation({
    mutationFn: async (coreValueId: string) => {
      if (!orgId) throw new Error("No organization");

      const { data, error } = await supabase
        .from("core_value_spotlight")
        .upsert({
          organization_id: orgId,
          current_core_value_id: coreValueId,
          last_rotated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-value-spotlight", orgId] });
      toast({ title: "Value of the week updated" });
    },
  });

  // Rotate spotlight (weekly logic)
  const rotateSpotlight = useMutation({
    mutationFn: async () => {
      if (!orgId || !coreValues || coreValues.length === 0) return null;

      const activeValues = coreValues.filter((v) => v.is_active);
      if (activeValues.length === 0) return null;

      const currentIndex = spotlight?.current_core_value_id
        ? activeValues.findIndex((v) => v.id === spotlight.current_core_value_id)
        : -1;

      const nextIndex = (currentIndex + 1) % activeValues.length;
      const nextValue = activeValues[nextIndex];

      const { data, error } = await supabase
        .from("core_value_spotlight")
        .upsert({
          organization_id: orgId,
          current_core_value_id: nextValue.id,
          last_rotated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-value-spotlight", orgId] });
    },
  });

  // Get current spotlight value
  const currentSpotlightValue = coreValues?.find(
    (v) => v.id === spotlight?.current_core_value_id
  );

  // Check if rotation is needed
  const checkAndRotate = async () => {
    if (!spotlight?.last_rotated_at) {
      // First time, set initial value
      if (coreValues && coreValues.length > 0) {
        const activeValues = coreValues.filter((v) => v.is_active);
        if (activeValues.length > 0 && !spotlight?.current_core_value_id) {
          await setSpotlightValue.mutateAsync(activeValues[0].id);
        }
      }
      return;
    }

    const lastRotated = new Date(spotlight.last_rotated_at);
    const daysSince = (Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24);
    const today = new Date().getDay();
    const rotationDay = spotlight.rotates_on_weekday ?? 1;

    if (daysSince >= 6 && today === rotationDay) {
      await rotateSpotlight.mutateAsync();
    }
  };

  return {
    coreValues: coreValues || [],
    activeValues: (coreValues || []).filter((v) => v.is_active),
    spotlight,
    currentSpotlightValue,
    isLoading: valuesLoading || spotlightLoading,
    seedDefaults,
    updateValue,
    setSpotlightValue,
    rotateSpotlight,
    checkAndRotate,
    refetchValues,
    refetchSpotlight,
  };
}

export function useCoreValueShoutouts(meetingId?: string) {
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const orgId = user?.team_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: shoutouts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["core-value-shoutouts", orgId, meetingId],
    queryFn: async () => {
      if (!orgId) return [];

      let query = supabase
        .from("core_value_shoutouts")
        .select(`
          *,
          recognized_user:users!core_value_shoutouts_recognized_user_id_fkey(full_name),
          created_by_user:users!core_value_shoutouts_created_by_fkey(full_name),
          core_value:org_core_values!core_value_shoutouts_core_value_id_fkey(title)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (meetingId) {
        query = query.eq("meeting_id", meetingId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as unknown as CoreValueShoutout[];
    },
    enabled: !!orgId,
  });

  const createShoutout = useMutation({
    mutationFn: async (shoutout: {
      recognized_user_id: string;
      core_value_id: string;
      note?: string;
      meeting_id?: string;
    }) => {
      if (!orgId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("core_value_shoutouts")
        .insert({
          organization_id: orgId,
          created_by: user.id,
          recognized_user_id: shoutout.recognized_user_id,
          core_value_id: shoutout.core_value_id,
          note: shoutout.note,
          meeting_id: shoutout.meeting_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-value-shoutouts", orgId] });
      toast({ title: "Shout-out added! 🎉" });
    },
    onError: () => {
      toast({ title: "Failed to add shout-out", variant: "destructive" });
    },
  });

  const deleteShoutout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("core_value_shoutouts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-value-shoutouts", orgId] });
      toast({ title: "Shout-out removed" });
    },
  });

  return {
    shoutouts: shoutouts || [],
    isLoading,
    createShoutout,
    deleteShoutout,
    refetch,
  };
}

export function useCoreValuesAck() {
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const orgId = user?.team_id;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: ack, isLoading } = useQuery({
    queryKey: ["core-values-ack", orgId, userId],
    queryFn: async () => {
      if (!orgId || !userId) return null;

      const { data, error } = await supabase
        .from("core_values_ack")
        .select("*")
        .eq("organization_id", orgId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!userId,
  });

  const acknowledge = useMutation({
    mutationFn: async (versionHash: string) => {
      if (!orgId || !userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("core_values_ack")
        .upsert({
          organization_id: orgId,
          user_id: userId,
          acknowledged_at: new Date().toISOString(),
          version_hash: versionHash,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-values-ack", orgId, userId] });
    },
  });

  const hasAcknowledged = !!ack;

  return {
    ack,
    hasAcknowledged,
    isLoading,
    acknowledge,
  };
}

// Generate hash from core values for version tracking
export function generateCoreValuesHash(values: CoreValue[]): string {
  const content = values
    .filter((v) => v.is_active)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((v) => `${v.title}|${v.short_behavior || ""}`)
    .join("||");
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
