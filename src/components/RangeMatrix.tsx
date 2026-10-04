import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadEnrollmentCtx, isEnrollmentActive } from '@/lib/enrollment';

const MAX_DAYS = 92;
const MAX_MONTHS = 24;

export const enumerateDates = (from: string, to: string): string[] => {
  const out: string[] = [];
  if (!from || !to || from > to) return out;
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (cur <= end && out.length < MAX_DAYS) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

export const enumerateMonths = (from: string, to: string): string[] => {
  const out: string[] = [];
  if (!from || !to || from > to) return out;
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  const cur = new Date(fy, fm - 1, 1);
  const end = new Date(ty, tm - 1, 1);
  while (cur <= end && out.length < MAX_MONTHS) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
};

const dateHeader = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  return `${String(day).padStart(2, '0')} ${dt.toLocaleString('default', { month: 'short' })}, ${dt.toLocaleString('default', { weekday: 'short' })}`;
};

const monthHeader = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return `${new Date(y, mo - 1, 1).toLocaleString('default', { month: 'short' })} ${y}`;
};

const statusCls = (s: string) =>
  s === 'present'
    ? 'bg-accent/10 text-accent'
    : s === 'late'
      ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500'
      : 'bg-destructive/10 text-destructive';

const stickySno = 'sticky left-0 z-20 bg-card';
const stickySnoHead = 'sticky left-0 z-30 bg-muted';
const stickyName = 'sticky left-[56px] z-20 bg-card';
const stickyNameHead = 'sticky left-[56px] z-30 bg-muted';
const stickySecond = 'sticky left-[216px] z-20 bg-card';
const stickySecondHead = 'sticky left-[216px] z-30 bg-muted';

// ============ ATTENDANCE RANGE ============
export const AttendanceRangeTable = ({
  instituteId, role, batchId, from, to, onData,
}: {
  instituteId: string; role: 'student' | 'teacher'; batchId: string; from: string; to: string;
  onData?: (payload: { dates: string[]; rows: { name: string; batch: string; cells: Record<string, string> }[] }) => void;
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [conducted, setConducted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const dates = useMemo(() => enumerateDates(from, to), [from, to]);


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const map = new Map<string, { name: string; batch: string; batchId: string; cells: Record<string, string> }>();

      // Resolve the batches in scope (selected batch, or every batch of the institute)
      const { data: batchRows } = await supabase
        .from('batches')
        .select('id, name, teacher_id')
        .eq('institute_id', instituteId);
      const allBatches = (batchRows || []).filter((b: any) => batchId === 'all' || b.id === batchId);
      const batchIds = allBatches.map((b: any) => b.id);
      const batchNames: Record<string, string> = Object.fromEntries(allBatches.map((b: any) => [b.id, b.name]));

      if (role === 'student') {
        // Seed rows from the full enrolled active student list so the date range only
        // filters attendance columns/records, never the student list.
        const { data: enrollments } = batchIds.length
          ? await supabase.from('batch_students').select('student_id, batch_id').in('batch_id', batchIds)
          : { data: [] as any[] };
        const enrolledIds = Array.from(new Set((enrollments || []).map((e: any) => e.student_id)));
        const { data: activeStudents } = enrolledIds.length
          ? await supabase
              .from('students')
              .select('id, status, profiles!students_user_id_profiles_fkey(name)')
              .eq('institute_id', instituteId)
              .neq('status', 'inactive')
              .in('id', enrolledIds)
          : { data: [] as any[] };
        const nameById: Record<string, string> = Object.fromEntries(
          (activeStudents || []).map((s: any) => [s.id, (s.profiles as any)?.name || '-'])
        );
        const eCtx = await loadEnrollmentCtx(batchIds);
        (enrollments || []).forEach((e: any) => {
          if (!nameById[e.student_id]) return;
          if (!isEnrollmentActive(eCtx, e.student_id, e.batch_id)) return;
          map.set(`${e.student_id}|${e.batch_id}`, {
            name: nameById[e.student_id],
            batch: batchNames[e.batch_id] || '-',
            batchId: e.batch_id,
            cells: {},
          });
        });

        let q = supabase
          .from('attendance')
          .select('*, students(reg_no, status, profiles!students_user_id_profiles_fkey(name)), batches(name)')
          .eq('institute_id', instituteId)
          .gte('date', from)
          .lte('date', to);
        if (batchId !== 'all') q = q.eq('batch_id', batchId);
        const { data } = await q.limit(5000);
        (data || [])
          .filter((r: any) => (r.students as any)?.status !== 'inactive' && isEnrollmentActive(eCtx, r.student_id, r.batch_id))
          .forEach((r: any) => {
            const key = `${r.student_id}|${r.batch_id}`;
            if (!map.has(key)) {
              map.set(key, {
                name: (r.students as any)?.profiles?.name || '-',
                batch: (r.batches as any)?.name || batchNames[r.batch_id] || '-',
                batchId: r.batch_id,
                cells: {},
              });
            }
            map.get(key)!.cells[r.date] = r.status;
          });
      } else {
        // Seed rows from every teacher assigned to the batches in scope
        const { data: bt } = batchIds.length
          ? await supabase.from('batch_teachers').select('teacher_id, batch_id').in('batch_id', batchIds)
          : { data: [] as any[] };
        const assignments: { teacher_id: string; batch_id: string }[] = [
          ...((bt || []) as any[]).map((r: any) => ({ teacher_id: r.teacher_id, batch_id: r.batch_id })),
          ...allBatches.filter((b: any) => b.teacher_id).map((b: any) => ({ teacher_id: b.teacher_id, batch_id: b.id })),
        ];

        let q = supabase
          .from('teacher_attendance')
          .select('*')
          .eq('institute_id', instituteId)
          .gte('date', from)
          .lte('date', to);
        if (batchId !== 'all') q = q.eq('batch_id', batchId);
        const { data } = await q.limit(5000);
        const records = data || [];

        const teacherIds = Array.from(new Set([
          ...assignments.map(a => a.teacher_id),
          ...records.map((r: any) => r.teacher_id),
        ]));
        const nameMap: Record<string, string> = {};
        if (teacherIds.length) {
          const { data: tData } = await supabase.from('teachers').select('id, user_id').in('id', teacherIds);
          const userIds = (tData || []).map((t: any) => t.user_id);
          const { data: pData } = userIds.length
            ? await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
            : { data: [] as any[] };
          const u2n: Record<string, string> = {};
          (pData || []).forEach((p: any) => { u2n[p.user_id] = p.name; });
          (tData || []).forEach((t: any) => { nameMap[t.id] = u2n[t.user_id] || '-'; });
        }
        const extraBatchIds = Array.from(new Set(records.map((r: any) => r.batch_id).filter((b: any) => b && !batchNames[b])));
        if (extraBatchIds.length) {
          const { data: bData } = await supabase.from('batches').select('id, name').in('id', extraBatchIds);
          (bData || []).forEach((b: any) => { batchNames[b.id] = b.name; });
        }

        assignments.forEach(a => {
          const key = `${a.teacher_id}|${a.batch_id}`;
          if (!map.has(key)) {
            map.set(key, { name: nameMap[a.teacher_id] || '-', batch: batchNames[a.batch_id] || '-', batchId: a.batch_id, cells: {} });
          }
        });
        records.forEach((r: any) => {
          const key = `${r.teacher_id}|${r.batch_id}`;
          if (!map.has(key)) {
            map.set(key, { name: nameMap[r.teacher_id] || '-', batch: batchNames[r.batch_id] || '-', batchId: r.batch_id, cells: {} });
          }
          map.get(key)!.cells[r.date] = r.status;
        });
      }

      // Conducted classes: any saved attendance for the batch/date, or an attendance session
      const conductedSet = new Set<string>();
      Array.from(map.values()).forEach(v => {
        Object.keys(v.cells).forEach(d => conductedSet.add(`${v.batchId}|${d}`));
      });
      let sq = supabase
        .from('attendance_sessions')
        .select('batch_id, session_date')
        .eq('institute_id', instituteId)
        .gte('session_date', from)
        .lte('session_date', to);
      if (batchId !== 'all') sq = sq.eq('batch_id', batchId);
      const { data: sessions } = await sq.limit(5000);
      (sessions || []).forEach((s: any) => conductedSet.add(`${s.batch_id}|${s.session_date}`));

      if (cancelled) return;
      const list = Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
      list.sort((a, b) => a.name.localeCompare(b.name) || a.batch.localeCompare(b.batch));
      setRows(list);
      setConducted(conductedSet);
      setLoading(false);
      onData?.({
        dates,
        rows: list.map(r => ({
          name: r.name,
          batch: r.batch,
          cells: Object.fromEntries(dates.map(d => [
            d,
            r.cells[d] || (conductedSet.has(`${r.batchId}|${d}`) ? 'absent' : ''),
          ]).filter(([, v]) => v)) as Record<string, string>,
        })),
      });
    };
    load();
    return () => { cancelled = true; };
  }, [instituteId, role, batchId, from, to]);



  return (
    <div className="rounded-lg border bg-card overflow-x-auto max-w-full">
      <table className="text-sm border-collapse min-w-full">
        <thead className="bg-muted">
          <tr>
            <th className={`text-left p-3 font-medium min-w-[56px] w-[56px] ${stickySnoHead}`}>S.No</th>
            <th className={`text-left p-3 font-medium min-w-[160px] w-[160px] ${stickyNameHead}`}>
              {role === 'student' ? 'Name' : 'Teacher'}
            </th>
            <th className={`text-left p-3 font-medium min-w-[130px] w-[130px] ${stickySecondHead}`}>Batch</th>
            {dates.map(d => (
              <th key={d} className="text-center p-3 font-medium whitespace-nowrap">{dateHeader(d)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className="border-t">
              <td className={`p-3 whitespace-nowrap min-w-[56px] w-[56px] ${stickySno}`}>{i + 1}</td>
              <td className={`p-3 whitespace-nowrap ${stickyName}`}>{r.name}</td>
              <td className={`p-3 whitespace-nowrap ${stickySecond}`}>{r.batch}</td>
              {dates.map(d => {
                const s = r.cells[d] || (conducted.has(`${r.batchId}|${d}`) ? 'absent' : '');
                return (
                  <td key={d} className="p-3 text-center">
                    {s ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block w-8 text-center ${statusCls(s)}`}>
                        {s === 'present' ? 'P' : s === 'late' ? 'L' : 'A'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={dates.length + 3} className="p-8 text-center text-muted-foreground">No attendance records in this range</td></tr>
          )}
          {loading && (
            <tr><td colSpan={dates.length + 3} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ============ FEES RANGE ============
export const FeesRangeTable = ({
  instituteId, gameId, from, to,
}: { instituteId: string; gameId: string; from: string; to: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const months = useMemo(() => enumerateMonths(from, to), [from, to]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [gRes, sgRes, stuRes, feeRes] = await Promise.all([
        supabase.from('games').select('id, name').eq('institute_id', instituteId),
        supabase.from('student_games').select('*').eq('institute_id', instituteId),
        supabase.from('students').select('id, reg_no, status, profiles!students_user_id_profiles_fkey(name)').eq('institute_id', instituteId),
        supabase.from('fees').select('*').eq('institute_id', instituteId).gte('month', from).lte('month', to).limit(5000),
      ]);
      if (cancelled) return;
      const gameMap = Object.fromEntries((gRes.data || []).map((g: any) => [g.id, g.name]));
      const studentMap = Object.fromEntries((stuRes.data || []).map((s: any) => [s.id, s]));
      const fees = (feeRes.data || []).filter((f: any) => gameId === 'all' || f.game_id === gameId);

      const map = new Map<string, { name: string; reg: string; game: string; cells: Record<string, any> }>();
      const ensure = (sid: string, gid: string | null) => {
        const key = `${sid}__${gid || 'none'}`;
        if (!map.has(key)) {
          const stu = studentMap[sid];
          map.set(key, {
            name: (stu?.profiles as any)?.name || '-',
            reg: stu?.reg_no || '-',
            game: gid ? (gameMap[gid] || '—') : '—',
            cells: {},
          });
        }
        return map.get(key)!;
      };

      (sgRes.data || [])
        .filter((sg: any) => sg.status === 'active'
          && (gameId === 'all' || sg.game_id === gameId)
          && studentMap[sg.student_id]
          && studentMap[sg.student_id].status !== 'inactive')
        .forEach((sg: any) => ensure(sg.student_id, sg.game_id));

      // Students that already have at least one game-based row
      const studentsWithGameRows = new Set(
        Array.from(map.keys()).map(k => k.split('__')[0])
      );

      fees.forEach((f: any) => {
        if (!studentMap[f.student_id]) return;
        // Don't create an extra generic "—" row for a student already shown under their game(s)
        if (!f.game_id && studentsWithGameRows.has(f.student_id)) return;
        if (studentMap[f.student_id].status === 'inactive') return;
        if (f.game_id && (sgRes.data || []).some((sg: any) => sg.student_id === f.student_id && sg.game_id === f.game_id && sg.status !== 'active')) return;
        ensure(f.student_id, f.game_id).cells[f.month] = f;
      });

      const list = Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
      list.sort((a, b) => a.name.localeCompare(b.name) || a.game.localeCompare(b.game));
      setRows(list);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [instituteId, gameId, from, to]);

  const feeCls = (s: string) => s === 'paid' ? 'bg-accent/10 text-accent'
    : s === 'partial' ? 'bg-yellow-500/10 text-yellow-600'
    : 'bg-destructive/10 text-destructive';

  return (
    <div className="rounded-lg border bg-card overflow-x-auto max-w-full">
      <table className="text-sm border-collapse min-w-full">
        <thead className="bg-muted">
          <tr>
            <th className={`text-left p-3 font-medium min-w-[56px] w-[56px] ${stickySnoHead}`}>S.No</th>
            <th className={`text-left p-3 font-medium min-w-[160px] w-[160px] ${stickyNameHead}`}>Name</th>
            <th className={`text-left p-3 font-medium min-w-[130px] w-[130px] ${stickySecondHead}`}>Game</th>
            {months.map(m => (
              <th key={m} className="text-center p-3 font-medium whitespace-nowrap">{monthHeader(m)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className="border-t">
              <td className={`p-3 whitespace-nowrap min-w-[56px] w-[56px] ${stickySno}`}>{i + 1}</td>
              <td className={`p-3 whitespace-nowrap ${stickyName}`}>
                {r.name}
                <span className="block text-xs text-muted-foreground">{r.reg}</span>
              </td>
              <td className={`p-3 whitespace-nowrap ${stickySecond}`}>{r.game}</td>
              {months.map(m => {
                const f = r.cells[m];
                return (
                  <td key={m} className="p-3 text-center">
                    {f ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${feeCls(f.status)}`} title={`₹${Number(f.collected_amount || 0).toLocaleString()} / ₹${Number(f.amount || 0).toLocaleString()}`}>
                        {f.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={months.length + 3} className="p-8 text-center text-muted-foreground">No fee records in this range</td></tr>
          )}
          {loading && (
            <tr><td colSpan={months.length + 3} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
