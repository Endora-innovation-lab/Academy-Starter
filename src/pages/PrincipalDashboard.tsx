import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, GraduationCap, ClipboardList, DollarSign, User,
  Search, Eye, Filter, Pencil,
} from 'lucide-react';
import TeacherProfile from '@/components/profiles/TeacherProfile';
import StudentProfile from '@/components/profiles/StudentProfile';
import { AttendanceRangeTable, FeesRangeTable } from '@/components/RangeMatrix';
import { SortableTH, useSort } from '@/components/SortableTable';

const PrincipalDashboard = () => {
  const { user, instituteId, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [teacherRecord, setTeacherRecord] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase.from('teachers').select('*').eq('user_id', user.id).maybeSingle();
      setTeacherRecord(data);
      setChecked(true);
    };
    load();
  }, [user]);

  const tabs = [
    { label: 'Overview', value: 'overview', icon: LayoutDashboard },
    { label: 'Students', value: 'students', icon: GraduationCap },
    { label: 'Teachers', value: 'teachers', icon: Users },
    { label: 'Attendance', value: 'attendance', icon: ClipboardList },
    { label: 'Fees', value: 'fees', icon: DollarSign },
    { label: 'Profile', value: 'profile', icon: User },
  ];

  if (loading || (user && !instituteId) || (user && !checked)) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</div>;
  }
  if (!user || !instituteId) return <Navigate to="/" replace />;
  if (checked && teacherRecord && teacherRecord.role !== 'principal') {
    return <Navigate to="/dashboard/teacher" replace />;
  }
  if (checked && !teacherRecord) return <Navigate to="/" replace />;

  const principalTeacherId: string = teacherRecord?.id;

  return (
    <DashboardLayout
      title="Principal Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userRoleLabel="Principal"
      headerLogoutIcon
    >
      {activeTab === 'overview' && <OverviewTab instituteId={instituteId} principalTeacherId={principalTeacherId} />}
      {activeTab === 'students' && <StudentsTab instituteId={instituteId} />}
      {activeTab === 'teachers' && <TeachersTab instituteId={instituteId} principalTeacherId={principalTeacherId} />}
      {activeTab === 'attendance' && <AttendanceTab instituteId={instituteId} userId={user.id} principalTeacherId={principalTeacherId} />}
      {activeTab === 'fees' && <FeesTab instituteId={instituteId} userId={user.id} />}
      {activeTab === 'profile' && teacherRecord && <TeacherProfile teacherId={teacherRecord.id} hideAssignments />}
    </DashboardLayout>
  );
};

// ============= OVERVIEW =============
const OverviewTab = ({ instituteId, principalTeacherId }: { instituteId: string; principalTeacherId: string }) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const month = date.slice(0, 7);
  const [stats, setStats] = useState({
    students: 0, teachers: 0, batches: 0, games: 0,
    presentStudents: 0, absentStudents: 0,
    presentTeachers: 0, absentTeachers: 0,
    classesConducted: 0,
    paidFees: 0, partialFees: 0, unpaidFees: 0,
  });
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const teachersQ = supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId);
      if (principalTeacherId) teachersQ.neq('id', principalTeacherId);
      const [s, t, b, g, att, tatt, f, sess] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).neq('status', 'inactive'),
        teachersQ,
        supabase.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        supabase.from('games').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        supabase.from('attendance').select('status,student_id').eq('institute_id', instituteId).eq('date', date),
        supabase.from('teacher_attendance').select('status,teacher_id').eq('institute_id', instituteId).eq('date', date),
        supabase.from('fees').select('status').eq('institute_id', instituteId).eq('month', month),
        supabase.from('attendance_sessions').select('id, batch_id').eq('institute_id', instituteId).eq('session_date', date),
      ]);

      const presentStudentSet = new Set<string>();
      const absentStudentSet = new Set<string>();
      (att.data || []).forEach((r: any) => {
        if (r.status === 'present' || r.status === 'late') presentStudentSet.add(r.student_id);
        else if (r.status === 'absent') absentStudentSet.add(r.student_id);
      });
      const presentTSet = new Set<string>();
      const absentTSet = new Set<string>();
      (tatt.data || []).forEach((r: any) => {
        if (r.status === 'present' || r.status === 'late') presentTSet.add(r.teacher_id);
        else if (r.status === 'absent') absentTSet.add(r.teacher_id);
      });

      let paid = 0, partial = 0, unpaid = 0;
      (f.data || []).forEach((r: any) => {
        if (r.status === 'paid') paid++;
        else if (r.status === 'partial') partial++;
        else unpaid++;
      });

      setStats({
        students: s.count || 0,
        teachers: t.count || 0,
        batches: b.count || 0,
        games: g.count || 0,
        presentStudents: presentStudentSet.size,
        absentStudents: absentStudentSet.size,
        presentTeachers: presentTSet.size,
        absentTeachers: absentTSet.size,
        classesConducted: (sess.data || []).length,
        paidFees: paid,
        partialFees: partial,
        unpaidFees: unpaid,
      });

      const sessBatchIds = Array.from(new Set((sess.data || []).map((r: any) => r.batch_id).filter(Boolean)));
      if (sessBatchIds.length) {
        const { data: bNames } = await supabase.from('batches').select('id, name').in('id', sessBatchIds);
        const nameById: Record<string, string> = {};
        (bNames || []).forEach((b: any) => { nameById[b.id] = b.name; });
        setClassList((sess.data || []).map((r: any) => ({ id: r.id, name: nameById[r.batch_id] || 'Batch' })));
      } else {
        setClassList([]);
      }
    })();
  }, [instituteId, date, month, principalTeacherId]);

  const Stat = ({ label, value, color = '' }: { label: string; value: number; color?: string }) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Institute Overview</h2>
        <p className="text-sm text-muted-foreground">Fee month: {month}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Institute</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total Students" value={stats.students} />
          <Stat label="Total Teachers" value={stats.teachers} />
          <Stat label="Total Batches" value={stats.batches} />
          <Stat label="Total Games" value={stats.games} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance</h3>
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44 h-8" />
            </div>
            <Card className="w-56 shrink-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Classes Conducted</span>
                  <span className="text-base font-bold text-foreground">{stats.classesConducted}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="h-24 overflow-y-auto overscroll-contain space-y-1 pr-1">
                  {classList.length === 0 && <p className="text-xs text-muted-foreground">No classes conducted</p>}
                  {classList.map(c => (
                    <div key={c.id} className="text-xs truncate">{c.name}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Total Students" value={stats.students} />
          <Stat label="Present" value={stats.presentStudents} color="text-accent" />
          <Stat label="Absent" value={stats.absentStudents} color="text-destructive" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <Stat label="Total Teachers" value={stats.teachers} />
          <Stat label="Teachers Present" value={stats.presentTeachers} color="text-accent" />
          <Stat label="Teachers Absent" value={stats.absentTeachers} color="text-destructive" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Fees (This Month)</h3>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Paid" value={stats.paidFees} color="text-accent" />
          <Stat label="Partial" value={stats.partialFees} color="text-yellow-600" />
          <Stat label="Unpaid" value={stats.unpaidFees} color="text-destructive" />
        </div>
      </div>
    </div>
  );
};

// ============= STUDENTS =============
const StudentsTab = ({ instituteId }: { instituteId: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [studentGames, setStudentGames] = useState<Record<string, string[]>>({});
  const [studentBatches, setStudentBatches] = useState<Record<string, string[]>>({});
  const [gamesList, setGamesList] = useState<{ id: string; name: string }[]>([]);
  const [batchesList, setBatchesList] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [studs, sg, bs, games, batches] = await Promise.all([
        supabase.from('students')
          .select('id, reg_no, status, parent_phone, gender, profiles!students_user_id_profiles_fkey(name, email)')
          .eq('institute_id', instituteId)
          .order('reg_no'),
        supabase.from('student_games').select('student_id, game_id').eq('institute_id', instituteId),
        supabase.from('batch_students').select('student_id, batch_id'),
        supabase.from('games').select('id, name').eq('institute_id', instituteId).order('name'),
        supabase.from('batches').select('id, name').eq('institute_id', instituteId).order('name'),
      ]);
      setRows(studs.data || []);
      const gameById: Record<string, string> = {};
      (games.data || []).forEach((g: any) => { gameById[g.id] = g.name; });
      const gMap: Record<string, string[]> = {};
      (sg.data || []).forEach((r: any) => {
        const n = gameById[r.game_id];
        if (!n) return;
        (gMap[r.student_id] ||= []).push(n);
      });
      setStudentGames(gMap);
      const bMap: Record<string, string[]> = {};
      (bs.data || []).forEach((r: any) => {
        if (!r.batch_id) return;
        (bMap[r.student_id] ||= []).push(r.batch_id);
      });
      setStudentBatches(bMap);
      setGamesList(games.data || []);
      setBatchesList(batches.data || []);
    })();
  }, [instituteId]);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter !== 'all' && (r.status || 'active') !== statusFilter) return false;
    if (gameFilter !== 'all') {
      const gName = gamesList.find(g => g.id === gameFilter)?.name;
      if (!gName || !(studentGames[r.id] || []).includes(gName)) return false;
    }
    if (batchFilter !== 'all') {
      if (!(studentBatches[r.id] || []).includes(batchFilter)) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (r.profiles as any)?.name?.toLowerCase() || '';
    return name.includes(q) || (r.reg_no || '').toLowerCase().includes(q);
  }), [rows, search, statusFilter, gameFilter, batchFilter, studentGames, studentBatches, gamesList]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, {
    name: (r: any) => (r.profiles as any)?.name || '',
    reg_no: (r: any) => r.reg_no || '',
    status: (r: any) => r.status || 'active',
  });

  const activeFilterCount = [statusFilter, gameFilter, batchFilter].filter(v => v !== 'all').length;
  const resetFilters = () => { setStatusFilter('all'); setGameFilter('all'); setBatchFilter('all'); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Students</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Search name / reg no" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" /> Filter
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{activeFilterCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3" align="end">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Game</Label>
                <Select value={gameFilter} onValueChange={setGameFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Games</SelectItem>
                    {gamesList.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Batch</Label>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batchesList.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
                <Button size="sm" onClick={() => setFilterOpen(false)}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="reg_no" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Reg No</SortableTH>
              <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
              <th className="text-left p-3 font-medium">Game</th>
              <th className="text-left p-3 font-medium">Contact</th>
              <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
              <th className="text-left p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const phone = r.parent_phone;
              const gnames = studentGames[r.id] || [];
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{r.reg_no}</td>
                  <td className="p-3">{(r.profiles as any)?.name || '—'}</td>
                  <td className="p-3">
                    {gnames.length
                      ? <div className="flex flex-wrap gap-1">{gnames.map(g => <Badge key={g} variant="outline" className="text-xs">{g}</Badge>)}</div>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3">{phone ? <a href={`tel:${phone}`} className="text-primary hover:underline">{phone}</a> : '-'}</td>
                  <td className="p-3">
                    <Badge variant={r.status === 'inactive' ? 'secondary' : 'default'}>{r.status || 'active'}</Badge>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!openId} onOpenChange={o => !o && setOpenId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Student Profile</DialogTitle></DialogHeader>
          {openId && <StudentProfile studentId={openId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= TEACHERS =============
const TeachersTab = ({ instituteId, principalTeacherId }: { instituteId: string; principalTeacherId: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('teachers')
        .select('id, teacher_id, role, phone, profiles!teachers_user_id_profiles_fkey(name, email)')
        .eq('institute_id', instituteId)
        .order('teacher_id');
      setRows((data || []).filter((r: any) => r.id !== principalTeacherId));
    })();
  }, [instituteId, principalTeacherId]);

  const filtered = useMemo(() => rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ((r.profiles as any)?.name?.toLowerCase() || '').includes(q)
      || (r.teacher_id || '').toLowerCase().includes(q);
  }), [rows, search]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, {
    tid: (r: any) => r.teacher_id || '',
    name: (r: any) => (r.profiles as any)?.name || '',
    role: (r: any) => r.role || 'teacher',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Teachers</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Search name / id" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="tid" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Teacher ID</SortableTH>
              <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
              <th className="text-left p-3 font-medium">Contact</th>
              <SortableTH sortKey="role" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Role</SortableTH>
              <th className="text-left p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{r.teacher_id || '—'}</td>
                <td className="p-3">{(r.profiles as any)?.name || '—'}</td>
                <td className="p-3">{r.phone ? <a href={`tel:${r.phone}`} className="text-primary hover:underline">{r.phone}</a> : '-'}</td>
                <td className="p-3"><Badge variant="outline">{r.role === 'principal' ? 'Principal' : 'Teacher'}</Badge></td>
                <td className="p-3">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!openId} onOpenChange={o => !o && setOpenId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Teacher Profile</DialogTitle></DialogHeader>
          {openId && <TeacherProfile teacherId={openId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= ATTENDANCE =============
const cycleStatus = (s: string): string => {
  if (s === 'unmarked') return 'present';
  if (s === 'present') return 'late';
  if (s === 'late') return 'absent';
  return 'unmarked';
};

const StatusBadge = ({ status, onClick }: { status: string; onClick?: () => void }) => {
  const label = status === 'present' ? 'P' : status === 'late' ? 'L' : status === 'absent' ? 'A' : '—';
  const cls =
    status === 'present' ? 'bg-accent text-accent-foreground'
    : status === 'late' ? 'bg-yellow-500 text-white'
    : status === 'absent' ? 'bg-destructive text-destructive-foreground'
    : 'bg-muted text-muted-foreground';
  if (onClick) {
    return (
      <button onClick={onClick} className={`px-3 py-1 rounded text-xs font-bold w-10 transition-colors ${cls}`}>
        {label}
      </button>
    );
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block w-8 text-center ${cls}`}>{label}</span>;
};

const SummaryCards = ({ total, present, absent, label }: { total: number; present: number; absent: number; label: string }) => (
  <div className="grid grid-cols-3 gap-3">
    <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total {label}</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{total}</div></CardContent></Card>
    <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Present</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-accent">{present}</div></CardContent></Card>
    <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Absent</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-destructive">{absent}</div></CardContent></Card>
  </div>
);

const AttendanceTab = ({ instituteId, userId, principalTeacherId }: { instituteId: string; userId: string; principalTeacherId: string }) => {
  const [mode, setMode] = useState<'students' | 'teachers'>('students');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Attendance</h2>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setMode('students')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${mode === 'students' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >Students</button>
          <button
            onClick={() => setMode('teachers')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${mode === 'teachers' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >Teachers</button>
        </div>
      </div>
      {mode === 'students'
        ? <StudentAttendancePanel instituteId={instituteId} userId={userId} />
        : <TeacherAttendancePanel instituteId={instituteId} userId={userId} principalTeacherId={principalTeacherId} />}
    </div>
  );
};

const StudentAttendancePanel = ({ instituteId, userId }: { instituteId: string; userId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [existingIds, setExistingIds] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'range'>('today');
  const [rangeFrom, setRangeFrom] = useState(new Date().toISOString().split('T')[0]);
  const [rangeTo, setRangeTo] = useState(new Date().toISOString().split('T')[0]);
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('batches').select('id,name').eq('institute_id', instituteId).order('name');
      setBatches(data || []);
    })();
  }, [instituteId]);

  const load = async () => {
    if (!selectedBatch) return;
    const { data } = await supabase
      .from('batch_students')
      .select('student_id, students(id, reg_no, status, parent_phone, profiles!students_user_id_profiles_fkey(name))')
      .eq('batch_id', selectedBatch);
    // Dedupe by student_id and show all active students in the batch (institute-scoped via batch)
    const seen = new Set<string>();
    const studs = (data || []).filter((s: any) => {
      if ((s.students as any)?.status === 'inactive') return false;
      if (seen.has(s.student_id)) return false;
      seen.add(s.student_id);
      return true;
    });
    setStudents(studs);

    const ids = studs.map(s => s.student_id);
    const map: Record<string, string> = {};
    const existing: Record<string, boolean> = {};
    let savedCount = 0;
    if (ids.length > 0) {
      const { data: att } = await supabase.from('attendance')
        .select('student_id,status').in('student_id', ids).eq('batch_id', selectedBatch).eq('date', date);
      savedCount = att?.length || 0;
      att?.forEach(a => { map[a.student_id] = a.status; existing[a.student_id] = true; });
    }
    // A class counts as conducted if any attendance was saved OR a session exists for this batch/date
    let conducted = savedCount > 0;
    if (!conducted) {
      const { data: sess } = await supabase.from('attendance_sessions')
        .select('id').eq('institute_id', instituteId).eq('batch_id', selectedBatch).eq('session_date', date).limit(1);
      conducted = (sess?.length || 0) > 0;
    }
    // Class conducted but no saved record for a student -> Absent; no class -> unmarked ("-")
    ids.forEach(id => { if (!map[id]) map[id] = conducted ? 'absent' : 'unmarked'; });
    setAttendanceMap(map);
    setExistingIds(existing);
    setTouched({});
    setHasLoaded(true);
    setEditing(false);
  };

  useEffect(() => { setHasLoaded(false); load(); }, [selectedBatch, date]);

  const toggle = (sid: string) => {
    if (!editing) return;
    setAttendanceMap(p => ({ ...p, [sid]: cycleStatus(p[sid] || 'absent') }));
    setTouched(p => ({ ...p, [sid]: true }));
  };

  const save = async () => {
    const records = Object.entries(attendanceMap)
      .filter(([sid, status]) => status !== 'unmarked' && (touched[sid] || existingIds[sid]))
      .map(([student_id, status]) => ({
        student_id, batch_id: selectedBatch, date, status,
        marked_by: userId, institute_id: instituteId,
      }));
    if (records.length === 0) { toast.error('No changes to save'); return; }
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,batch_id,date' });
    if (error) return toast.error(error.message);
    toast.success('Attendance saved');
    setTouched({});
    setEditing(false);
    await load();
  };

  const filtered = search
    ? students.filter(s => ((s.students as any)?.profiles?.name?.toLowerCase() || '').includes(search.toLowerCase()))
    : students;

  const totals = students.reduce((a, s) => {
    const st = attendanceMap[s.student_id];
    if (st === 'present' || st === 'late') a.present++;
    else if (st === 'absent') a.absent++;
    return a;
  }, { present: 0, absent: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={viewMode} onValueChange={(v: 'today' | 'range') => setViewMode(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="range">Custom Date Range</SelectItem>
          </SelectContent>
        </Select>
        {viewMode === 'today' ? (
          <>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
            {students.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-48" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="w-40" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="w-40" />
            <Button onClick={() => {
              if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) { toast.error('Select a valid date range'); return; }
              setAppliedRange({ from: rangeFrom, to: rangeTo });
            }}>Apply</Button>
          </div>
        )}
      </div>

      {viewMode === 'range' && (
        appliedRange ? (
          <AttendanceRangeTable
            instituteId={instituteId}
            role="student"
            batchId={selectedBatch || 'all'}
            from={appliedRange.from}
            to={appliedRange.to}
          />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Select a From and To date, then click Apply.
          </div>
        )
      )}

      {viewMode === 'today' && hasLoaded && filtered.length > 0 && (
        <>
          <SummaryCards total={students.length} present={totals.present} absent={totals.absent} label="Students" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {editing ? 'Edit mode — tap a status to cycle P → L → A. Click Save to apply.' : 'View mode — click Edit to modify attendance.'}
            </p>
            {!editing
              ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              : <Button size="sm" variant="ghost" onClick={() => { setEditing(false); load(); }}>Cancel</Button>}
          </div>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">S.No</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Reg No</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const stu = s.students as any;
                  return (
                    <tr key={s.student_id} className="border-t">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">{stu?.profiles?.name}</td>
                      <td className="p-3">{stu?.reg_no}</td>
                      <td className="p-3">{stu?.parent_phone ? <a href={`tel:${stu.parent_phone}`} className="text-primary hover:underline">{stu.parent_phone}</a> : '-'}</td>
                      <td className="p-3">
                        <StatusBadge status={attendanceMap[s.student_id] || 'absent'} onClick={editing ? () => toggle(s.student_id) : undefined} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {editing && <Button onClick={save}>Save Attendance</Button>}
        </>
      )}
      {viewMode === 'today' && hasLoaded && filtered.length === 0 && selectedBatch && (
        <p className="text-muted-foreground text-center py-8">No students in this batch</p>
      )}
    </div>
  );
};

const TeacherAttendancePanel = ({ instituteId, userId, principalTeacherId }: { instituteId: string; userId: string; principalTeacherId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [attMap, setAttMap] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [existingIds, setExistingIds] = useState<Record<string, boolean>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'range'>('today');
  const [rangeFrom, setRangeFrom] = useState(new Date().toISOString().split('T')[0]);
  const [rangeTo, setRangeTo] = useState(new Date().toISOString().split('T')[0]);
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('batches').select('id,name').eq('institute_id', instituteId).order('name');
      setBatches(data || []);
    })();
  }, [instituteId]);

  const load = async () => {
    if (!selectedBatch) return;
    // 1) Get teacher ids for this batch — from batch_teachers AND legacy batches.teacher_id
    const [{ data: btData }, { data: batchRow }] = await Promise.all([
      supabase.from('batch_teachers').select('teacher_id').eq('batch_id', selectedBatch),
      supabase.from('batches').select('teacher_id').eq('id', selectedBatch).maybeSingle(),
    ]);
    const teacherIds = Array.from(new Set([
      ...(btData || []).map((r: any) => r.teacher_id),
      ...(batchRow?.teacher_id ? [batchRow.teacher_id] : []),
    ])).filter((id: string) => id && id !== principalTeacherId);

    if (teacherIds.length === 0) {
      setTeachers([]); setAttMap({}); setExistingIds({}); setTouched({}); setHasLoaded(true); setEditing(false);
      return;
    }
    // 2) Fetch teachers + profiles explicitly to avoid nested FK issues
    const { data: teacherRows } = await supabase
      .from('teachers')
      .select('id, teacher_id, phone, user_id')
      .in('id', teacherIds);
    const userIds = (teacherRows || []).map((t: any) => t.user_id).filter(Boolean);
    const { data: profs } = userIds.length
      ? await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
      : { data: [] as any[] };
    const profMap: Record<string, string> = {};
    (profs || []).forEach((p: any) => { profMap[p.user_id] = p.name; });
    const ts = (teacherRows || []).map((t: any) => ({
      teacher_id: t.id,
      teachers: { id: t.id, teacher_id: t.teacher_id, phone: t.phone, name: profMap[t.user_id] || '—' },
    }));
    setTeachers(ts);

    const map: Record<string, string> = {};
    const existing: Record<string, boolean> = {};
    const { data: att } = await supabase.from('teacher_attendance')
      .select('teacher_id,status').in('teacher_id', teacherIds).eq('batch_id', selectedBatch).eq('date', date);
    att?.forEach(a => { map[a.teacher_id] = a.status; existing[a.teacher_id] = true; });
    teacherIds.forEach(id => { if (!map[id]) map[id] = 'absent'; });
    setAttMap(map);
    setExistingIds(existing);
    setTouched({});
    setHasLoaded(true);
    setEditing(false);
  };

  useEffect(() => { setHasLoaded(false); load(); }, [selectedBatch, date]);

  const toggle = (tid: string) => {
    if (!editing) return;
    setAttMap(p => ({ ...p, [tid]: cycleStatus(p[tid] || 'absent') }));
    setTouched(p => ({ ...p, [tid]: true }));
  };

  const save = async () => {
    const records = Object.entries(attMap)
      .filter(([tid, status]) => status !== 'unmarked' && (touched[tid] || existingIds[tid]))
      .map(([teacher_id, status]) => ({
        teacher_id, batch_id: selectedBatch, date, status,
        marked_by: userId, institute_id: instituteId,
      }));
    if (records.length === 0) { toast.error('No changes to save'); return; }
    const { error } = await supabase.from('teacher_attendance').upsert(records, { onConflict: 'teacher_id,batch_id,date' });
    if (error) return toast.error(error.message);
    toast.success('Teacher attendance saved');
    setTouched({});
    setEditing(false);
    await load();
  };

  const totals = teachers.reduce((a, t) => {
    const st = attMap[t.teacher_id];
    if (st === 'present' || st === 'late') a.present++;
    else if (st === 'absent') a.absent++;
    return a;
  }, { present: 0, absent: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={viewMode} onValueChange={(v: 'today' | 'range') => setViewMode(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="range">Custom Date Range</SelectItem>
          </SelectContent>
        </Select>
        {viewMode === 'today' ? (
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="w-40" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="w-40" />
            <Button onClick={() => {
              if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) { toast.error('Select a valid date range'); return; }
              setAppliedRange({ from: rangeFrom, to: rangeTo });
            }}>Apply</Button>
          </div>
        )}
      </div>

      {viewMode === 'range' && (
        appliedRange ? (
          <AttendanceRangeTable
            instituteId={instituteId}
            role="teacher"
            batchId={selectedBatch || 'all'}
            from={appliedRange.from}
            to={appliedRange.to}
          />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Select a From and To date, then click Apply.
          </div>
        )
      )}

      {viewMode === 'today' && hasLoaded && teachers.length > 0 && (
        <>
          <SummaryCards total={teachers.length} present={totals.present} absent={totals.absent} label="Teachers" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {editing ? 'Edit mode — tap a status to cycle P → L → A. Click Save to apply.' : 'View mode — click Edit to modify attendance.'}
            </p>
            {!editing
              ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              : <Button size="sm" variant="ghost" onClick={() => { setEditing(false); load(); }}>Cancel</Button>}
          </div>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">S.No</th>
                  <th className="text-left p-3 font-medium">Teacher ID</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => {
                  const T = t.teachers as any;
                  return (
                    <tr key={t.teacher_id} className="border-t">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">{T?.teacher_id || '—'}</td>
                      <td className="p-3">{T?.name || '—'}</td>
                      <td className="p-3">{T?.phone ? <a href={`tel:${T.phone}`} className="text-primary hover:underline">{T.phone}</a> : '-'}</td>
                      <td className="p-3">
                        <StatusBadge status={attMap[t.teacher_id] || 'absent'} onClick={editing ? () => toggle(t.teacher_id) : undefined} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {editing && <Button onClick={save}>Save Attendance</Button>}
        </>
      )}
      {viewMode === 'today' && hasLoaded && teachers.length === 0 && selectedBatch && (
        <p className="text-muted-foreground text-center py-8">No teachers assigned to this batch</p>
      )}
    </div>
  );
};

// ============= FEES =============
const FeesTab = ({ instituteId, userId }: { instituteId: string; userId: string }) => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rows, setRows] = useState<any[]>([]);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'range'>('month');
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rangeTo, setRangeTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);

  // Build rows straight from the database: every active enrollment (student × game)
  // joined with its fee record for the selected month (if any).
  const load = async () => {
    setLoading(true);
    const { data: studs } = await supabase
      .from('students')
      .select('id, reg_no, status, profiles!students_user_id_profiles_fkey(name)')
      .eq('institute_id', instituteId)
      .neq('status', 'inactive');
    const studentIds = (studs || []).map((s: any) => s.id);
    const stuMap: Record<string, any> = {};
    (studs || []).forEach((s: any) => { stuMap[s.id] = s; });

    if (studentIds.length === 0) { setRows([]); setDirty({}); setEditing(false); setLoading(false); return; }

    const [{ data: sg }, { data: gamesData }, { data: fees }] = await Promise.all([
      supabase.from('student_games').select('student_id, game_id, monthly_fee, status').in('student_id', studentIds),
      supabase.from('games').select('id, name').eq('institute_id', instituteId),
      supabase.from('fees').select('*').eq('institute_id', instituteId).eq('month', month).in('student_id', studentIds),
    ]);

    const gameMap: Record<string, string> = {};
    (gamesData || []).forEach((g: any) => { gameMap[g.id] = g.name; });

    const feeMap: Record<string, any> = {};
    (fees || []).forEach((f: any) => { feeMap[`${f.student_id}|${f.game_id || ''}`] = f; });

    const built: any[] = [];
    (sg || []).forEach((e: any) => {
      if (e.status && e.status !== 'active') return;
      const stu = stuMap[e.student_id];
      if (!stu) return;
      const fee = feeMap[`${e.student_id}|${e.game_id || ''}`];
      built.push({
        key: `${e.student_id}|${e.game_id}`,
        student_id: e.student_id,
        game_id: e.game_id || null,
        game_name: gameMap[e.game_id] || '—',
        name: stu.profiles?.name || '—',
        reg_no: stu.reg_no || '',
        fee_id: fee?.id || null,
        monthly_fee: Number(fee?.amount ?? e.monthly_fee ?? 0) || 0,
        collected: Number(fee?.collected_amount) || 0,
        mode: fee?.payment_mode || '',
        notes: fee?.notes || '',
      });
    });

    // Students with no active enrollment still appear so the full list is visible
    const enrolled = new Set(built.map(r => r.student_id));
    (studs || []).forEach((s: any) => {
      if (enrolled.has(s.id)) return;
      const fee = Object.values(feeMap).find((f: any) => f.student_id === s.id) as any;
      built.push({
        key: `${s.id}|none`,
        student_id: s.id,
        game_id: fee?.game_id || null,
        game_name: '—',
        name: s.profiles?.name || '—',
        reg_no: s.reg_no || '',
        fee_id: fee?.id || null,
        monthly_fee: Number(fee?.amount || 0) || 0,
        collected: Number(fee?.collected_amount) || 0,
        mode: fee?.payment_mode || '',
        notes: fee?.notes || '',
      });
    });

    built.sort((a, b) => a.name.localeCompare(b.name));
    setRows(built);
    setDirty({});
    setEditing(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, [instituteId, month]);

  const rowStatus = (r: any) => {
    const amt = Number(r.monthly_fee) || 0;
    const col = Number(r.collected) || 0;
    return col === 0 ? 'unpaid' : col >= amt ? 'paid' : 'partial';
  };

  const filtered = rows.filter(r => {
    if (statusFilter !== 'all' && rowStatus(r) !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.name || '').toLowerCase().includes(q) || (r.reg_no || '').toLowerCase().includes(q);
  });

  const totals = filtered.reduce((a, r) => {
    const st = rowStatus(r);
    return {
      paid: a.paid + (st === 'paid' ? 1 : 0),
      partial: a.partial + (st === 'partial' ? 1 : 0),
      unpaid: a.unpaid + (st === 'unpaid' ? 1 : 0),
      collected: a.collected + (Number(r.collected) || 0),
    };
  }, { paid: 0, partial: 0, unpaid: 0, collected: 0 });

  const statusCls = (s: string) => s === 'paid' ? 'bg-accent/10 text-accent'
    : s === 'partial' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-destructive/10 text-destructive';

  const updateRow = (key: string, patch: Partial<any>) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const save = async () => {
    const changedKeys = Object.keys(dirty).filter(k => dirty[k]);
    if (changedKeys.length === 0) { toast.info('No changes to save'); return; }
    setSaving(true);
    try {
      for (const key of changedKeys) {
        const r = rows.find(x => x.key === key);
        if (!r) continue;
        const amt = Number(r.monthly_fee) || 0;
        const col = Number(r.collected) || 0;
        const status = col === 0 ? 'unpaid' : col >= amt ? 'paid' : 'partial';
        const excess = Math.max(0, col - amt);
        const payload: any = {
          amount: amt,
          collected_amount: col,
          excess_amount: excess,
          status,
          payment_mode: r.mode || null,
          notes: r.notes || null,
          updated_by: userId,
          game_id: r.game_id,
        };
        let savedId = r.fee_id;
        if (!savedId) {
          const { data: existing } = await supabase.from('fees')
            .select('id').eq('student_id', r.student_id).eq('month', month).maybeSingle();
          if (existing?.id) savedId = existing.id;
        }
        if (savedId) {
          const { error } = await supabase.from('fees').update(payload).eq('id', savedId);
          if (error) throw error;
        } else {
          const { data: ins, error } = await supabase.from('fees').insert({
            ...payload, student_id: r.student_id, month, institute_id: instituteId,
          }).select('id').single();
          if (error) {
            if ((error as any).code === '23505') {
              const { data: ex2 } = await supabase.from('fees')
                .select('id').eq('student_id', r.student_id).eq('month', month).maybeSingle();
              if (!ex2?.id) throw error;
              const { error: upErr } = await supabase.from('fees').update(payload).eq('id', ex2.id);
              if (upErr) throw upErr;
              savedId = ex2.id;
            } else throw error;
          } else savedId = ins?.id;
        }
        setRows(prev => prev.map(x => x.key === key
          ? { ...x, fee_id: savedId, monthly_fee: amt, collected: col, mode: r.mode || '', notes: r.notes || '' }
          : x));
        await supabase.from('fee_history').insert({
          fee_id: savedId, student_id: r.student_id, institute_id: instituteId, month,
          amount: amt, collected_amount: col, excess_amount: excess, status,
          payment_mode: r.mode || null, notes: r.notes || null, game_id: r.game_id,
          updated_by: userId, updated_by_role: 'principal',
        });
      }
      toast.success(`${changedKeys.length} fee record(s) saved`);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fees</h2>
        <div className="flex gap-2 flex-wrap">
          <Select value={viewMode} onValueChange={(v: 'month' | 'range') => setViewMode(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Current Month</SelectItem>
              <SelectItem value="range">Custom Month Range</SelectItem>
            </SelectContent>
          </Select>
          {viewMode === 'month' ? (
            <>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-56" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input type="month" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="w-40" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="month" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="w-40" />
              <Button onClick={() => {
                if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) { toast.error('Select a valid month range'); return; }
                setAppliedRange({ from: rangeFrom, to: rangeTo });
              }}>Apply</Button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'range' ? (
        appliedRange ? (
          <FeesRangeTable instituteId={instituteId} gameId="all" from={appliedRange.from} to={appliedRange.to} />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Select a From and To month, then click Apply.
          </div>
        )
      ) : (
      <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Paid</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-accent">{totals.paid}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Partial</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-yellow-600">{totals.partial}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Unpaid</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-destructive">{totals.unpaid}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Collected</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">₹{totals.collected.toLocaleString()}</div></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {editing ? 'Edit mode — update Collected / Mode / Notes. Status is calculated. Click Save.' : 'View mode — click Edit to update fees.'}
        </p>
        {!editing
          ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
          : <Button size="sm" variant="ghost" onClick={() => { setEditing(false); load(); }}>Cancel</Button>}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">Game</th>
              <th className="text-left p-3 font-medium">Monthly Fee (₹)</th>
              <th className="text-left p-3 font-medium">Collected (₹)</th>
              <th className="text-left p-3 font-medium">Balance (₹)</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Mode</th>
              <th className="text-left p-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const amt = Number(r.monthly_fee) || 0;
              const col = Number(r.collected) || 0;
              const due = Math.max(0, amt - col);
              const excess = Math.max(0, col - amt);
              const st = rowStatus(r);
              return (
                <tr key={r.key} className={`border-t ${dirty[r.key] ? 'bg-yellow-50/40' : ''}`}>
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.reg_no || '—'}</td>
                  <td className="p-3">{r.game_name}</td>
                  <td className="p-3 font-medium">₹{amt.toLocaleString()}</td>
                  <td className="p-3">
                    {editing ? (
                      <>
                        <Input type="number" min="0" className="w-24 h-8" value={r.collected}
                          onChange={e => updateRow(r.key, { collected: Number(e.target.value) || 0 })} />
                        {excess > 0 && <p className="text-xs text-accent mt-1">+₹{excess} excess</p>}
                      </>
                    ) : `₹${col.toLocaleString()}`}
                  </td>
                  <td className="p-3 font-medium">₹{due.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls(st)}`}>{st}</span>
                  </td>
                  <td className="p-3">
                    {editing ? (
                      <Select value={r.mode || 'none'}
                        onValueChange={v => updateRow(r.key, { mode: v === 'none' ? '' : v })}>
                        <SelectTrigger className="w-28 h-8"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (r.mode || '-')}
                  </td>
                  <td className="p-3">
                    {editing ? (
                      <Input className="w-40 h-8" value={r.notes || ''}
                        onChange={e => updateRow(r.key, { notes: e.target.value })}
                        placeholder="Optional note" />
                    ) : (r.notes || '-')}
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No students found</td></tr>
            )}
            {loading && (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving || dirtyCount === 0}>
            {saving ? 'Saving...' : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
          </Button>
          {dirtyCount > 0 && <span className="text-xs text-muted-foreground">Unsaved changes — click Save to apply.</span>}
        </div>
      )}
      </>
      )}
    </div>
  );
};


export default PrincipalDashboard;
