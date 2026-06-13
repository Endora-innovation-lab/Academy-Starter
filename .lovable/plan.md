# Plan: Sidebar + Profile + Attendance Upgrade

This is a large change. I'll keep all existing business logic, data, and APIs intact. Only **UI restructuring**, **3 new profile pages**, and **additive attendance features** with backward compatibility.

---

## 1. Responsive Sidebar (all 3 dashboards)

Refactor `src/components/DashboardLayout.tsx` to use shadcn `Sidebar` with:

- Desktop:
  - Sidebar should be visible by default.
  - User can manually collapse/expand it.
  Mobile:
  - Sidebar hidden by default.
  - Open using hamburger menu.
  - Close when clicking outside or selecting a menu.
- **Hamburger (☰) in top header** — always visible, toggles sidebar
- Mobile: tap outside or select an item → closes (built-in Sheet behavior)
- Smooth slide-in animation (shadcn default)
- Sidebar items reordered to include **Profile** before **Logout**:
  - Institute: Overview · Students · Teachers · Batches · Attendance · Fees · **Profile** · Logout
  - Teacher: Overview · Batches · Attendance · **Profile** · Logout
  - Student: Overview · Attendance · Fees · **Profile** · Logout
- Keep current brand header (Academy + Institute code) at top, user info + logout pinned at bottom (matches reference image 3 structure).

## 2. Profile Pages (3 new)

New tab/section inside each dashboard (no new route — handled via existing tab state to avoid breaking auth/routing).

### Institute Profile (editable, except Institute ID)

Cards layout (reference image 2 style — left section list, right content panel):

- **Basic Information**: Logo, Name, ID (read-only), Type, Owner, Contact, Email
- **Address**: Address, City, State, Country, PIN
- **Business Information**: Established Year, Website, Facebook, Instagram, YouTube, Registration No., GST No., Branch Count
- **Subscription Plan**: shows badge + opens popup *"You're in beta version"*
- **Attendance Settings** section (see §4):
  - Attendance Window Duration (hours, default 3)
  - Auto-Absent Timing
  - Enable/Disable Automation toggle

Saves to `institutes` table (extend with new nullable columns via migration — all optional, backward compatible).

### Teacher Profile (read-only)

Name, Teacher ID, Institute ID, Mobile, Email, Gender, DOB, Emergency Contact, Blood Group, Active/Inactive, Assigned Games, Assigned Batches.

Teacher dashboard is read-only.

Institute can edit teacher details.

Teacher cannot edit profile.

### Student Profile (read-only)

Name, Reg No, Institute ID, Parent name, Parent mobile, DOB, Gender, Address, Emergency Contact, Active/Inactive, Enrolled Games, Fee Summary, Attendance Summary.

Institute can edit student details.

Student dashboard remains read-only.

Student cannot edit profile.

## 3. Attendance Upgrade (additive, backward compatible)

**No existing record changes.** New columns/table are additive and nullable.

### Schema additions (migration)

- `attendance` + `teacher_attendance`: add nullable `status` enum extension to allow `'pending'` (alongside existing `'present' | 'absent' | 'late'`). Existing rows untouched.
- New table `attendance_sessions`:
  - `id`, `institute_id`, `batch_id`, `game_id` (nullable), `session_date`, `started_at`, `expires_at`, `triggered_by_teacher_id`, `window_minutes`, `created_at`
  - Unique on `(batch_id, session_date)` so one rolling session per batch per day
- `institutes`: add `attendance_window_minutes` (default 180), `attendance_auto_absent` (bool, default true), `attendance_automation_enabled` (bool, default true)
- All new tables/cols get proper GRANTs + RLS scoped by `get_user_institute_id`

### Behavior (UI + minimal logic)

- **Session start**: when the first teacher in a batch clicks PRESENT → insert `attendance_sessions` row + mark that teacher present. Other teachers/students remain "pending" (not written until marked, OR written with `status='pending'`).
- **Within window**: anyone can be marked present/late.
- **On window expiry / next session load**: a client-side reconciliation (and a SQL helper) flips remaining `pending` → `absent`. No cron required; runs lazily when attendance UI opens for that batch+date.

### Default-Absent UI behavior (§7)

- Teacher attendance UI defaults each row to **ABSENT**.
- User must click PRESENT or LATE; nothing persists until **Save** is clicked.
- Same pattern carried into student attendance UI.

## 4. Attendance Settings

Inside Institute Profile → "Attendance Settings" card (writes the new `institutes` columns above).

## 5. "Made with…" / Beta popup

Subscription Plan card click → simple dialog: **"You're in beta version"**.

---

## Files touched

- `src/components/DashboardLayout.tsx` — new responsive sidebar shell with hamburger
- `src/components/AppSidebar.tsx` — **new**, shadcn sidebar driven by role
- `src/pages/InstituteDashboard.tsx` — add Profile tab + Attendance Settings + default-absent teacher UI
- `src/pages/TeacherDashboard.tsx` — add Profile tab (read-only) + default-absent attendance UI
- `src/pages/StudentDashboard.tsx` — add Profile tab (read-only)
- New migration: attendance_sessions table + institutes settings columns + pending status support

## What I will NOT touch

- Existing fee logic, fee history, attendance history rows
- Auth, routing, RLS for existing tables (only add to new ones)
- Database deletions of any kind
- Field renames  
  
Temporary Attendance Session Lifecycle
  Attendance Session is a temporary runtime object.
  It is NOT permanent business data.
  Purpose:
  - Start attendance window
  - Track session start time
  - Track session end time
  - Track who triggered the session
  - Control automatic attendance behavior
  After the attendance window expires and all automatic processing is completed:
  - Session Status → Completed
  - Perform all pending-to-absent processing
  - Finalize required attendance operations
  - Automatically delete the temporary attendance session record from the database
  IMPORTANT:
  Only the temporary attendance session record should be deleted.
  Never delete:
  - Teacher attendance records
  - Student attendance records
  - Attendance history
  - Attendance reports
  - Audit history
  Deleting the temporary session must NEVER affect historical attendance data.
  ---
  ## Student Attendance Editing
  Student attendance should remain flexible.
  Institution Admin and authorized Teachers should be able to:
  - Mark Present
  - Mark Late
  - Mark Absent
  - Edit attendance later
  - Correct mistakes
  - Update attendance after class if necessary
  There should be NO 1-hour restriction for student attendance.
  Student attendance corrections should always be allowed according to institute permissions.
  ---
  ## Teacher Attendance Restriction
  Teacher attendance should be stricter.
  When Attendance Session starts:
  First 1 Hour:
  - Present
  - Late
  After 1 Hour:
  - Hide Present option
  - Only Late should be available
  After Attendance Window expires:
  - Remaining unmarked teachers become Absent automatically.
  This restriction applies ONLY to teachers and never to students.

---

**Confirm and I'll execute.** If you want me to skip/defer any section (e.g. start with just sidebar + profile, then attendance), say so — this is large enough that splitting it into 2 turns will give cleaner results.