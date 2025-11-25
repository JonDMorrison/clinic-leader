export const NWIC_USER_MANUAL = `# ClinicLeader User Manual for NW Injury Clinics

**Complete A-Z Guide for Setup and Daily Operations**

---

## Chapter 1: Getting Started

### First Login & Navigation

When you first log into ClinicLeader, you'll land on the **Dashboard**. This is your command center showing:
- Key metrics (New Patients, Completed Rocks, Open Issues, Active KPIs)
- Team performance score
- Recent activity feed
- Quick actions for common tasks

**Navigation Sidebar** (left side):
- **Dashboard** - Overview of clinic performance
- **V/TO** - Vision/Traction Organizer (strategic plan)
- **Scorecard** - Weekly KPI tracking
- **Rocks** - Quarterly goals (90-day priorities)
- **Issues** - Problem-solving board
- **L10 Meetings** - Weekly meeting agendas
- **People** - Team management & GWC assessments
- **Docs** - SOPs, policies, and training materials
- **Settings** - Organization configuration

---

## Chapter 2: Organization Setup

### Initial Configuration (Owner/Director Role)

Navigate to **Settings > Organization Settings** to configure:

1. **Basic Information**
   - Organization name: "NW Injury Clinics"
   - Timezone: Pacific Time (America/Los_Angeles)
   - Industry: Healthcare
   - Team size: Enter current headcount

2. **Operational Settings**
   - EHR System: Select your practice management system (e.g., AdvancedMD, Jane App)
   - Meeting Rhythm: Weekly (for L10 meetings)
   - Review Cadence: Quarterly (for rocks and strategic reviews)
   - Currency: USD

3. **Branding** (Settings > Branding)
   - Upload clinic logo
   - Set primary brand color
   - Customize accent colors for visual identity

**Why This Matters**: These settings establish your clinic's context and ensure all features align with your operational reality.

---

## Chapter 3: Building Your Team

### Adding Team Members

**Method 1: Direct Add (from /people page)**
1. Navigate to **People**
2. Click **"Add Team Member"** button
3. Fill in:
   - Full Name
   - Email
   - Password (provide this to the user securely)
   - Role (Owner, Director, Manager, Provider, Staff, Billing)
   - Department
4. Click **"Create User"**

**Method 2: Bulk Import**
1. Go to **Imports > Users**
2. Download the CSV template
3. Fill in user details (name, email, role, department)
4. Upload the completed CSV
5. Review and confirm imports

**User Roles Explained**:
- **Owner**: Full system access, can manage all settings
- **Director**: Can manage team, edit strategic elements
- **Manager**: Can manage documents, view reports, oversee operations
- **Provider**: Can view patients, enter notes, track personal metrics
- **Staff**: Can view assigned tasks, basic data entry
- **Billing**: Can manage claims, payments, financial data

### Departments

Before adding users, ensure departments exist:
- **Management**
- **Front Desk**
- **Clinical – Chiropractic**
- **Clinical – Mid-Level**
- **Massage**
- **Billing**

Add departments via **Settings > Organization Settings > Departments** section.

### Organizational Seats

Seats represent EOS roles (not job titles). Example seats:
- "Office Manager" (responsible for: team coordination, supplies, scheduling oversight)
- "Lead Provider" (responsible for: clinical protocols, provider training, quality assurance)
- "Front Desk Lead" (responsible for: patient intake, insurance verification, recall system)

**To Create Seats**:
1. Navigate to **People**
2. Click **"Manage Seats"**
3. Click **"Add Seat"**
4. Enter title and responsibilities
5. Assign a team member to the seat

**Why Seats Matter**: EOS methodology separates roles from people. This allows you to evaluate "Right Person, Right Seat" independently from job titles.

---

## Chapter 4: Strategic Foundation (V/TO)

### Creating Your Vision/Traction Organizer

The V/TO is your 1-page strategic plan. Navigate to **V/TO** and click **"Create Your V/TO"**.

**Vision Section** (where you're going):

1. **Core Values** (3-7 values)
   - Define the fundamental beliefs that guide your clinic
   - Example: "Patient First", "Clinical Excellence", "Team Accountability"
   - Add behavioral examples for each value

2. **Core Focus** (Purpose + Niche)
   - Purpose: Why you exist (e.g., "Help injured workers return to work pain-free")
   - Niche: What you're best at (e.g., "L&I injury rehabilitation")

3. **10-Year Target**
   - Big, audacious goal 10 years out
   - Example: "5 clinic locations serving 10,000+ patients annually"

4. **Ideal Client**
   - Who do you serve best?
   - Example: "Workers' comp patients referred by case managers seeking fast, effective care"

5. **3 Uniques (Differentiators)**
   - What makes you different?
   - Example: "Same-day appointments", "Direct CM communication", "Evidence-based protocols"

6. **Proven Process**
   - Your service delivery steps
   - Example: "1. Rapid intake → 2. Accurate diagnosis → 3. Personalized treatment → 4. Return-to-work planning"

7. **Promise (Guarantee)**
   - Your commitment to clients
   - Example: "We guarantee clear communication with your claim manager within 24 hours"

8. **3-Year Picture**
   - Specific measurable goals for 3 years from now
   - Example: "$3M revenue, 85% patient satisfaction, 2 locations"

9. **1-Year Plan**
   - Specific goals for this year
   - Example: "20 new patients/week, 90% claim approval rate, hire 2 providers"

**Traction Section** (how you'll get there):

10. **Issues List**
    - Key obstacles to achieving your vision
    - These will become action items

11. **Rocks** (Quarterly Priorities)
    - 3-7 most important 90-day goals
    - Linked from your Rocks page

**Auto-Save Feature**: Your V/TO saves automatically every 3 seconds. Look for the "Saved" indicator in the top-right.

**Mini-Map Navigation**: Use the right sidebar to jump between sections quickly.

---

## Chapter 5: Metrics & Tracking (Scorecard)

### Setting Up Your Scorecard

Navigate to **Scorecard** to configure your key performance indicators (KPIs).

**Step 1: Add KPIs**
1. Click **"+ Add KPI"**
2. Fill in:
   - Name (e.g., "New Patients", "Patient Visits", "Collection Rate")
   - Category (Clinical, Financial, Operational)
   - Unit (Count, Percentage, Currency, Hours)
   - Target (weekly goal)
   - Direction (Higher is better / Lower is better)
   - Owner (who's accountable)
   - Sync Source (Manual, Jane, or other integrations)

**Step 2: Load Default KPIs** (Optional)
- Click **"Load Defaults"** to add standard clinic KPIs
- Customize targets and owners after loading

**Common Clinic KPIs**:
- **New Patients** (Count, Target: 20/week)
- **Patient Visits** (Count, Target: 200/week)
- **Revenue** (Currency, Target: $50K/week)
- **Collection Rate** (Percentage, Target: 95%)
- **Overdue AR** (Currency, Lower is better, Target: $5K)
- **Missed Appointments** (Count, Lower is better, Target: 5/week)
- **Patient Satisfaction** (Percentage, Target: 90%)

### Weekly KPI Updates

**Every Monday** (or your designated update day):
1. Navigate to **Scorecard > Update**
2. Enter actual values for each KPI for the previous week
3. Add notes if values are significantly off target
4. Click **"Save Week"**

**Mobile Quick Entry**:
- On mobile devices, use the **"Quick Entry"** button for a streamlined input interface

**Automatic Alerts**:
- System generates alerts for metrics >15% off target
- Downtrends (3+ weeks) trigger warnings
- Coaching tips appear for common issues

### Importing Data

If you track metrics in spreadsheets:
1. Navigate to **Imports > KPIs**
2. Download CSV template
3. Fill in weekly data (metric_name, week_of, actual)
4. Upload and confirm

**CSV Format**:
\`\`\`
metric_name,week_of,actual
New Patients,2025-01-06,22
Patient Visits,2025-01-06,215
Revenue,2025-01-06,52000
\`\`\`

**Jane App Integration**: If you use Jane App as your EHR, connect it via **Integrations > Jane** to automatically sync patient counts, visits, and revenue.

---

## Chapter 6: Quarterly Goals (Rocks)

### What Are Rocks?

Rocks are your 3-7 most important priorities for the **next 90 days**. They're called "rocks" because they're your big priorities (not the small "pebbles").

**Good Rock Characteristics**:
- **Specific**: "Hire 2 new providers" not "Improve staffing"
- **Measurable**: Clear completion criteria
- **Achievable**: Realistic for 90 days
- **Owned**: One person accountable

### Creating Rocks

Navigate to **Rocks** page:

1. Click **"+ New Rock"**
2. Fill in:
   - Title: Clear, action-oriented statement
   - Owner: Who's accountable
   - Due Date: End of current quarter
   - Category: (optional) Group related rocks
3. Link to V/TO goals (optional but recommended)
4. Click **"Create Rock"**

**Example Rocks**:
- "Hire and onboard 2 massage therapists by March 31"
- "Implement new patient intake process achieving 15-min check-in time"
- "Reduce overdue AR to under $3K by quarter end"
- "Launch patient satisfaction survey with 80% response rate"

### Rock Reviews

**Weekly** (during L10 meetings):
- Update confidence level (1-10 scale)
- Mark "On Track", "At Risk", or "Off Track"
- Add notes on progress

**Quarterly** (end of quarter):
- Mark rocks as "Done" or "Carry Forward"
- Archive old rocks
- Set new rocks for next quarter via **"Quarterly Planning"** wizard

### Linking Rocks to V/TO

When creating rocks, click **"Link to V/TO"** to connect them to:
- 1-Year Plan goals
- 3-Year Picture objectives
- Core Focus initiatives

This creates strategic alignment - every rock drives your vision forward.

---

## Chapter 7: Problem Solving (Issues)

### The Issues List

Navigate to **Issues** to see your problem-solving board.

**Issue Statuses**:
- **Open**: Needs discussion
- **Discussed**: IDS'd but solution not yet implemented
- **Solved**: Fully resolved

### Creating Issues

**Manual Creation**:
1. Click **"+ New Issue"**
2. Enter title (describe the problem)
3. Add context (background, impact, root causes)
4. Set priority (Critical, High, Medium, Low)
5. Assign owner
6. Link to related rocks or V/TO goals if applicable

**Automatic Issue Creation**:
- Scorecard alerts: Click **"+ Issue"** button on off-track metric alerts
- L10 meetings: Issues identified during meetings auto-create

### IDS Methodology (Identify, Discuss, Solve)

**During L10 Meetings**:
1. **Identify**: Bring issues to the list (anyone can add)
2. **Discuss**: Talk through root causes, not symptoms
3. **Solve**: Create action items, assign owners, set deadlines

**Issue Board View**:
- Drag and drop to reorder by priority
- Filter by owner, priority, or status
- Archive solved issues to keep board clean

### Converting Issues

**Issue → To-Do**: If an issue requires a simple action, convert to a to-do item
**To-Do → Issue**: If a to-do uncovers a bigger problem, elevate it to an issue

---

## Chapter 8: Running Your Business (L10 Meetings)

### What is an L10 Meeting?

L10 = Level 10 Meeting (goal: rate every meeting a 10/10). It's your weekly leadership team meeting following the EOS format.

**Standard Agenda** (90 minutes):
1. **Segue** (5 min): Check-in, good news
2. **Scorecard Review** (5 min): Review KPIs
3. **Rock Review** (5 min): Update quarterly goals
4. **Headlines** (5 min): Customer/employee updates
5. **To-Do List** (5 min): Review last week's action items
6. **IDS** (60 min): Identify, Discuss, Solve issues
7. **Conclude** (5 min): Recap decisions, rate meeting

### Running an L10

Navigate to **L10 Meetings**:

1. **Before Meeting**:
   - System auto-populates scorecard snapshot
   - Review rocks and prepare updates
   - Add any headlines to capture

2. **During Meeting**:
   - **Scorecard**: Quickly review red/yellow metrics
   - **Rocks**: Each owner gives confidence (1-10) and status
   - **Headlines**: Share important updates (no discussion, just information)
   - **To-Dos**: Review last week's to-dos, mark complete/incomplete
   - **IDS**: Spend bulk of time solving top 3 issues
     - Prioritize issues list
     - Discuss root causes
     - Create action items
     - Assign owners and due dates

3. **After Meeting**:
   - System saves all updates
   - To-dos appear on assignee's task list
   - New issues added to Issues board
   - Export meeting minutes if needed

**AI Agenda Suggestions**: The system analyzes your data and suggests agenda items like "Discuss New Patients downtrend" or "Review overdue AR spike".

### Meeting Roles

- **Facilitator**: Keeps meeting on time and on agenda (usually owner/director)
- **Note-taker**: Captures decisions and to-dos (system helps with this)
- **Participants**: Leadership team members

**Best Practices**:
- Start and end on time
- No side conversations
- Stay on agenda
- Rate meeting at end (aim for 8+)
- Hold people accountable to to-dos

---

## Chapter 9: Documentation (Docs & Training)

### Document Types

ClinicLeader manages three types of documents:
1. **SOPs** (Standard Operating Procedures): How to do specific tasks
2. **Policies**: Rules and guidelines
3. **Handbooks**: Training materials and reference guides

### Uploading Documents

**Single Document**:
1. Navigate to **Docs**
2. Click **"Upload"** (managers/owners only)
3. Select PDF or DOCX file
4. Choose document kind (SOP, Policy, Handbook)
5. Add title and description
6. Click **"Upload"**

**Bulk Upload**:
1. Click **"Bulk Upload"**
2. Select multiple files
3. System extracts text automatically for AI search
4. All documents appear in main list

**Supported Formats**:
- PDF (text-based or scanned with OCR)
- DOCX (Microsoft Word)

### Viewing Documents

Click any document to open inline viewer:
- **PDFs**: Render directly in browser
- **DOCX**: Download to view
- **Download button**: Always available in viewer

### Document Management (Manager/Owner)

**Delete Document**:
- Click three-dot menu on document
- Select **"Delete"**
- Confirm deletion

**Re-extract Text** (if AI can't read a PDF):
- Click three-dot menu
- Select **"Re-extract"**
- System reprocesses document with OCR if needed

### AI Document Search

**Ask About Documents** (sidebar on Docs page):
- Type questions about your document library
- AI searches all extracted text
- Answers with source citations
- Example: "What's our policy on cancellations?" or "Show me the patient intake SOP"

**Single Document Chat**:
- Open a document viewer
- Chat panel appears on right
- Ask questions specific to that document
- Example: "Summarize this policy" or "What are the key steps?"

### Training Handbook

Click **"Training Handbook"** to view:
- Employee Manual (front desk procedures, phone protocols, L&I guidelines)
- System Handbook (how to use ClinicLeader features)
- Searchable by keyword
- Printable sections

---

## Chapter 10: Integrations (Jane App)

### Connecting Jane App

If you use Jane App as your EHR:

1. Navigate to **Integrations > Jane**
2. Click **"Connect Jane App"**
3. Enter your Jane App API key (from Jane settings)
4. Enter Clinic ID
5. Select sync scope:
   - Patient counts
   - Appointment data
   - Payment/revenue data
6. Choose sync mode:
   - **Automatic**: Daily sync at midnight
   - **Manual**: Sync on demand
7. Click **"Save Connection"**

**What Gets Synced**:
- New Patients (daily/weekly counts)
- Patient Visits (appointment completions)
- Revenue (payment transactions)
- Cancellations and no-shows

**Viewing Sync Status**:
- Green indicator: Connected and syncing
- Yellow: Sync pending
- Red: Connection issue
- Last sync timestamp shown

**Backfill Historical Data**:
- Click **"Backfill History"**
- Select date range (e.g., last 90 days)
- System imports historical data to populate trends

**Manual Sync**:
- Click **"Sync Now"** to force immediate sync
- Useful after major data corrections in Jane

---

## Chapter 11: Customization & Settings

### Branding Your Instance

Navigate to **Settings > Branding**:

1. **Logo Upload**:
   - Upload clinic logo (PNG or JPG)
   - Appears in navigation and reports

2. **Color Scheme**:
   - Primary Color: Main brand color (used for buttons, highlights)
   - Accent Color: Secondary color for UI elements
   - Preview changes in real-time

3. **Custom Domain** (Enterprise plan):
   - Connect your own domain (e.g., eos.nwinjuryclinics.com)
   - Requires DNS configuration

### User Preferences

Each user can customize:
- **Notifications**: Email alerts for assigned to-dos, issues, rocks
- **Dashboard**: Pin favorite KPIs to dashboard
- **Theme**: Light or dark mode (system default)

### Organization Settings

**General**:
- Organization name
- Timezone
- Default report email
- Team size

**Operational**:
- EHR system
- Meeting rhythm (weekly/biweekly)
- Review cadence (quarterly/annual)
- Fiscal year start

**Departments**:
- Add/edit/delete departments
- Assign colors for visual organization

**Core Values**:
- Add organization-wide core values
- Used for GWC assessments

---

## Appendix A: Quick Start Checklist

Use this checklist to track your setup progress:

☐ **Organization Setup**
   - ☐ Configure basic info (name, timezone, industry)
   - ☐ Add branding (logo, colors)
   - ☐ Create departments

☐ **Team Building**
   - ☐ Add team members (at least 2 users)
   - ☐ Define organizational seats
   - ☐ Assign people to seats

☐ **Strategic Foundation**
   - ☐ Create V/TO
   - ☐ Define core values (3-7)
   - ☐ Complete vision section (10-year target, 3-year picture, 1-year plan)

☐ **Metrics**
   - ☐ Add scorecard KPIs (5+ metrics)
   - ☐ Set targets and owners
   - ☐ Enter first week of data

☐ **Quarterly Goals**
   - ☐ Create first rock
   - ☐ Link rocks to V/TO

☐ **Documentation**
   - ☐ Upload first document (SOP or policy)

☐ **Integrations** (Optional)
   - ☐ Connect Jane App
   - ☐ Backfill historical data

☐ **First L10**
   - ☐ Schedule recurring weekly meeting
   - ☐ Complete first L10 with full agenda

---

## Appendix B: Feature Integration Map

\`\`\`
┌─────────────┐
│    V/TO     │ ← Strategic Plan (Vision + Traction)
└──────┬──────┘
       │ drives
       ▼
┌─────────────┐     ┌──────────────┐
│    ROCKS    │────▶│  SCORECARD   │
│(Quarterly)  │     │  (Weekly)    │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │ creates           │ off-track triggers
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│   ISSUES    │────▶│     IDS      │
│ (Problems)  │     │ (L10 Agenda) │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │ generates         │ creates
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│   TO-DOS    │────▶│   PEOPLE     │
│  (Tasks)    │     │(Assignments) │
└─────────────┘     └──────────────┘

All linked to V/TO for strategic alignment
\`\`\`

---

## Appendix C: Daily Workflows by Role

### Owner/Director
- **Daily**: Check dashboard, review alerts
- **Weekly**: Run L10 meeting, update rocks
- **Monthly**: Review scorecard trends, adjust targets
- **Quarterly**: Lead rock planning, V/TO refresh

### Manager
- **Daily**: Check to-dos, respond to issues
- **Weekly**: Update KPIs, attend L10
- **Monthly**: Upload new documents, review team performance

### Provider
- **Daily**: Complete assigned to-dos
- **Weekly**: Report personal metrics (if applicable)
- **Quarterly**: Update rock progress (if rock owner)

### Staff
- **Daily**: Check to-dos, enter data as assigned
- **Weekly**: Review training documents

---

## Appendix D: Troubleshooting

### Common Issues

**Q: I can't see my organization's data**
A: Ensure you're logged in with correct organization. Check top-right user menu for organization name.

**Q: Jane App sync isn't working**
A: Check API key is correct. Verify Jane App integration is "Active" in Integrations page. Contact support if issue persists.

**Q: Document won't open in viewer**
A: Use the Download button. Some browsers block inline PDFs. Downloaded files always work.

**Q: KPI data disappeared**
A: Data is never deleted. Check date filters on Scorecard page. Ensure you're viewing correct week range.

**Q: I can't delete/edit something**
A: Verify you have correct role permissions (Manager, Director, or Owner required for most edits).

---

## Appendix E: Support & Resources

**ClinicLeader Support**:
- Email: support@clinicleader.com
- Help Menu: Click "?" icon in navigation for contextual help
- Documentation: This manual plus video tutorials

**EOS Resources**:
- Book: "Traction" by Gino Wickman
- Website: eosworldwide.com
- Implementer: Consider hiring an EOS implementer for deeper support

---

**End of Manual**

Last Updated: January 2025
Version: 1.0
Organization: NW Injury Clinics
`;
