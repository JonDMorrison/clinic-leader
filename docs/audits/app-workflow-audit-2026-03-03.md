# ClinicLeader App Workflow Audit
**Date:** March 3, 2026

---

## 1. Core Workflow: Login → Weekly Meeting

| Step | What Happens | Page |
|------|-------------|------|
| 1. **Login** | Email/password auth → redirected to `/dashboard` | `/auth` |
| 2. **Dashboard** | Personalized greeting, 4 customizable stat cards (New Patients, Rocks, Open Issues, KPIs), Core Values strip, Quick Actions sidebar, Copilot widget, Clinic Pulse (Jane insights), Monthly Pulse, Issue Suggestions, VTO card | `/dashboard` |
| 3. **Scorecard Review** | View all active KPIs as cards with sparklines, targets, trend arrows, status colors. Filter by category/owner/source. Click into detail drawer for 12-week charts + weekly data table. Enter/update metric values. | `/scorecard` |
| 4. **Update Numbers** | Manual entry via Scorecard Update form, or automated via Jane pipeline, or CSV/workbook import | `/scorecard/update` |
| 5. **Rock Check** | Review quarterly goals (Rocks) by status: On Track / Off Track / Done. Drag-and-drop between status lanes. Filter by quarter/owner. | `/rocks` |
| 6. **Issue Triage** | IDS Board (Identify, Discuss, Solve). Issues auto-sorted: Scorecard-sourced → Rock-sourced → Manual. Create issues from off-track metrics or manually. Link to interventions. | `/issues` |
| 7. **Meeting Prep** | Schedule meeting, review AI-generated agenda suggestions, see intervention signals for overdue/at-risk items | `/meetings` |
| 8. **Run L10 Meeting** | Timed 90-min agenda: Segue → Core Values Shoutouts → Scorecard Snapshot → Rock Review → Headlines → To-Do Review → IDS (60 min) → Conclude. Export PDF minutes. Save meeting record. | `/meetings/:id` or `/meeting` |
| 9. **Follow-Through** | To-dos assigned during meeting tracked. Issues resolved → optionally create Interventions. Interventions linked to metrics with baseline tracking. | `/issues`, `/interventions` |

---

## 2. Primary Data Source

### Is everything Jane-based?
**No.** The app supports multiple data sources by design:

| Source | How It Works | Required? |
|--------|-------------|-----------|
| **Jane EHR** | Automated pipeline via `bulk_analytics_connectors`. Delivers 8 metrics (visits, new patients, cancellations, no-shows, reschedules, online bookings, revenue, avg visit value) with clinician/discipline/location breakdowns. | Optional |
| **Manual Entry** | Per-metric value entry via Scorecard Update form or inline editing in metric detail drawer | Always available |
| **Workbook/CSV Import** | Upload monthly spreadsheet reports → AI-mapped to metrics | Optional |
| **PDF Report Upload** | Upload PDF → OCR/AI extraction → maps to metrics | Optional |
| **Legacy Workbook** | Lori's historical Excel imports bridged to `metric_results` | Legacy support |

### What is required vs optional?
- **Required:** At least one data entry method must be used (manual at minimum)
- **Required:** Each metric needs a name. Target and owner are strongly encouraged but not enforced at creation
- **Optional:** Jane connector, workbook imports, PDF imports
- **Optional:** Targets, owners, categories on metrics (but status logic degrades to NEEDS_TARGET/NEEDS_OWNER without them)

---

## 3. Core Weekly Loop

The app enforces this repeating rhythm:

```
┌─────────────────────────────────────────────┐
│                WEEKLY CYCLE                  │
│                                              │
│  1. UPDATE NUMBERS                           │
│     Manual entry / Jane auto-sync / Import   │
│                    ↓                         │
│  2. SCORECARD REVIEW                         │
│     Red/green status on each metric          │
│     Off-track metrics flagged                │
│                    ↓                         │
│  3. ISSUE CREATION                           │
│     Off-track metric → one-click Issue       │
│     Off-track Rock → one-click Issue         │
│     Manual issue creation                    │
│                    ↓                         │
│  4. RUN L10 MEETING (90 min)                 │
│     Scorecard snapshot → Rock review →       │
│     Headlines → To-Do review → IDS (60 min)  │
│                    ↓                         │
│  5. FOLLOW-THROUGH                           │
│     To-dos assigned with owners + due dates  │
│     Issues resolved → Interventions created  │
│     Interventions tracked against metrics    │
│                    ↓                         │
│  (back to 1)                                 │
└─────────────────────────────────────────────┘
```

**Monthly layer:** Monthly pulse check, rock monthly review, quarterly close reports.

**Quarterly layer:** Quarterly meetings (fixed agenda), rock archival/transition, VTO review.

**Annual layer:** Annual strategic meeting, VTO vision update.

---

## 4. What the App Actually Tracks

### Metrics (KPIs)
- Name, target, direction (up/down), unit, category, owner
- Weekly or monthly values stored in `metric_results`
- Status computed: `on_track`, `off_track`, `needs_data`, `needs_target`, `needs_owner`
- 12-week sparkline trends, week-over-week deltas
- Source tracking (`manual`, `jane_pipe`, `workbook`, etc.)
- Favorites, drag-and-drop ordering

### Targets
- Per-metric numeric targets with direction
- Status hierarchy: green (on track), red (off track), gray (needs data/target)
- Alerts panel for off-track metrics

### Rocks (Quarterly Goals)
- Title, owner, status (`on_track`, `off_track`, `done`), confidence level
- Quarter assignment, linked metrics, linked to-dos
- Drag-and-drop status lanes
- Monthly review and quarterly close workflows

### Issues
- Title, description, priority, status (`open`, `solved`)
- Source tracing: which metric or rock spawned it
- IDS workflow (Identify, Discuss, Solve)
- Meeting horizon routing (`weekly`, `quarterly`, `annual`)
- Linked to-dos for resolution tracking

### To-Dos
- Title, owner, due date, completion status
- Created from meetings or issues
- Reviewed in weekly L10

### Interventions
- Title, type (staffing, marketing, referral outreach, etc.), status lifecycle
- Linked to specific metrics with baseline values
- Expected direction + magnitude
- Outcome evaluation: actual delta vs baseline
- AI summary (advisory only)
- Time horizon tracking (default 90 days)

### Decisions
- Captured during L10 meeting close
- Stored in meeting notes

### Assignments
- Rock ownership (single owner per rock)
- Metric ownership
- To-do ownership with due dates
- Intervention ownership

### Timelines
- Rock quarterly cycles
- Intervention time horizons (default 90 days)
- To-do due dates
- Meeting schedules (weekly, quarterly, annual)

### Alerts / Signals
- Off-track metric alerts on Scorecard
- Overdue intervention signals injected into meeting prep
- At-risk intervention signals (<14 days remaining, no positive delta)
- Issue suggestions from AI based on scorecard patterns
- Quarterly rock transition banners

### Additional Objects
- **VTO (Vision/Traction Organizer):** Core values, core focus, 10-year target, 3-year picture, 1-year plan, ideal client, differentiators, proven process, promise
- **Core Values:** Org-wide values with spotlight rotation, shoutouts during meetings
- **Docs/SOPs:** Internal documents with acknowledgment tracking
- **Recalls:** Patient recall tracking (front desk workflow)
- **Reports:** Weekly/monthly AI-generated reports with executive summaries
- **People:** Team directory, roles, seats
- **Benchmarks:** EMR-based peer comparison (Jane orgs vs non-Jane)

---

## 5. What It Does NOT Do

| Category | What's Missing |
|----------|---------------|
| **Patient records** | No individual patient data, charts, or clinical records. It tracks aggregate metrics only. |
| **Billing/invoicing** | No payment processing, invoice generation, or AR management. Tracks AR as a metric only. |
| **Scheduling** | No appointment booking. Tracks visit counts as metrics. |
| **Clinical documentation** | No SOAP notes, treatment plans, or clinical workflows. |
| **Payroll/HR** | No payroll, benefits, or HR management. People page is a team directory. |
| **Marketing execution** | No email campaigns, social media, or marketing automation. Tracks marketing as an intervention type. |
| **Real-time chat/messaging** | No team messaging. Communication happens in meetings. |
| **Automated issue resolution** | All escalation is manual. The app surfaces signals but humans decide what to act on. |
| **Auto-created interventions** | Interventions are always manually created. AI suggests but never auto-creates. |
| **Financial forecasting** | Reports include basic KPI forecasts but no financial modeling or budgeting. |
| **Multi-location rollup** | No cross-location aggregate dashboards (breakdowns exist per-location within Jane data). |
| **Patient communication** | No patient-facing features (portals, messaging, reminders). |
| **Inventory management** | No supply tracking. |
| **Compliance/regulatory** | No HIPAA compliance tooling (though data handling follows HIPAA patterns). Jane data pipeline has compliance controls. |

---

## 6. Where Users Spend 80% of Their Time

Based on the app architecture and workflow design:

| Surface | % of Time | Why |
|---------|-----------|-----|
| **Scorecard** | ~30% | This is the heartbeat. Weekly number review, status checking, detail drilling, target comparisons. Every workflow starts or ends here. |
| **L10 Meeting Mode** | ~25% | The 90-minute structured meeting is the primary action surface. Scorecard snapshot, rock review, IDS—all happen here. |
| **Dashboard** | ~20% | First thing seen on login. Quick health check, stat cards, issue suggestions, clinic pulse. Orientation point. |
| **Issues (IDS Board)** | ~15% | Creating, prioritizing, and resolving issues. This is where decisions get made between meetings. |
| **Rocks** | ~10% | Quarterly check-ins, status updates, monthly reviews. Less frequent than weekly surfaces. |

**Everything else** (VTO, Interventions, Data, Reports, People, Docs, Recalls, Settings) collectively represents <10% of active time. They're referenced periodically but not daily drivers.

---

## 7. What Makes It Different

**"This sounds like another dashboard."**

It's not a dashboard. It's an **operating system for running a clinic as a leadership team.**

### The real rebuttal:

1. **Dashboards show data. This drives decisions.**
   Every metric has a forcing function: if it's red, the app prompts you to create an Issue. Issues get solved in structured IDS sessions. Solutions become Interventions tracked against the original metric. The loop closes.

2. **It enforces a rhythm, not just visibility.**
   The L10 meeting mode isn't optional flavor—it's a timed, structured 90-minute format with agenda sections, scorecard snapshots, rock reviews, and IDS. The app doesn't just show you data; it makes you sit down weekly and do something about it.

3. **Strategy connects to execution.**
   VTO (10-year vision → 3-year picture → 1-year plan → quarterly rocks) flows down into weekly scorecard metrics and issues. When a rock is off-track, you can trace it back to which part of the vision it supports. Dashboards don't do this.

4. **It's built for the meeting, not the screen.**
   Most analytics tools are designed for solo consumption. This is designed for a room of 5-8 leaders looking at the same screen, making decisions together, with timers, shoutouts, and a structured IDS process.

5. **Interventions create a learning loop.**
   When you try something (hire a new therapist, launch a referral campaign), the app tracks whether it actually moved the metric. Over quarters, the clinic builds institutional knowledge about what works. Dashboards reset every Monday.

6. **It's opinionated about clinic operations.**
   Default metric templates, EOS-structured meetings, quarterly rock cycles, Jane-native data ingestion—this isn't a generic BI tool you configure for months. It knows what a clinic needs to track and how leadership teams should operate.

7. **Multi-source data without lock-in.**
   Jane auto-sync, manual entry, workbook imports, PDF extraction—clinics aren't forced into a single data pipeline. The app meets them where they are and upgrades their workflow over time.

---

## Summary

ClinicLeader is an **EOS-based operating system for clinic leadership teams** that connects strategy (VTO) to execution (Scorecard → Issues → Interventions) through a structured weekly rhythm (L10 meetings). It is not a dashboard, not a patient management system, and not a billing tool. It is the layer that sits between the EMR and the leadership team's decision-making process.
