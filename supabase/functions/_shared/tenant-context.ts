import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface TenantContext {
  userId: string;
  teamId: string;
  userEmail: string;
  userRole: string;
}

/**
 * Validates tenant context and ensures the authenticated user
 * can only access data for their own organization.
 * 
 * @param req - The incoming request with Authorization header
 * @param requestedTeamId - Optional team_id from request body to validate
 * @returns TenantContext with validated user info
 * @throws Error if authentication fails or tenant validation fails
 */
export async function getTenantContext(
  req: Request,
  requestedTeamId?: string
): Promise<TenantContext> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Authentication failed: ' + (authError?.message || 'User not found'));
  }

  // Get user's team_id and role from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('team_id, role, email')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error('Failed to fetch user organization: ' + (userError?.message || 'User not found'));
  }

  if (!userData.team_id) {
    throw new Error('User does not belong to any organization');
  }

  // Validate tenant access if requestedTeamId is provided
  if (requestedTeamId && requestedTeamId !== userData.team_id) {
    console.error(`Tenant isolation violation: User ${user.id} (team: ${userData.team_id}) attempted to access team: ${requestedTeamId}`);
    throw new Error('Access denied: Cannot access data from other organizations');
  }

  return {
    userId: user.id,
    teamId: userData.team_id,
    userEmail: userData.email || user.email || '',
    userRole: userData.role,
  };
}

/**
 * Validates that the authenticated user belongs to the specified team
 * 
 * @param req - The incoming request with Authorization header
 * @param teamId - The team_id to validate access for
 * @returns TenantContext if validation passes
 * @throws Error if validation fails
 */
export async function validateTenantAccess(
  req: Request,
  teamId: string
): Promise<TenantContext> {
  return getTenantContext(req, teamId);
}
