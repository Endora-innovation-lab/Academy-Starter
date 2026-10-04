import { supabase } from '@/integrations/supabase/client';

// Extract the highest numeric suffix from a set of IDs matching PREFIX + digits
// Returns next padded ID like PREFIX0001 (max+1). Never reuses lower numbers even
// if intermediate records were deleted (uses MAX + 1 semantics).
function nextFromExisting(existing: (string | null | undefined)[], prefix: string, pad = 4) {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`, 'i');
  for (const val of existing) {
    if (!val) continue;
    const m = val.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

export async function nextTeacherId(instituteId: string) {
  const { data } = await supabase.from('teachers').select('teacher_id').eq('institute_id', instituteId);
  return nextFromExisting((data || []).map((r: any) => r.teacher_id), 'TCH');
}

// Format: [InstitutePrefix][YYYY][GamePrefix][NNN], e.g. HFS2026S001. Max+1, never reused.
export async function nextStudentRegNo(instituteId: string, gameId?: string, year = new Date().getFullYear()) {
  if (!gameId) return '';
  const [{ data: inst }, { data: game }] = await Promise.all([
    supabase.from('institutes').select('reg_prefix').eq('id', instituteId).maybeSingle(),
    supabase.from('games').select('game_prefix').eq('id', gameId).maybeSingle(),
  ]);
  const ip = (inst as any)?.reg_prefix?.trim().toUpperCase();
  const gp = (game as any)?.game_prefix?.trim().toUpperCase();
  if (!ip || !gp) return '';
  const { data } = await supabase.from('students').select('reg_no').eq('institute_id', instituteId);
  return nextFromExisting((data || []).map((r: any) => r.reg_no), `${ip}${year}${gp}`, 3);
}

export async function nextBatchId(instituteId: string) {
  const { data } = await supabase.from('batches').select('batch_id').eq('institute_id', instituteId);
  return nextFromExisting((data || []).map((r: any) => r.batch_id), 'BAT');
}

export async function nextGameId(instituteId: string) {
  const { data } = await supabase.from('games').select('game_id').eq('institute_id', instituteId);
  return nextFromExisting((data || []).map((r: any) => r.game_id), 'GAM');
}

// Check uniqueness of a manually entered ID within the institute
export async function isTeacherIdTaken(instituteId: string, id: string, excludeRowId?: string) {
  let q = supabase.from('teachers').select('id').eq('institute_id', instituteId).eq('teacher_id', id);
  if (excludeRowId) q = q.neq('id', excludeRowId);
  const { data } = await q.limit(1);
  return (data?.length || 0) > 0;
}

export async function isStudentRegNoTaken(instituteId: string, regNo: string, excludeRowId?: string) {
  let q = supabase.from('students').select('id').eq('institute_id', instituteId).eq('reg_no', regNo);
  if (excludeRowId) q = q.neq('id', excludeRowId);
  const { data } = await q.limit(1);
  return (data?.length || 0) > 0;
}

export async function isBatchIdTaken(instituteId: string, id: string, excludeRowId?: string) {
  let q = supabase.from('batches').select('id').eq('institute_id', instituteId).eq('batch_id', id);
  if (excludeRowId) q = q.neq('id', excludeRowId);
  const { data } = await q.limit(1);
  return (data?.length || 0) > 0;
}

export async function isGameIdTaken(instituteId: string, id: string, excludeRowId?: string) {
  let q = supabase.from('games').select('id').eq('institute_id', instituteId).eq('game_id', id);
  if (excludeRowId) q = q.neq('id', excludeRowId);
  const { data } = await q.limit(1);
  return (data?.length || 0) > 0;
}

export interface InstituteIdSettings {
  auto_teacher_id: boolean;
  auto_student_id: boolean;
  auto_batch_id: boolean;
  show_batch_id: boolean;
  auto_game_id: boolean;
  show_game_id: boolean;
}

export async function fetchInstituteIdSettings(instituteId: string): Promise<InstituteIdSettings> {
  const { data } = await supabase
    .from('institutes')
    .select('auto_teacher_id, auto_student_id, auto_batch_id, show_batch_id, auto_game_id, show_game_id')
    .eq('id', instituteId)
    .maybeSingle();
  return {
    auto_teacher_id: data?.auto_teacher_id !== false,
    auto_student_id: data?.auto_student_id !== false,
    auto_batch_id: data?.auto_batch_id !== false,
    show_batch_id: data?.show_batch_id !== false,
    auto_game_id: data?.auto_game_id !== false,
    show_game_id: !!data?.show_game_id,
  };
}
