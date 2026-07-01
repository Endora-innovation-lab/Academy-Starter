## Scope

Big multi-part change. I'll split into 3 groups. All backward compatible — no data loss, no breaking changes.

---

### 1. Profile UI tweaks (quick)

**Teacher Profile** (`src/components/profiles/TeacherProfile.tsx`)

- Header shows **Name** as the big title, **Teacher ID** as subtitle below.
- Add a note: *"To update these details, use the Add/Edit Teacher option in the institute dashboard."*
- Keep fields read-only.

**Student Profile** (`src/components/profiles/StudentProfile.tsx`)

- Header shows **Name** as big title, **Reg No** as subtitle below.
- Remove the **Address** field.
- Replace **Parent / Guardian** field with **Reg No** (already in subtitle — so show Reg No in the info grid instead of Parent/Guardian; keep Parent Mobile).

---

### 2. Institute Settings → ID Generation & Auto Roll Number

New card in **Institute Profile** (`src/components/profiles/InstituteProfile.tsx`) titled **ID Generation Settings** with toggles:

- Auto Teacher ID (default ON) → generates `TCH0001`, `TCH0002` …
- Auto Student Reg No (default ON) → generates `STU0001`, `STU0002` …
- Auto Batch ID (default ON) → `BAT0001`…
- Show Batch ID in UI (default ON)
- Auto Game ID (default ON) → `GAM0001`…
- Show Game ID in UI (default OFF)

Persist on `institutes` table via migration (new nullable boolean columns, all defaulted).

**Add/Edit forms** (`InstituteDashboard.tsx` teacher/student/batch/game dialogs):

- When auto is ON → hide the ID input, auto-fill next available padded number scoped to the institute (`MAX(numeric suffix) + 1` scan of existing IDs for that institute).
- When auto is OFF → show the ID input, validate uniqueness per institute (`institute_id + id` check before insert).
- Batch/Game ID visibility toggles hide the ID column in tables and hide the ID field in cards when OFF.

Uniqueness rules: scoped per institute (same TCH0001 allowed across different institutes) — enforced client-side via `select().eq('institute_id',…).eq('teacher_id',…)` pre-check + surfaced error.

---

### 3. Teacher Role: Teacher | Principal

**Migration**: add `role text default 'teacher'` to `teachers` (nullable, backfill existing rows to `'teacher'`).

**Add/Edit Teacher dialog** (`InstituteDashboard.tsx`):

- New **Role** select: Teacher (default) / Principal.
- If role = Teacher → require ≥ 1 batch assignment (existing validation kept; block save if none).
- If role = Principal → batch + game assignment optional (skip validation, allow save with none).

**Teacher Dashboard** (`TeacherDashboard.tsx`) — same page, gated by role:

- Principal sees: Overview, all Students, all Teachers, all Attendance (mark/edit), Fees (view only: paid/unpaid/partial).
- Principal cannot: change institute settings, add/edit/delete games/batches, change fee amount.
- Teacher (existing behavior) unchanged — sees only assigned batches.
- Implement by loading `teachers.role` on dashboard mount and switching queries: Principal fetches all institute rows; Teacher fetches assigned-batch rows (current logic).

**Default absent display**: teacher/student attendance UI defaults unmarked rows to "Absent" visually (already partly done — reinforce in mark UI).

---

### Files touched

- `supabase/migrations/…` (new) — add ID-gen setting columns to `institutes`, add `role` to `teachers`.
- `src/components/profiles/TeacherProfile.tsx`
- `src/components/profiles/StudentProfile.tsx`
- `src/components/profiles/InstituteProfile.tsx` — new ID Generation card.
- `src/pages/InstituteDashboard.tsx` — teacher/student/batch/game create+edit dialogs, role field, auto-ID logic, uniqueness checks, hide ID columns based on settings.
- `src/pages/TeacherDashboard.tsx` — Principal branch (views full institute data, hides edit controls for games/batches/fees).

### Not touched

- Existing IDs, attendance history, fee history, RLS on existing tables, auth flow.

---

### Execution order (2 turns to keep quality high)

**Turn A (this turn):** migration + profile UI tweaks + InstituteProfile ID Generation card (settings persist). 
**Turn B (next):** wire the settings into add/edit dialogs (auto-fill, uniqueness, hide columns) + Principal role in Teacher Dashboard.

Confirm and I'll start with Turn A & B  
  
  
Additional Clarifications:

1. Student Profile should continue displaying Parent/Guardian Name and Parent Mobile. Do not replace Parent/Guardian Name with Registration Number since Registration Number is already displayed below the student's name.

2. Automatically generated IDs must never be reused, even if a teacher, student, batch, or game is deleted or becomes inactive. Always generate the next highest available ID.

3. Principal permissions apply only within their own institute. They must never be able to view or access data from other institutes.

4. Default "Absent" should be a visual default only. Attendance must not be saved automatically until the user clicks the Save button.

5. Automatically generated Teacher IDs should remain read-only. They can only be edited when automatic ID generation is disabled by the institute.