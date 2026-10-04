import { supabase } from '@/integrations/supabase/client';

/**
 * Enrollment-level status helpers.
 * An enrollment (student in a batch) is active when the student is active AND
 * their student_games row for the batch's game is active. Batches without a game,
 * or legacy enrollments without a student_games row, fall back to the student status.
 */
export type EnrollmentCtx = {
  batchGame: Record<string, string | null>;
  inactiveGame: Set<string>; // `${student_id}|${game_id}`
};

export const loadEnrollmentCtx = async (batchIds: string[]): Promise<EnrollmentCtx> => {
  const ctx: EnrollmentCtx = { batchGame: {}, inactiveGame: new Set() };
  if (!batchIds.length) return ctx;
  const { data: b } = await supabase.from('batches').select('id, game_id').in('id', batchIds);
  (b || []).forEach((r: any) => { ctx.batchGame[r.id] = r.game_id || null; });
  const gameIds = Array.from(new Set(Object.values(ctx.batchGame).filter(Boolean))) as string[];
  if (gameIds.length) {
    const { data: sg } = await supabase.from('student_games').select('student_id, game_id, status').in('game_id', gameIds).eq('status', 'inactive');
    (sg || []).forEach((r: any) => ctx.inactiveGame.add(`${r.student_id}|${r.game_id}`));
  }
  return ctx;
};

export const isEnrollmentActive = (ctx: EnrollmentCtx, studentId: string, batchId: string) => {
  const g = ctx.batchGame[batchId];
  return !g || !ctx.inactiveGame.has(`${studentId}|${g}`);
};
