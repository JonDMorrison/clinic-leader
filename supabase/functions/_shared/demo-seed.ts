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
  await seedMetrics(supabase, teamId, directorOps?.id, billingLead?.id);

  // 2. Seed Rocks
  await seedRocks(supabase, teamId, directorOps?.id, billingLead?.id, owner?.id);

  // 3. Seed Issues
  await seedIssues(supabase, teamId);

  // 4. Seed Docs/SOPs
  await seedDocs(supabase, teamId);

  // 5. Seed Recalls
  await seedRecalls(supabase, teamId);

  // 6. Seed Jane staging data (9 months of appointments, payments, invoices, shifts)
  await seedJaneStagingData(supabase, teamId);

  console.log('Demo data seed completed');
}

async function seedMetrics(supabase: SupabaseClient, organizationId: string, directorId?: string, billingId?: string) {
  // These are org-level metrics that may NOT come from Jane staging data
  // Jane-synced metrics will be auto-created by runKPIRollupForDemoOrg
  const metrics = [
    // Non-Jane metrics (manual entry)
    { name: 'Days to Next Available', unit: 'count', direction: 'down', target: 3, category: 'Access', owner: directorId, organization_id: organizationId, is_active: true },
    { name: 'Provider Utilization', unit: 'percentage', direction: 'up', target: 85, category: 'Access', owner: directorId, organization_id: organizationId, is_active: true },
    { name: 'AR 90+ Days', unit: 'dollars', direction: 'down', target: 5000, category: 'Financial', owner: billingId, organization_id: organizationId, is_active: true },
  ];

  let successCount = 0;
  
  for (const metric of metrics) {
    const { error } = await supabase.from('metrics').insert(metric);
    if (error) {
      console.error(`[seedMetrics] Failed to insert metric "${metric.name}":`, error.message);
    } else {
      successCount++;
    }
  }

  console.log(`Seeded ${successCount}/${metrics.length} manual metrics (Jane metrics created via rollup)`);
}

// Note: seedMetricResults removed - metric_results are now computed from staging data
// via runKPIRollupForDemoOrg() which uses the same logic as production

async function seedRocks(supabase: SupabaseClient, organizationId: string, directorId?: string, billingId?: string, ownerId?: string) {
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
      organization_id: organizationId,
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
      organization_id: organizationId,
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
      organization_id: organizationId,
      due_date: endOfQuarter.toISOString().split('T')[0],
      confidence: 70,
      note: 'Optimize provider schedules to reduce time-to-next-available',
    },
  ];

  let successCount = 0;
  for (const rock of rocks) {
    const { error } = await supabase.from('rocks').insert(rock);
    if (error) {
      console.error(`[seedRocks] Failed to insert rock "${rock.title}":`, error.message);
    } else {
      successCount++;
    }
  }

  console.log(`Seeded ${successCount}/${rocks.length} rocks`);
}

async function seedIssues(supabase: SupabaseClient, organizationId: string) {
  const issues = [
    {
      title: 'No-show spike on Mondays (trend?)',
      priority: 2,
      status: 'open',
      organization_id: organizationId,
      context: 'Monday no-shows are 3x higher than other weekdays. Need to investigate root cause.',
    },
    {
      title: 'AR 90+ creeping above target',
      priority: 1,
      status: 'open',
      organization_id: organizationId,
      context: 'Aging receivables over 90 days have increased 15% this month. Review collection processes.',
    },
    {
      title: 'Time-to-next-available > 5 days for PT',
      priority: 2,
      status: 'open',
      organization_id: organizationId,
      context: 'Physical therapy department showing longer wait times. May need additional capacity.',
    },
  ];

  let successCount = 0;
  for (const issue of issues) {
    const { error } = await supabase.from('issues').insert(issue);
    if (error) {
      console.error(`[seedIssues] Failed to insert issue "${issue.title}":`, error.message);
    } else {
      successCount++;
    }
  }

  console.log(`Seeded ${successCount}/${issues.length} issues`);
}

async function seedDocs(supabase: SupabaseClient, organizationId: string) {
  const docs = [
    {
      title: 'Employee Manual',
      kind: 'Handbook',
      status: 'approved',
      requires_ack: true,
      organization_id: organizationId,
      body: `# Employee Manual

## Welcome to Clinic Leader Demo Practice

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
      kind: 'SOP',
      status: 'approved',
      requires_ack: true,
      organization_id: organizationId,
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

  let successCount = 0;
  for (const doc of docs) {
    const { error } = await supabase.from('docs').insert(doc);
    if (error) {
      console.error(`[seedDocs] Failed to insert doc "${doc.title}":`, error.message);
    } else {
      successCount++;
    }
  }

  console.log(`Seeded ${successCount}/${docs.length} docs`);
}

async function seedRecalls(supabase: SupabaseClient, organizationId: string) {
  const today = new Date();
  const recalls = [];

  // Generate 10 demo recalls with PHI-safe hashed IDs
  for (let i = 0; i < 10; i++) {
    const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + daysOffset);

    const statuses = ['Open', 'Open', 'Open', 'Completed', 'Deferred'];
    const kinds = ['Appointment', 'Staff Follow Up'];

    recalls.push({
      organization_id: organizationId,
      patient_hash: `DEMO${String(i).padStart(4, '0')}`, // PHI-safe identifier
      kind: kinds[Math.floor(Math.random() * kinds.length)],
      due_date: dueDate.toISOString().split('T')[0],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      notes: daysOffset < 0 ? 'Past due - needs immediate follow-up' : 'Scheduled',
    });
  }

  let successCount = 0;
  for (const recall of recalls) {
    const { error } = await supabase.from('recalls').insert(recall);
    if (error) {
      console.error(`[seedRecalls] Failed to insert recall "${recall.patient_hash}":`, error.message);
    } else {
      successCount++;
    }
  }

  console.log(`Seeded ${successCount}/${recalls.length} recalls`);
}

/**
 * Seeds 9 months of Jane staging data for realistic KPI rollups
 * - Appointments with growth trend, cancellations, no-shows
 * - Payments aligned with visit volume
 * - Invoices by provider
 * - Shifts for capacity metrics
 */
async function seedJaneStagingData(supabase: SupabaseClient, teamId: string) {
  console.log('Seeding Jane staging data for team:', teamId);
  
  const ACCOUNT_GUID = 'demo_clinic_001';
  const CLINIC_GUID = 'clinic_main_001';
  const LOCATION_GUID = 'loc_main_001';
  
  // Providers with different utilization patterns
  const providers = [
    { guid: 'staff_001', name: 'Dr. Sarah Chen', discipline: 'Physical Therapy', avgVisits: 8, priceRange: [120, 180] },
    { guid: 'staff_002', name: 'Dr. Mike Rodriguez', discipline: 'Physical Therapy', avgVisits: 7, priceRange: [120, 180] },
    { guid: 'staff_003', name: 'Dr. Emily Watson', discipline: 'Chiropractic', avgVisits: 10, priceRange: [80, 120] },
    { guid: 'staff_004', name: 'Dr. James Park', discipline: 'Massage Therapy', avgVisits: 9, priceRange: [90, 130] },
    { guid: 'staff_005', name: 'Lisa Thompson, RMT', discipline: 'Massage Therapy', avgVisits: 8, priceRange: [85, 110] },
  ];
  
  const paymentMethods = ['credit_card', 'credit_card', 'credit_card', 'debit', 'insurance', 'insurance', 'cash'];
  const purchasableTypes = ['Treatment', 'Treatment', 'Treatment', 'Product', 'Package'];
  const incomeCategories = ['Treatment Revenue', 'Treatment Revenue', 'Product Sales', 'Package Sales'];
  
  // Generate 9 months of data with growth trend
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(now.getMonth() - 9);
  
  const appointments: any[] = [];
  const payments: any[] = [];
  const invoices: any[] = [];
  const shifts: any[] = [];
  const patients: any[] = [];
  
  // Pre-generate patient pool (anonymized)
  const patientPool: string[] = [];
  for (let i = 0; i < 200; i++) {
    patientPool.push(`patient_${String(i).padStart(5, '0')}`);
  }
  
  // Generate seed patients
  const referralSources = ['Google', 'Google', 'Referral - Patient', 'Referral - Patient', 'Referral - Physician', 
                           'Insurance Directory', 'Walk-in', 'Social Media', 'Website'];
  for (let i = 0; i < 200; i++) {
    patients.push({
      organization_id: teamId,
      account_guid: ACCOUNT_GUID,
      file_date: now.toISOString().split('T')[0],
      patient_guid: patientPool[i],
      clinic_guid: CLINIC_GUID,
      referral_source: referralSources[Math.floor(Math.random() * referralSources.length)],
    });
  }
  
  // Iterate through each week for 9 months
  const currentDate = new Date(startDate);
  let weekIndex = 0;
  const totalWeeks = 39; // ~9 months
  
  while (currentDate < now) {
    const weekStart = new Date(currentDate);
    const fileDate = weekStart.toISOString().split('T')[0];
    
    // Growth factor: starts at 0.7, grows to 1.1 over 9 months (healthy growth)
    const growthFactor = 0.7 + (weekIndex / totalWeeks) * 0.4;
    
    // Seasonal adjustment (slightly lower in summer months 6-8)
    const month = currentDate.getMonth();
    const seasonalFactor = (month >= 5 && month <= 7) ? 0.9 : 1.0;
    
    // Generate shifts and appointments for each day of the week (Mon-Fri)
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayOffset);
      
      if (dayDate >= now) break;
      
      const dayOfWeek = dayDate.getDay();
      const isMonday = dayOfWeek === 1;
      
      for (const provider of providers) {
        // Generate shift for provider
        const shiftStart = new Date(dayDate);
        shiftStart.setHours(9, 0, 0, 0);
        const shiftEnd = new Date(dayDate);
        shiftEnd.setHours(17, 0, 0, 0);
        
        shifts.push({
          organization_id: teamId,
          account_guid: ACCOUNT_GUID,
          file_date: fileDate,
          shift_guid: `shift_${provider.guid}_${dayDate.toISOString().split('T')[0]}`,
          staff_member_guid: provider.guid,
          staff_member_name: provider.name,
          start_at: shiftStart.toISOString(),
          end_at: shiftEnd.toISOString(),
          clinic_guid: CLINIC_GUID,
          location_guid: LOCATION_GUID,
          book_online: true,
          call_to_book: false,
        });
        
        // Calculate visits for this provider on this day
        const baseVisits = provider.avgVisits * growthFactor * seasonalFactor;
        const dailyVariance = 0.8 + Math.random() * 0.4; // 80-120% variance
        const targetVisits = Math.round(baseVisits * dailyVariance);
        
        for (let v = 0; v < targetVisits; v++) {
          const patientGuid = patientPool[Math.floor(Math.random() * patientPool.length)];
          const isNewPatient = Math.random() < 0.08; // 8% new patient rate
          
          // Appointment timing
          const apptHour = 9 + Math.floor(v / 2);
          const apptMinutes = (v % 2) * 30;
          const startAt = new Date(dayDate);
          startAt.setHours(apptHour, apptMinutes, 0, 0);
          const endAt = new Date(startAt);
          endAt.setMinutes(endAt.getMinutes() + 30);
          
          // Cancellation/no-show logic
          // Monday no-shows are higher (spike mentioned in issues)
          const noShowRate = isMonday ? 0.08 : 0.03;
          const cancelRate = 0.06;
          
          const isCancelled = Math.random() < cancelRate;
          const isNoShow = !isCancelled && Math.random() < noShowRate;
          const isArrived = !isCancelled && !isNoShow;
          
          const price = provider.priceRange[0] + 
            Math.floor(Math.random() * (provider.priceRange[1] - provider.priceRange[0]));
          
          const appointmentGuid = `appt_${provider.guid}_${startAt.getTime()}`;
          
          appointments.push({
            organization_id: teamId,
            account_guid: ACCOUNT_GUID,
            file_date: fileDate,
            appointment_guid: appointmentGuid,
            patient_guid: patientGuid,
            staff_member_guid: provider.guid,
            staff_member_name: provider.name,
            discipline_name: provider.discipline,
            treatment_name: `${provider.discipline} Session`,
            treatment_guid: `treatment_${provider.discipline.toLowerCase().replace(' ', '_')}`,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            booked_at: new Date(startAt.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            arrived_at: isArrived ? startAt.toISOString() : null,
            cancelled_at: isCancelled ? new Date(startAt.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : null,
            no_show_at: isNoShow ? startAt.toISOString() : null,
            first_visit: isNewPatient,
            price: price,
            clinic_guid: CLINIC_GUID,
            location_name: 'Main Clinic',
          });
          
          // Generate invoice and payment for arrived appointments
          if (isArrived) {
            const invoiceGuid = `inv_${appointmentGuid}`;
            const purchasableType = purchasableTypes[Math.floor(Math.random() * purchasableTypes.length)];
            const incomeCategory = purchasableType === 'Treatment' 
              ? 'Treatment Revenue' 
              : incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
            
            // Some invoices have partial payment (AR simulation)
            const collectionRate = 0.92 + Math.random() * 0.08; // 92-100% collection
            const amountPaid = Math.round(price * collectionRate * 100) / 100;
            
            invoices.push({
              organization_id: teamId,
              account_guid: ACCOUNT_GUID,
              file_date: fileDate,
              invoice_guid: invoiceGuid,
              patient_guid: patientGuid,
              staff_member_guid: provider.guid,
              staff_member_name: provider.name,
              invoiced_at: startAt.toISOString(),
              subtotal: price,
              amount_paid: amountPaid,
              purchasable_type: purchasableType,
              income_category: incomeCategory,
              income_category_id: incomeCategory.toLowerCase().replace(' ', '_'),
              payer_type: Math.random() < 0.4 ? 'Insurance' : 'Patient',
              clinic_guid: CLINIC_GUID,
              location_guid: LOCATION_GUID,
            });
            
            // Payment (may be same day or delayed)
            const paymentDelay = Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 30);
            const paymentDate = new Date(startAt);
            paymentDate.setDate(paymentDate.getDate() + paymentDelay);
            
            if (paymentDate < now) {
              payments.push({
                organization_id: teamId,
                account_guid: ACCOUNT_GUID,
                file_date: fileDate,
                payment_guid: `pay_${invoiceGuid}`,
                patient_account_guid: patientGuid,
                received_at: paymentDate.toISOString(),
                amount: amountPaid,
                payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                payment_type: 'payment',
                payer_type: Math.random() < 0.4 ? 'Insurance' : 'Patient',
                clinic_guid: CLINIC_GUID,
                location_guid: LOCATION_GUID,
                workflow: 'standard',
              });
            }
          }
        }
      }
    }
    
    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
    weekIndex++;
  }
  
  console.log(`Generated: ${appointments.length} appointments, ${invoices.length} invoices, ${payments.length} payments, ${shifts.length} shifts, ${patients.length} patients`);
  
  // Batch insert in chunks to avoid timeouts
  const BATCH_SIZE = 500;
  
  // Insert patients
  for (let i = 0; i < patients.length; i += BATCH_SIZE) {
    const batch = patients.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('staging_patients_jane').insert(batch);
    if (error) console.error('Error inserting patients batch:', error.message);
  }
  console.log('Inserted patients');
  
  // Insert shifts
  for (let i = 0; i < shifts.length; i += BATCH_SIZE) {
    const batch = shifts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('staging_shifts_jane').insert(batch);
    if (error) console.error('Error inserting shifts batch:', error.message);
  }
  console.log('Inserted shifts');
  
  // Insert appointments
  for (let i = 0; i < appointments.length; i += BATCH_SIZE) {
    const batch = appointments.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('staging_appointments_jane').insert(batch);
    if (error) console.error('Error inserting appointments batch:', error.message);
  }
  console.log('Inserted appointments');
  
  // Insert invoices
  for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
    const batch = invoices.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('staging_invoices_jane').insert(batch);
    if (error) console.error('Error inserting invoices batch:', error.message);
  }
  console.log('Inserted invoices');
  
  // Insert payments
  for (let i = 0; i < payments.length; i += BATCH_SIZE) {
    const batch = payments.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('staging_payments_jane').insert(batch);
    if (error) console.error('Error inserting payments batch:', error.message);
  }
  console.log('Inserted payments');
  
  // Run KPI rollup for both weekly and monthly periods (last 6 months)
  // This uses the SAME logic as production to compute metric_results from staging data
  await runKPIRollupForDemoOrg(supabase, teamId);
  
  console.log('Jane staging data seed completed');
}

/**
 * Runs the KPI rollup logic for demo org to compute metric_results from staging data.
 * This mirrors the production jane-kpi-rollup edge function logic.
 * 
 * IMPORTANT: This is the ONLY place metric_results are computed for demo orgs.
 * No random values, no hardcoded numbers - all derived from staging data.
 * Uses 'jane_pipe' source to match production rollup exactly.
 */
async function runKPIRollupForDemoOrg(supabase: SupabaseClient, organizationId: string) {
  console.log('[demo-seed] Running KPI rollup for demo org...');
  
  const now = new Date();
  
  // Generate periods to rollup: last 9 months (monthly) + current week + last 12 weeks (weekly)
  const periods: { type: 'weekly' | 'monthly'; start: Date; key: string }[] = [];
  
  // Monthly periods (last 9 months to match staging data range)
  for (let monthOffset = 8; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    periods.push({ type: 'monthly', start: monthDate, key: monthKey });
  }
  
  // Weekly periods: ALWAYS include current week + last 12 weeks
  // This ensures fresh data is always available regardless of when provisioning occurred
  for (let weekOffset = 12; weekOffset >= 0; weekOffset--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (weekOffset * 7));
    // Align to Monday
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().slice(0, 10);
    periods.push({ type: 'weekly', start: weekStart, key: weekKey });
  }
  
  console.log(`[demo-seed] Processing ${periods.length} periods (9 monthly + 13 weekly including current week)`);
  
  // First, normalize metrics for demo org (idempotent: matches by import_key OR name)
  await normalizeJaneMetrics(supabase, organizationId);
  
  // Get all metrics for this org to map import_key -> metric_id
  const { data: metrics } = await supabase
    .from('metrics')
    .select('id, name, import_key')
    .eq('organization_id', organizationId);
  
  const metricMap = new Map<string, { id: string; name: string }>();
  (metrics || []).forEach(m => {
    if (m.import_key) {
      metricMap.set(m.import_key, { id: m.id, name: m.name });
    }
  });
  
  const results: any[] = [];
  
  for (const period of periods) {
    const periodStart = period.start;
    let periodEnd: Date;
    
    if (period.type === 'monthly') {
      periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
    } else {
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
    }
    
    const periodStartStr = periodStart.toISOString().slice(0, 10);
    const periodEndStr = periodEnd.toISOString().slice(0, 10);
    
    // Query appointments for this period
    const { data: appointments } = await supabase
      .from('staging_appointments_jane')
      .select('id, staff_member_guid, staff_member_name, cancelled_at, no_show_at, arrived_at, first_visit')
      .eq('organization_id', organizationId)
      .gte('start_at', periodStartStr)
      .lte('start_at', periodEndStr + 'T23:59:59');
    
    const appts = appointments || [];
    const nonCancelled = appts.filter(a => !a.cancelled_at);
    const cancelled = appts.filter(a => a.cancelled_at);
    const noShows = appts.filter(a => a.no_show_at);
    const newPatients = nonCancelled.filter(a => a.first_visit);
    const arrivedCount = nonCancelled.filter(a => a.arrived_at).length;
    const totalBooked = appts.length;
    
    // Query payments for this period
    const { data: paymentsData } = await supabase
      .from('staging_payments_jane')
      .select('amount')
      .eq('organization_id', organizationId)
      .gte('received_at', periodStartStr)
      .lte('received_at', periodEndStr + 'T23:59:59');
    
    const totalCollected = (paymentsData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    // Query invoices for this period
    const { data: invoicesData } = await supabase
      .from('staging_invoices_jane')
      .select('subtotal')
      .eq('organization_id', organizationId)
      .gte('invoiced_at', periodStartStr)
      .lte('invoiced_at', periodEndStr + 'T23:59:59');
    
    const totalInvoiced = (invoicesData || []).reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0);
    
    // Calculate KPIs - keys must match JANE_METRICS in UI
    const rollups = [
      { import_key: 'jane_total_visits', value: nonCancelled.length },
      { import_key: 'jane_new_patient_visits', value: newPatients.length },
      { import_key: 'jane_new_patients', value: newPatients.length },
      { import_key: 'jane_no_shows', value: noShows.length },
      { import_key: 'jane_show_rate', value: totalBooked > 0 ? Math.round((arrivedCount / totalBooked) * 10000) / 100 : 0 },
      { import_key: 'jane_cancellation_rate', value: totalBooked > 0 ? Math.round((cancelled.length / totalBooked) * 10000) / 100 : 0 },
      { import_key: 'jane_total_collected', value: Math.round(totalCollected * 100) / 100 },
      { import_key: 'jane_total_invoiced', value: Math.round(totalInvoiced * 100) / 100 },
    ];
    
    for (const rollup of rollups) {
      const metric = metricMap.get(rollup.import_key);
      if (metric) {
        results.push({
          metric_id: metric.id,
          week_start: periodStartStr,
          period_start: periodStartStr,
          period_type: period.type,
          period_key: period.key,
          value: rollup.value,
          source: 'jane_pipe', // Match production rollup source exactly
          raw_row: { rollup_type: rollup.import_key, computed_at: new Date().toISOString() },
        });
      }
    }
  }
  
  // Batch upsert results (idempotent via onConflict)
  // Uses metric_id,period_type,period_start which has unique index: idx_metric_results_period_unique
  const BATCH_SIZE = 100;
  let successCount = 0;
  
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('metric_results')
      .upsert(batch, { onConflict: 'metric_id,period_type,period_start' });
    
    if (error) {
      console.error('[demo-seed] Error upserting metric_results batch:', error.message);
    } else {
      successCount += batch.length;
    }
  }
  
  console.log(`[demo-seed] Rollup complete: ${successCount}/${results.length} metric_results upserted`);
}

/**
 * Normalizes Jane metrics for demo orgs - idempotent.
 * - Matches existing metrics by import_key OR case-insensitive name
 * - If name match exists and import_key is null, UPDATE to set correct import_key
 * - Ensures sync_source = 'jane' and is_active = true
 * - Does NOT create duplicates
 */
async function normalizeJaneMetrics(supabase: SupabaseClient, organizationId: string) {
  console.log('[demo-seed] Normalizing Jane metrics...');
  
  // Standard Jane metrics that must exist for demo orgs
  // Names MUST match JANE_METRICS in DataMetricsTable.tsx
  const standardMetrics = [
    { import_key: 'jane_total_visits', name: 'Total Visits', unit: 'count', direction: 'up', category: 'Appointments', target: 200 },
    { import_key: 'jane_new_patient_visits', name: 'New Patient Visits', unit: 'count', direction: 'up', category: 'Appointments', target: 30 },
    { import_key: 'jane_new_patients', name: 'New Patients', unit: 'count', direction: 'up', category: 'Patients', target: 25 },
    { import_key: 'jane_no_shows', name: 'No Shows', unit: 'count', direction: 'down', category: 'Appointments', target: 5 },
    { import_key: 'jane_show_rate', name: 'Show Rate %', unit: 'percentage', direction: 'up', category: 'Appointments', target: 95 },
    { import_key: 'jane_cancellation_rate', name: 'Cancellation Rate %', unit: 'percentage', direction: 'down', category: 'Appointments', target: 5 },
    { import_key: 'jane_total_collected', name: 'Total Collected Revenue', unit: 'dollars', direction: 'up', category: 'Payments', target: 50000 },
    { import_key: 'jane_total_invoiced', name: 'Total Invoiced', unit: 'dollars', direction: 'up', category: 'Invoices', target: 55000 },
  ];
  
  // Get all existing metrics for this org
  const { data: existingMetrics } = await supabase
    .from('metrics')
    .select('id, name, import_key')
    .eq('organization_id', organizationId);
  
  const existingByKey = new Map<string, { id: string; name: string }>();
  const existingByName = new Map<string, { id: string; import_key: string | null }>();
  
  (existingMetrics || []).forEach(m => {
    if (m.import_key) {
      existingByKey.set(m.import_key, { id: m.id, name: m.name });
    }
    // Normalize name for matching: lowercase, remove non-alphanumeric
    const normalizedName = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    existingByName.set(normalizedName, { id: m.id, import_key: m.import_key });
  });
  
  let updatedCount = 0;
  let createdCount = 0;
  
  for (const metricDef of standardMetrics) {
    // Check 1: Already exists with correct import_key?
    if (existingByKey.has(metricDef.import_key)) {
      // Just ensure it's active and synced
      await supabase
        .from('metrics')
        .update({ sync_source: 'jane', is_active: true })
        .eq('id', existingByKey.get(metricDef.import_key)!.id);
      continue;
    }
    
    // Check 2: Exists by name but missing import_key?
    const normalizedName = metricDef.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existingMatch = existingByName.get(normalizedName);
    
    if (existingMatch && !existingMatch.import_key) {
      // Update to set import_key
      await supabase
        .from('metrics')
        .update({ 
          import_key: metricDef.import_key,
          sync_source: 'jane',
          is_active: true,
          category: metricDef.category,
        })
        .eq('id', existingMatch.id);
      updatedCount++;
      continue;
    }
    
    if (existingMatch) {
      // Exists with different import_key - don't create duplicate
      continue;
    }
    
    // Check 3: Create new metric
    const { error } = await supabase
      .from('metrics')
      .insert({
        organization_id: organizationId,
        name: metricDef.name,
        import_key: metricDef.import_key,
        unit: metricDef.unit,
        direction: metricDef.direction,
        category: metricDef.category,
        target: metricDef.target,
        sync_source: 'jane',
        is_active: true,
      });
    
    if (error) {
      console.error(`[demo-seed] Failed to create metric ${metricDef.name}:`, error.message);
    } else {
      createdCount++;
    }
  }
  
  console.log(`[demo-seed] Metrics normalized: ${updatedCount} updated, ${createdCount} created`);
}
