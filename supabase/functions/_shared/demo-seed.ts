import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function seedDemoData(supabase: SupabaseClient, teamId: string) {
  console.log('Starting demo data seed for team:', teamId);

  // Get demo users for assignments
  const { data: users } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('team_id', teamId);

  const directorOps = users?.find(u => u.role === 'director');
  const billingLead = users?.find(u => u.role === 'billing');
  const owner = users?.find(u => u.role === 'owner');

  // 1. Seed KPIs
  await seedKPIs(supabase, teamId, directorOps?.id, billingLead?.id);

  // 2. Seed Rocks
  await seedRocks(supabase, directorOps?.id, billingLead?.id, owner?.id);

  // 3. Seed Issues
  await seedIssues(supabase, teamId);

  // 4. Seed Docs/SOPs
  await seedDocs(supabase);

  // 5. Seed Recalls
  await seedRecalls(supabase, teamId);

  console.log('Demo data seed completed');
}

async function seedKPIs(supabase: SupabaseClient, teamId: string, directorId?: string, billingId?: string) {
  const kpis = [
    // Production
    { name: 'Total Visits', unit: 'count', direction: 'up', target: 250, category: 'Production', owner_id: directorId },
    { name: 'New Patients', unit: 'count', direction: 'up', target: 30, category: 'Production', owner_id: directorId },
    { name: 'No-Show %', unit: 'percentage', direction: 'down', target: 5, category: 'Production', owner_id: directorId },
    
    // Financial
    { name: 'Collected Revenue', unit: 'currency', direction: 'up', target: 75000, category: 'Financial', owner_id: billingId },
    { name: 'Collection Rate %', unit: 'percentage', direction: 'up', target: 95, category: 'Financial', owner_id: billingId },
    { name: 'AR 90+ Days', unit: 'currency', direction: 'down', target: 5000, category: 'Financial', owner_id: billingId },
    
    // Access
    { name: 'Time to Next Available (days)', unit: 'count', direction: 'down', target: 3, category: 'Access', owner_id: directorId },
    { name: 'Provider Utilization %', unit: 'percentage', direction: 'up', target: 85, category: 'Access', owner_id: directorId },
  ];

  for (const kpi of kpis) {
    await supabase.from('kpis').insert(kpi);
  }

  console.log('Seeded', kpis.length, 'KPIs');
}

async function seedRocks(supabase: SupabaseClient, directorId?: string, billingId?: string, ownerId?: string) {
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`;
  const endOfQuarter = new Date();
  endOfQuarter.setMonth(Math.floor(new Date().getMonth() / 3) * 3 + 3, 0);

  const rocks = [
    {
      title: 'Recall system: daily zero past-due',
      level: 'company',
      quarter: currentQuarter,
      status: 'on_track',
      owner_id: directorId,
      due_date: endOfQuarter.toISOString().split('T')[0],
      confidence: 80,
      note: 'Implement automated recall system with daily reviews',
    },
    {
      title: 'Lift collection rate by 5 points',
      level: 'company',
      quarter: currentQuarter,
      status: 'on_track',
      owner_id: billingId,
      due_date: endOfQuarter.toISOString().split('T')[0],
      confidence: 75,
      note: 'Focus on reducing AR aging and improving upfront collections',
    },
    {
      title: 'Provider templates to open access',
      level: 'company',
      quarter: currentQuarter,
      status: 'on_track',
      owner_id: ownerId,
      due_date: endOfQuarter.toISOString().split('T')[0],
      confidence: 70,
      note: 'Optimize provider schedules to reduce time-to-next-available',
    },
  ];

  for (const rock of rocks) {
    await supabase.from('rocks').insert(rock);
  }

  console.log('Seeded', rocks.length, 'rocks');
}

async function seedIssues(supabase: SupabaseClient, teamId: string) {
  const issues = [
    {
      title: 'No-show spike on Mondays (trend?)',
      priority: 2,
      status: 'open',
      team_id: teamId,
      context: 'Monday no-shows are 3x higher than other weekdays. Need to investigate root cause.',
    },
    {
      title: 'AR 90+ creeping above target',
      priority: 1,
      status: 'open',
      team_id: teamId,
      context: 'Aging receivables over 90 days have increased 15% this month. Review collection processes.',
    },
    {
      title: 'Time-to-next-available > 5 days for PT',
      priority: 2,
      status: 'open',
      team_id: teamId,
      context: 'Physical therapy department showing longer wait times. May need additional capacity.',
    },
  ];

  for (const issue of issues) {
    await supabase.from('issues').insert(issue);
  }

  console.log('Seeded', issues.length, 'issues');
}

async function seedDocs(supabase: SupabaseClient) {
  const docs = [
    {
      title: 'Employee Manual',
      kind: 'handbook',
      status: 'published',
      requires_ack: true,
      body: `# Employee Manual

## Welcome to LeadClear Demo Clinic

This manual outlines our policies, procedures, and expectations for all team members.

### Core Values
- Patient-centered care
- Operational excellence
- Continuous improvement
- Teamwork and collaboration

### Attendance Policy
All staff are expected to arrive 15 minutes before their scheduled shift...

### Professional Standards
We maintain the highest standards of professionalism in all interactions...`,
    },
    {
      title: 'Recall Review Process',
      kind: 'sop',
      status: 'published',
      requires_ack: true,
      body: `# Recall Review Standard Operating Procedure

## Purpose
Ensure all patients receive timely follow-up care and maintain optimal health outcomes.

## Daily Process
1. Review recall list at 9:00 AM
2. Prioritize overdue recalls
3. Contact patients via phone or text
4. Document all attempts
5. Update patient records

## Escalation
Recalls overdue by >30 days must be escalated to the practice manager...`,
    },
  ];

  for (const doc of docs) {
    await supabase.from('docs').insert(doc);
  }

  console.log('Seeded', docs.length, 'docs');
}

async function seedRecalls(supabase: SupabaseClient, teamId: string) {
  const today = new Date();
  const recalls = [];

  // Generate 10 demo recalls with PHI-safe hashed IDs
  for (let i = 0; i < 10; i++) {
    const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + daysOffset);

    const statuses = ['Open', 'Open', 'Open', 'Completed', 'Deferred'];
    const kinds = ['Annual Physical', '6-Month Cleaning', 'Follow-up', 'Lab Review'];

    recalls.push({
      organization_id: teamId,
      patient_hash: `DEMO${String(i).padStart(4, '0')}`, // PHI-safe identifier
      kind: kinds[Math.floor(Math.random() * kinds.length)],
      due_date: dueDate.toISOString().split('T')[0],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      notes: daysOffset < 0 ? 'Past due - needs immediate follow-up' : 'Scheduled',
    });
  }

  for (const recall of recalls) {
    await supabase.from('recalls').insert(recall);
  }

  console.log('Seeded', recalls.length, 'recalls');
}
