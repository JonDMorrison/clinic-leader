# Interventions Operating Model

## Overview

Interventions are a core component of the EOS execution system in ClinicLeader. They track strategic initiatives that your team implements to improve performance metrics.

## EOS Workflow Integration

Interventions sit at the center of the closed-loop EOS execution workflow:

```
Scorecard → Issues → Interventions → Outcomes → Learning
```

### How It Works

1. **Scorecard**: Metrics show performance data
2. **Issues**: Off-track metrics trigger issue creation
3. **Interventions**: Issues lead to planned interventions
4. **Outcomes**: Intervention results are measured
5. **Learning**: Success/failure informs future decisions

## User Mental Model

### What Are Interventions?

Interventions are **intentional changes** your team makes to improve performance. When a metric shows something is off track, an intervention captures the solution you decided to try.

### Key Principles

1. **Interventions are experiments** - Success and failure both create learning
2. **Name after the change, not the problem** - "Referral Reactivation Campaign" not "Fix low referrals"
3. **Link to metrics** - Always connect interventions to the metrics they're meant to move
4. **Measure outcomes** - Track whether the intervention actually worked

## Navigation Placement

Interventions appear as a **primary navigation item** between Issues and Meetings:

- **Scorecard** - Track performance metrics
- **Issues** - Identify problems requiring action  
- **Interventions** - Track solutions and measure impact
- **Meetings** - Weekly L10 execution rhythm

### Entry Points

Users can create interventions from multiple places:

1. **Issues → Create Intervention** (primary flow)
2. **Interventions page → New Intervention**
3. **Metric Detail → Start New Intervention**

## Creation Best Practices

### Good Intervention Names

✓ "Quarterly Referrer Appreciation Events"
✓ "Front Desk Call-Back Within 2 Hours SLA"
✓ "Patient Waitlist Text Automation"

### Poor Intervention Names

✗ "Fix low referrals"
✗ "Address scheduling problems"
✗ "Improve patient experience"

### Required Fields

- **Title** (min 4 characters)
- **Type** (operational, staffing, process, technology, other)
- **Status** (planned, active, completed, abandoned)
- **Confidence Level** (1-5 scale)
- **Expected Time Horizon** (7-365 days)

### Optional Fields

- Description
- Owner
- Start Date
- Tags

## Meeting Integration

Interventions automatically surface in **Meeting Prep Insights** for leadership:

- **Overdue Interventions** - Past expected completion date
- **At-Risk Interventions** - Approaching deadline without measurable progress
- **Newly Successful Interventions** - Celebrate wins!

## Permissions

- **Managers+** can create and edit interventions
- **All users** can view interventions
- RLS policies enforce organization-level isolation

## Related Features

- **Intervention-Metric Links** - Connect interventions to scorecard metrics
- **Intervention Outcomes** - Track measured results
- **Intervention Timeline** - Chronological event log
- **Issue Origin Tracking** - Link back to source issues
