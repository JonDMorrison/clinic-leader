# Northwest Injury Clinics - Onboarding Checklist

## Organization Provisioning Complete ✅

**Organization:** Northwest Injury Clinics  
**Subdomain:** northwest  
**Plan:** Pro (50 users, 10,000 AI calls/month)  
**Status:** Ready for user import

---

## ✅ Completed Setup

### 1. Organization Structure
- [x] Organization created: "Northwest Injury Clinics"
- [x] Subdomain configured: `northwest.yourapp.com`
- [x] Timezone set: America/Vancouver
- [x] License activated: Pro plan

### 2. Departments Created
- [x] Front Desk
- [x] Clinical – Chiropractic
- [x] Clinical – Mid-Level
- [x] Massage
- [x] Billing
- [x] Management

### 3. Roles Configured
- [x] Owner (full system access)
- [x] Director (organization admin)
- [x] Manager (department manager)
- [x] Provider (clinical staff)
- [x] Staff (general employees)
- [x] Billing (financial access)

### 4. Branding Applied
- [x] Primary color: HSL(210, 85%, 55%) - Deep Blue
- [x] Accent color: HSL(170, 85%, 55%) - Aqua
- [x] Font family: Inter
- [x] Logo placeholder: Ready for upload
- [x] Favicon placeholder: Ready for upload

### 5. Import Infrastructure
- [x] User import page created (`/imports/users`)
- [x] KPI import page created (`/imports/kpis`)
- [x] SOP import page created (`/imports/sops`)
- [x] Organization settings page (`/settings/organization`)

---

## ⏳ Pending Actions

### 1. User Import (Awaiting Staff List)
**Status:** Import page ready but disabled  
**Next Step:** Upload CSV file with complete staff roster

**CSV Format Required:**
```csv
email,full_name,role,department
john.doe@northwest.com,John Doe,director,Management
jane.smith@northwest.com,Jane Smith,provider,Clinical – Chiropractic
```

**Valid Roles:**
- owner, director, manager, provider, staff, billing

**Valid Departments:**
- Front Desk
- Clinical – Chiropractic
- Clinical – Mid-Level
- Massage
- Billing
- Management

**Access Import:**
- Navigate to Settings → Import Users
- Or directly: `/imports/users`

### 2. KPI Setup
**Status:** Import page functional  
**Next Step:** Upload KPI definitions CSV

**CSV Format:**
```csv
name,category,unit,target,direction,owner_email
New Patients,Marketing,number,50,higher,marketing@northwest.com
Collections Rate,Revenue,percentage,95,higher,billing@northwest.com
```

**Access:**
- Settings → Import KPIs
- Or directly: `/imports/kpis`

### 3. SOP Documentation
**Status:** Import page functional  
**Next Step:** Upload procedures and documentation

**Supported Formats:**
- CSV (bulk import)
- Markdown (.md files with frontmatter)
- PDF (for reference documents)

**Access:**
- Settings → Import SOPs
- Or directly: `/imports/sops`

---

## 📋 Quick Access Links

### Organization Management
- **Organization Overview:** `/settings/organization`
- **Branding Settings:** `/branding`
- **License Details:** `/licensing`

### Import Pages
- **Import Users:** `/imports/users` ⚠️ Disabled until CSV ready
- **Import KPIs:** `/imports/kpis`
- **Import SOPs:** `/imports/sops`

### Settings Hub
- **All Settings:** `/settings`

---

## 🎯 Next Steps

### Immediate Priority
1. **Finalize Staff List**
   - Compile complete roster with emails, names, roles, departments
   - Format as CSV matching required structure
   - Upload via `/imports/users`

### Phase 2 (After Users)
2. **Upload KPI Targets**
   - Define key performance indicators
   - Set baseline targets and owners
   - Import via `/imports/kpis`

3. **Document SOPs**
   - Compile standard operating procedures
   - Convert to required format (CSV or Markdown)
   - Upload via `/imports/sops`

### Phase 3 (Activation)
4. **Test Access**
   - Verify users can log in
   - Confirm role permissions work correctly
   - Check department assignments

5. **Launch L10 Meetings**
   - Schedule first Level 10 meeting
   - Test scorecard with live data
   - Validate Rock tracking

---

## 🔧 Database Structure

### Tables Created/Modified
- `teams` - Organization entry added
- `departments` - 6 departments seeded
- `branding` - Visual identity configured
- `licenses` - Pro plan activated
- `users` - Ready for import (extended with `department_id`)
- User roles enum extended: Added `provider` and `billing`

### Organization ID
```
00000000-0000-0000-0000-000000000001
```
Use this ID when manually referencing Northwest Injury Clinics in queries.

---

## 🚨 Important Notes

### User Import Security
- User accounts will NOT be created until CSV upload is complete
- No email invitations will be sent automatically
- Admin must manually trigger user creation after reviewing import preview

### License Limits
- **Users:** 50 maximum (Pro plan)
- **AI Calls:** 10,000/month
- **Renewal Date:** 1 year from today
- Monitor usage at `/licensing`

### Subdomain Access
- Once DNS is configured, access at: `northwest.yourapp.com`
- Until then, use main app with organization context

---

## 📞 Support

For assistance with:
- CSV formatting issues
- Import errors
- Permission configuration
- Subdomain setup

Contact your implementation team or refer to the user documentation.

---

## ✅ Verification Checklist

Run through this checklist to confirm setup:

- [ ] Can access `/settings/organization`
- [ ] See "Northwest Injury Clinics" as organization name
- [ ] 6 departments visible in organization view
- [ ] Branding shows correct colors and subdomain
- [ ] License shows Pro plan with 50 user limit
- [ ] All 3 import pages accessible from settings
- [ ] User import shows "awaiting CSV" alert
- [ ] KPI and SOP import pages functional

---

**Setup Date:** {current_date}  
**Configured By:** System Provisioning  
**Status:** Ready for User Import
