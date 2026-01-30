# C) RLS and Tenant Scoping

## Database Functions for Team Scoping

**Source:** Database functions from Supabase

```sql
CREATE OR REPLACE FUNCTION public.current_user_team()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT team_id FROM public.users WHERE email = auth.email() LIMIT 1;
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.is_same_team(check_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = auth.email() 
    AND team_id = check_team_id
  );
$function$
```

```sql
CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.users WHERE email = auth.email() LIMIT 1;
$function$
```

## RLS Policies for metric_results

**UNVERIFIED** - RLS policies not included in provided context. Must query database directly.

Expected pattern based on other tables:

```sql
-- Expected SELECT policy
CREATE POLICY "Users can view own org metric_results"
ON public.metric_results
FOR SELECT
USING (is_same_team(organization_id));

-- Expected INSERT policy
CREATE POLICY "Users can insert own org metric_results"
ON public.metric_results
FOR INSERT
WITH CHECK (is_same_team(organization_id));
```

## Team Scoping in /data Queries

**File:** `src/pages/DataHome.tsx`

```tsx
// Lines 14-17
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Line 25
const { data: currentUser } = useCurrentUser();

// Lines 28-43 - Jane connector query scoped by team_id
const { data: janeConnector, isLoading: janeLoading } = useQuery({
  queryKey: ["jane-connector", currentUser?.team_id],
  queryFn: async () => {
    if (!currentUser?.team_id) return null;
    
    const { data } = await supabase
      .from("bulk_analytics_connectors")
      .select("*")
      .eq("organization_id", currentUser.team_id)
      .eq("source_system", "jane")
      .maybeSingle();
    
    return data;
  },
  enabled: !!currentUser?.team_id,
});

// Lines 46-62 - Ingest logs scoped by team_id
const { data: recentIngests } = useQuery({
  queryKey: ["recent-ingests", currentUser?.team_id],
  queryFn: async () => {
    if (!currentUser?.team_id) return [];
    
    const { data } = await supabase
      .from("file_ingest_log")
      .select("created_at, status")
      .eq("organization_id", currentUser.team_id)
      .eq("source_system", "jane")
      .order("created_at", { ascending: false })
      .limit(1);
    
    return data || [];
  },
  enabled: !!currentUser?.team_id,
});

// Lines 65-82 - Metrics count scoped by team_id
const { data: metricsCount } = useQuery({
  queryKey: ["metrics-count", currentUser?.team_id],
  queryFn: async () => {
    if (!currentUser?.team_id) return { total: 0, automated: 0 };
    
    const { data: metrics } = await supabase
      .from("metrics")
      .select("sync_source")
      .eq("organization_id", currentUser.team_id)
      .eq("is_active", true);
    
    const total = metrics?.length || 0;
    const automated = metrics?.filter(m => m.sync_source === "jane_pipe").length || 0;
    
    return { total, automated };
  },
  enabled: !!currentUser?.team_id,
});
```

## useCurrentUser Hook

**File:** `src/hooks/useCurrentUser.tsx`

```tsx
export const useCurrentUser = () => {
  const { isImpersonating, impersonationData } = useImpersonation();

  return useQuery({
    queryKey: ["current-user", isImpersonating, impersonationData?.targetUserId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (isImpersonating && impersonationData?.targetUserId) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", impersonationData.targetUserId)
          .maybeSingle();
        // ...
        return data;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();
      // ...
      return data;
    },
  });
};
```

## Teams Table Schema

**Source:** `src/integrations/supabase/types.ts`

```typescript
teams: {
  Row: {
    created_at: string
    id: string
    name: string
    owner_id: string | null
    scorecard_mode: string | null
    updated_at: string
  }
}
```

**Note:** `data_mode` column does not currently exist on teams table.
