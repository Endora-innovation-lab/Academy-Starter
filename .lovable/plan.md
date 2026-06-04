## Overview

Refactor the fee + student system from **batch-based** to **game-based**, add per-student/per-game enrollment with active/inactive status, an overall student status, and lock down teacher fee permissions.

## 1. Database changes (safe, additive migration)

- `**student_games**` (new) — links a student to a game with monthly fee and active flag.
  - `student_id`, `game_id`, `institute_id`, `monthly_fee numeric default 0`, `status text default 'active'` (active/inactive)
  - Unique (student_id, game_id)
  - RLS: admins manage; teachers/students view in same institute / own record
- `**students.status**` (new column) — text default `'active'`. Overall student status.
- `**fees**` (alter) — add `game_id uuid` (nullable for backfill), `payment_mode text` (cash/online).
- `**fee_history**` (alter) — add `game_id`, `payment_mode`.
- **Backfill**: leave old fee rows with `game_id = null`; nothing destructive. Old batch/attendance/fee records untouched.

## 2. Institute Dashboard

- **Students tab**:
  - Add **Edit student** (email + roll no) — updates `profiles.email` and `students.reg_no` only; keeps same `student_id` so attendance/fees stay linked.
  - Add **Status** toggle (Active/Inactive) on student.
  - Add **Enrolled Games** panel inside student row: list games with monthly fee + per-game Active/Inactive + Remove. Add-game form (pick game + monthly fee).
- **Add Student flow**: replace batch picker with **game picker + monthly fee input**. Creates `student_games` row. Still allows assigning to batch separately (batches stay for attendance grouping).
- **Fees tab**:
  - Replace **Batch filter** with **Game filter**. Hide filter if only 1 game.
  - Monthly fee defaults from `student_games.monthly_fee` when row is created.
  - Admin can override monthly fee per month and per game; updating `student_games.monthly_fee` propagates to future months.
  - Show columns: Student | Game | Monthly Fee | Collected | Balance | Status (auto) | Mode | Date | Updated by | History.
  - Auto-rollover: when loading a month, for each active `student_games` create a fee row if missing using `student_games.monthly_fee`.

## 3. Teacher Dashboard

- Remove ability to edit Monthly Fee and to pick status manually.
- Teacher inputs only **Collected Amount** and **Payment Mode** (Cash/Online), then **Save**.
- Status auto: collected=0 → Unpaid; 0<collected<fee → Partial; collected≥fee → Paid.
- Replace Batch filter with **Game filter** (hidden if 1 game). Teacher only sees students in batches they teach AND in games linked via `student_games`.

## 4. Student Dashboard

- Show only games the student is enrolled in.
- If `students.status = 'inactive'` → show full-screen "You are currently inactive. Please contact your institute." with **Back to Home** button. Block dashboard.
- Fee table shows Game | Monthly Fee | Collected | Balance | Status | Mode | Date.

## 5. Attendance

- All attendance loaders filter out students where `students.status = 'inactive'` (Institute, Teacher).
- Inactive-per-game does NOT hide from attendance (attendance is batch-level), only overall inactive hides.

## 6. Auth gate

- On login, if `students.status = 'inactive'` redirect to `/inactive` page with message + Back to Home.

## Technical notes

- New migration: `student_games` table + grants + RLS + `students.status` + `fees.game_id` + `fees.payment_mode` + same on `fee_history`.
- All edits in `src/pages/InstituteDashboard.tsx`, `src/pages/TeacherDashboard.tsx`, `src/pages/StudentDashboard.tsx`, plus new `src/pages/Inactive.tsx` route in `App.tsx`.
- Edit student uses `admin-operations` edge function to update auth email (existing function path).
- No deletes anywhere; data preserved.

## Files touched

- `supabase/migrations/<new>.sql` — additive
- `src/App.tsx` — add `/inactive` route
- `src/pages/Inactive.tsx` — new
- `src/pages/InstituteDashboard.tsx`
- `src/pages/TeacherDashboard.tsx`
- `src/pages/StudentDashboard.tsx`
- `supabase/functions/admin-operations/index.ts` — add `update_student` action (email + reg_no)  
  
## Additional Clarifications
  1. GAME ENROLLMENT VS ATTENDANCE
  If a student's game enrollment status becomes Inactive:
  - Hide the student from attendance related to that game only.
  - Hide the student from batches related to that game only.
  - Keep attendance history unchanged.
  - Keep fee history unchanged.
  - Do not delete any records.
  Example:
  Silambam = Inactive
  Yoga = Active
  Result:
  - Student should NOT appear in Silambam attendance.
  - Student should NOT appear in Silambam batch lists.
  - Student SHOULD continue appearing in Yoga attendance and Yoga batches.
  2. ADD STUDENT FLOW
  Game must be selected first.
  After selecting a game:
  - Show only batches belonging to the selected game.
  - Do not show batches from other games.
  Example:
  Selected Game = Silambam
  Show:
  - Silambam Morning Batch
  - Silambam Evening Batch
  Do NOT show:
  - Yoga batches
  - Gymnastics batches
  3. EXCESS PAYMENT HANDLING
  If collected amount exceeds monthly fee:
  Example:
  Monthly Fee = ₹1000
  Collected = ₹1200
  Then:
  - Status = Paid
  - Excess Amount = ₹200
  Store excess amount separately.
  Do not lose payment history.
  4. DATA SAFETY
  Do not delete:
  - Attendance history
  - Fee history
  - Student enrollments
  - Teacher assignments
  All historical records must remain linked and accessible.