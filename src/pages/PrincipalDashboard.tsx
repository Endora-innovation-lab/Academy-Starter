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
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, GraduationCap, ClipboardList, DollarSign, User,
  Search, UserCheck, Eye,
} from 'lucide-react';
import TeacherProfile from '@/components/profiles/TeacherProfile';
import StudentProfile from '@/components/profiles/StudentProfile';
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
  // Guard: only principals allowed here
  if (checked && teacherRecord && teacherRecord.role !== 'principal') {
    return <Navigate to="/dashboard/teacher" replace />;
  }
  if (checked && !teacherRecord) return <Navigate to="/" replace />;

  return (
    <DashboardLayout
      title="Principal Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userRoleLabel="Principal"
    >
      {activeTab === 'overview' && <OverviewTab instituteId={instituteId} />}
      {activeTab === 'students' && <StudentsTab instituteId={instituteId} />}
      {activeTab === 'teachers' && <TeachersTab instituteId={instituteId} />}
      {activeTab === 'attendance' && <AttendanceTab instituteId={instituteId} userId={user.id} />}
      {activeTab === 'fees' && <FeesTab instituteId={instituteId} />}
      {activeTab === 'profile' && teacherRecord && <TeacherProfile teacherId={teacherRecord.id} />}
    </DashboardLayout>
  );
};

// ============= OVERVIEW =============
const OverviewTab = ({ instituteId }: { instituteId: string }) => {
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);
  const [stats, setStats] = useState({
    students: 0, teachers: 0, batches: 0, games: 0,
    presentStudents: 0, absentStudents: 0,
    presentTeachers: 0, absentTeachers: 0,
    paidFees: 0, partialFees: 0, unpaidFees: 0,
  });

  useEffect(() => {
    (async () => {
      const [s, t, b, g, att, tatt, f] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).neq('status', 'inactive'),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        supabase.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        supabase.from('games').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        supabase.from('attendance').select('status,student_id').eq('institute_id', instituteId).eq('date', today),
        supabase.from('teacher_attendance').select('status,teacher_id').eq('institute_id', instituteId).eq('date', today),
        supabase.from('fees').select('status').eq('institute_id', instituteId).eq('month', month),
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
        paidFees: paid,
        partialFees: partial,
        unpaidFees: unpaid,
      });
    })();
  }, [instituteId, today, month]);

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
        <p className="text-sm text-muted-foreground">Today: {today} · Fee month: {month}</p>
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
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Today's Attendance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Present Students" value={stats.presentStudents} color="text-accent" />
          <Stat label="Absent Students" value={stats.absentStudents} color="text-destructive" />
          <Stat label="Present Teachers" value={stats.presentTeachers} color="text-accent" />
          <Stat label="Absent Teachers" value={stats.absentTeachers} color="text-destructive" />
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('students')
        .select('id, reg_no, status, parent_phone, gender, profiles!students_user_id_profiles_fkey(name, email)')
        .eq('institute_id', instituteId)
        .order('reg_no');
      setRows(data || []);
    })();
  }, [instituteId]);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter !== 'all' && (r.status || 'active') !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (r.profiles as any)?.name?.toLowerCase() || '';
    return name.includes(q) || (r.reg_no || '').toLowerCase().includes(q);
  }), [rows, search, statusFilter]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, {
    name: (r: any) => (r.profiles as any)?.name || '',
    reg_no: (r: any) => r.reg_no || '',
    status: (r: any) => r.status || 'active',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Students</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Search name / reg no" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="reg_no" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Reg No</SortableTH>
              <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
              <th className="text-left p-3 font-medium">Contact</th>
              <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
              <th className="text-left p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const phone = r.parent_phone;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{r.reg_no}</td>
                  <td className="p-3">{(r.profiles as any)?.name || '—'}</td>
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
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No students found</td></tr>
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
const TeachersTab = ({ instituteId }: { instituteId: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('teachers')
        .select('id, teacher_id, role, status, phone, profiles!teachers_user_id_profiles_fkey(name, email)')
        .eq('institute_id', instituteId)
        .order('teacher_id');
      setRows(data || []);
    })();
  }, [instituteId]);

  const filtered = useMemo(() => rows.filter(r => {
    if (roleFilter !== 'all' && (r.role || 'teacher') !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return ((r.profiles as any)?.name?.toLowerCase() || '').includes(q)
      || (r.teacher_id || '').toLowerCase().includes(q);
  }), [rows, search, roleFilter]);

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
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="principal">Principal</SelectItem>
            </SelectContent>
          </Select>
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
              <th className="text-left p-3 font-medium">Status</th>
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
                <td className="p-3"><Badge variant={r.status === 'inactive' ? 'secondary' : 'default'}>{r.status || 'active'}</Badge></td>
                <td className="p-3">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No teachers found</td></tr>
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

const AttendanceTab = ({ instituteId, userId }: { instituteId: string; userId: string }) => {
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
        : <TeacherAttendancePanel instituteId={instituteId} userId={userId} />}
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
    const studs = (data || []).filter((s: any) => (s.students as any)?.status !== 'inactive');
    setStudents(studs);

    const ids = studs.map(s => s.student_id);
    const map: Record<string, string> = {};
    const existing: Record<string, boolean> = {};
    if (ids.length > 0) {
      const { data: att } = await supabase.from('attendance')
        .select('student_id,status').in('student_id', ids).eq('batch_id', selectedBatch).eq('date', date);
      att?.forEach(a => { map[a.student_id] = a.status; existing[a.student_id] = true; });
    }
    ids.forEach(id => { if (!map[id]) map[id] = 'absent'; });
    setAttendanceMap(map);
    setExistingIds(existing);
    setTouched({});
    setHasLoaded(true);
  };

  useEffect(() => { setHasLoaded(false); load(); }, [selectedBatch, date]);

  const toggle = (sid: string) => {
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
  };

  const filtered = search
    ? students.filter(s => ((s.students as any)?.profiles?.name?.toLowerCase() || '').includes(search.toLowerCase()))
    : students;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
        {students.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
      </div>

      {hasLoaded && filtered.length > 0 && (
        <>
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
                        <StatusBadge status={attendanceMap[s.student_id] || 'absent'} onClick={() => toggle(s.student_id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button onClick={save}>Save Attendance</Button>
        </>
      )}
      {hasLoaded && filtered.length === 0 && selectedBatch && (
        <p className="text-muted-foreground text-center py-8">No students in this batch</p>
      )}
    </div>
  );
};

const TeacherAttendancePanel = ({ instituteId, userId }: { instituteId: string; userId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [attMap, setAttMap] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [existingIds, setExistingIds] = useState<Record<string, boolean>>({});
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('batches').select('id,name').eq('institute_id', instituteId).order('name');
      setBatches(data || []);
    })();
  }, [instituteId]);

  const load = async () => {
    if (!selectedBatch) return;
    const { data: btData } = await supabase
      .from('batch_teachers')
      .select('teacher_id, teachers(id, teacher_id, status, phone, profiles!teachers_user_id_profiles_fkey(name))')
      .eq('batch_id', selectedBatch);
    const ts = (btData || []).filter((r: any) => (r.teachers as any)?.status !== 'inactive');
    setTeachers(ts);

    const ids = ts.map(r => r.teacher_id);
    const map: Record<string, string> = {};
    const existing: Record<string, boolean> = {};
    if (ids.length > 0) {
      const { data: att } = await supabase.from('teacher_attendance')
        .select('teacher_id,status').in('teacher_id', ids).eq('batch_id', selectedBatch).eq('date', date);
      att?.forEach(a => { map[a.teacher_id] = a.status; existing[a.teacher_id] = true; });
    }
    ids.forEach(id => { if (!map[id]) map[id] = 'absent'; });
    setAttMap(map);
    setExistingIds(existing);
    setTouched({});
    setHasLoaded(true);
  };

  useEffect(() => { setHasLoaded(false); load(); }, [selectedBatch, date]);

  const toggle = (tid: string) => {
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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
      </div>

      {hasLoaded && teachers.length > 0 && (
        <>
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
                      <td className="p-3">{T?.profiles?.name}</td>
                      <td className="p-3">{T?.phone ? <a href={`tel:${T.phone}`} className="text-primary hover:underline">{T.phone}</a> : '-'}</td>
                      <td className="p-3">
                        <StatusBadge status={attMap[t.teacher_id] || 'absent'} onClick={() => toggle(t.teacher_id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button onClick={save}>Save Attendance</Button>
        </>
      )}
      {hasLoaded && teachers.length === 0 && selectedBatch && (
        <p className="text-muted-foreground text-center py-8">No teachers assigned to this batch</p>
      )}
    </div>
  );
};

// ============= FEES (view-only) =============
const FeesTab = ({ instituteId }: { instituteId: string }) => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('fees')
        .select('id, student_id, month, amount, collected_amount, status, payment_mode, notes, games(name), students(reg_no, profiles!students_user_id_profiles_fkey(name))')
        .eq('institute_id', instituteId)
        .eq('month', month)
        .order('created_at', { ascending: false });
      setRows(data || []);
    })();
  }, [instituteId, month]);

  const filtered = rows.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const n = (r.students as any)?.profiles?.name?.toLowerCase() || '';
    const reg = (r.students as any)?.reg_no?.toLowerCase() || '';
    return n.includes(q) || reg.includes(q);
  });

  const totals = filtered.reduce((a, r) => ({
    paid: a.paid + (r.status === 'paid' ? 1 : 0),
    partial: a.partial + (r.status === 'partial' ? 1 : 0),
    unpaid: a.unpaid + (r.status === 'unpaid' ? 1 : 0),
    collected: a.collected + Number(r.collected_amount || 0),
    billed: a.billed + Number(r.amount || 0),
  }), { paid: 0, partial: 0, unpaid: 0, collected: 0, billed: 0 });

  const statusCls = (s: string) => s === 'paid' ? 'bg-accent/10 text-accent'
    : s === 'partial' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-destructive/10 text-destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fees</h2>
        <div className="flex gap-2 flex-wrap">
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
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Paid</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-accent">{totals.paid}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Partial</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-yellow-600">{totals.partial}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Unpaid</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-destructive">{totals.unpaid}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Collected</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">₹{totals.collected}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Billed</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">₹{totals.billed}</div></CardContent></Card>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Game</th>
              <th className="text-left p-3 font-medium">Amount</th>
              <th className="text-left p-3 font-medium">Collected</th>
              <th className="text-left p-3 font-medium">Mode</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const stu = r.students as any;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{stu?.reg_no || '—'}</td>
                  <td className="p-3">{stu?.profiles?.name || '—'}</td>
                  <td className="p-3">{(r.games as any)?.name || '—'}</td>
                  <td className="p-3">₹{Number(r.amount || 0)}</td>
                  <td className="p-3">₹{Number(r.collected_amount || 0)}</td>
                  <td className="p-3">{r.payment_mode || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls(r.status)}`}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No fee records</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground italic">Read-only view. Fee amounts and structure can only be changed by the institute admin.</p>
    </div>
  );
};

export default PrincipalDashboard;
