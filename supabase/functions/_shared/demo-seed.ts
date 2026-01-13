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
  // direction: 'up' = higher is better, 'down' = lower is better
  // unit: 'count', 'dollars', 'percentage'
  const metrics = [
    // Production
    { name: 'Total Visits', unit: 'count', direction: 'up', target: 250, category: 'Production', owner: directorId, organization_id: organizationId, is_active: true },
    { name: 'New Patients', unit: 'count', direction: 'up', target: 30, category: 'Production', owner: directorId, organization_id: organizationId, is_active: true },
    { name: 'No-Show Rate', unit: 'percentage', direction: 'down', target: 5, category: 'Production', owner: directorId, organization_id: organizationId, is_active: true },
    
    // Financial
    { name: 'Collected Revenue', unit: 'dollars', direction: 'up', target: 75000, category: 'Financial', owner: billingId, organization_id: organizationId, is_active: true },
    { name: 'Collection Rate', unit: 'percentage', direction: 'up', target: 95, category: 'Financial', owner: billingId, organization_id: organizationId, is_active: true },
    { name: 'AR 90+ Days', unit: 'dollars', direction: 'down', target: 5000, category: 'Financial', owner: billingId, organization_id: organizationId, is_active: true },
    
    // Access
    { name: 'Days to Next Available', unit: 'count', direction: 'down', target: 3, category: 'Access', owner: directorId, organization_id: organizationId, is_active: true },
    { name: 'Provider Utilization', unit: 'percentage', direction: 'up', target: 85, category: 'Access', owner: directorId, organization_id: organizationId, is_active: true },
  ];

  let successCount = 0;
  const insertedMetrics: string[] = [];
  
  for (const metric of metrics) {
    const { data, error } = await supabase.from('metrics').insert(metric).select('id').single();
    if (error) {
      console.error(`[seedMetrics] Failed to insert metric "${metric.name}":`, error.message);
    } else {
      successCount++;
      insertedMetrics.push(data.id);
    }
  }

  console.log(`Seeded ${successCount}/${metrics.length} metrics`);
  
  // Seed metric_results for the last 12 weeks
  if (insertedMetrics.length > 0) {
    await seedMetricResults(supabase, insertedMetrics, metrics);
  }
}

async function seedMetricResults(supabase: SupabaseClient, metricIds: string[], metrics: any[]) {
  const today = new Date();
  const results = [];
  
  for (let i = 0; i < metricIds.length; i++) {
    const metric = metrics[i];
    const metricId = metricIds[i];
    const target = metric.target;
    
    // Generate 12 weeks of WEEKLY data with slight variance and growth trend
    for (let week = 11; week >= 0; week--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (week * 7));
      // Align to Monday
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      
      // Generate value with variance and slight improvement trend
      const growthFactor = 1 + ((11 - week) * 0.01); // 1% improvement per week
      const variance = 0.9 + (Math.random() * 0.2); // ±10% variance
      let value: number;
      
      if (metric.direction === 'up') {
        // For "up" metrics, trend toward hitting target
        value = target * growthFactor * variance * 0.95;
      } else {
        // For "down" metrics, trend toward being under target
        value = target * (1 / growthFactor) * variance * 1.1;
      }
      
      // Round appropriately
      value = metric.unit === 'percentage' 
        ? Math.round(value * 10) / 10 
        : Math.round(value);
      
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const periodKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + 6) / 7)).padStart(2, '0')}`;
      results.push({
        metric_id: metricId,
        week_start: weekStartStr,
        period_start: weekStartStr,
        period_type: 'weekly',
        period_key: periodKey,
        value,
      });
    }
    
    // Generate 6 months of MONTHLY data for This Month and YTD columns
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const periodStart = monthDate.toISOString().split('T')[0];
      
      // Monthly values are roughly 4x weekly (4 weeks per month)
      const growthFactor = 1 + ((5 - monthOffset) * 0.02);
      const variance = 0.9 + (Math.random() * 0.2);
      let value: number;
      
      if (metric.direction === 'up') {
        value = target * 4 * growthFactor * variance * 0.95;
      } else {
        value = target * 4 * (1 / growthFactor) * variance * 1.1;
      }
      
      value = metric.unit === 'percentage' 
        ? Math.round(value * 10) / 10 
        : Math.round(value);
      
      results.push({
        metric_id: metricId,
        week_start: periodStart,
        period_start: periodStart,
        period_type: 'monthly',
        period_key: monthKey,
        value,
      });
    }
  }
  
  // Insert in batches
  const batchSize = 50;
  let successCount = 0;
  
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const { error } = await supabase.from('metric_results').insert(batch);
    if (error) {
      console.error(`[seedMetricResults] Batch insert failed:`, error.message);
    } else {
      successCount += batch.length;
    }
  }
  
  console.log(`Seeded ${successCount}/${results.length} metric results (weekly + monthly)`);
}

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
  
  console.log('Jane staging data seed completed');
}
