# 🚑 Emergency Rollback Procedure

In the event of a critical failure after a deployment, follow these steps to restore service.

## 1. ⏪ Database Schema Rollback
If a migration corrupted the data or caused crashes:
- **Action:** Visit Supabase Dashboard > Database > Backups.
- **Procedure:** Select the most recent daily snapshot (pre-deployment) and initiate a "Point-in-Time Recovery" or restore the snapshot to a new instance for verification.
- **Manual Inverse:** Run the `.sql` inverse scripts found in `supabase/backups/rollback/` (if generated) or manually revert schema changes.

## 2. ⏪ Frontend Rollback
If the UI is broken or contains blocking bugs:
- **Action:** Revert the Git commit.
- **Command:** 
  ```bash
  git revert <last_commit_hash>
  git push origin main
  ```
- **CDN:** Purge cache if using a heavy CDN to ensure users get the older version immediately.

## 3. ⏪ Integration Rollback
If the Jane or Spreadsheet sync is producing garbage data:
- **Action:** Toggle "Maintenance Mode" in `teams` table.
- **SQL:**
  ```sql
  UPDATE public.teams SET scorecard_mode = 'manual' WHERE id = 'affected_id';
  ```
- **Purge:** Delete corrupted `metric_results` where `created_at > timestamp`.

---
**Emergency Contact:** lead-dev@clinicleader.com
**Uptime Monitor:** status.clinicleader.com
