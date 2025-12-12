import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { useToast } from "./use-toast";
import type { CoreValue, CoreValueSpotlight } from "@/lib/core-values/types";
import { DEFAULT_CORE_VALUES } from "@/lib/core-values/defaults";

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

  // Rotate spotlight (manual trigger)
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

  // Check if rotation is needed (client-side fallback, server cron is primary)
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
