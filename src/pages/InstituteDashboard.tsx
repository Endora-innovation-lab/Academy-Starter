import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, BookOpen, ClipboardList, DollarSign, Layers, Search, BarChart3, AlertTriangle, LayoutDashboard, GraduationCap, User } from 'lucide-react';
import InstituteProfile from '@/components/profiles/InstituteProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableTH, useSort } from '@/components/SortableTable';
import { AttendanceRangeTable, FeesRangeTable } from '@/components/RangeMatrix';

import {
  fetchInstituteIdSettings, InstituteIdSettings,
  nextTeacherId, isTeacherIdTaken,
  nextStudentRegNo, isStudentRegNoTaken,
  nextBatchId, isBatchIdTaken,
  nextGameId, isGameIdTaken,
} from '@/lib/idGenerator';

const InstituteDashboard = () => {
  const { user, instituteId, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasBatches, setHasBatches] = useState<boolean | null>(null);

  useEffect(() => {
    if (!instituteId) return;
    const check = async () => {
      const { count } = await supabase.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId);
      setHasBatches((count || 0) > 0);
    };
    check();
  }, [instituteId, activeTab]);

  const tabs = [
    { label: 'Overview', value: 'overview', icon: LayoutDashboard },
    { label: 'Games', value: 'games', icon: BookOpen },
    { label: 'Batches', value: 'batches', icon: Layers },
    { label: 'Students', value: 'students', icon: GraduationCap },
    { label: 'Teachers', value: 'teachers', icon: Users },
    { label: 'Attendance', value: 'attendance', icon: ClipboardList },
    { label: 'Fees', value: 'fees', icon: DollarSign },
    { label: 'Profile', value: 'profile', icon: User },
  ];

  if (loading || (user && !instituteId)) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</div>;
  }

  if (!user || !instituteId) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout title="Institute Dashboard" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <OverviewTab instituteId={instituteId} />}
      {activeTab === 'games' && <GamesTab instituteId={instituteId} />}
      {activeTab === 'batches' && <BatchesTab instituteId={instituteId} />}
      {activeTab === 'students' && <StudentsTab instituteId={instituteId} hasBatches={hasBatches} />}
      {activeTab === 'teachers' && <TeachersTab instituteId={instituteId} hasBatches={hasBatches} />}
      {activeTab === 'attendance' && <AttendanceTab instituteId={instituteId} />}
      {activeTab === 'fees' && <FeesTab instituteId={instituteId} />}
      {activeTab === 'profile' && <InstituteProfile instituteId={instituteId} />}
    </DashboardLayout>
  );
};

// ============= NO BATCH WARNING =============
const NoBatchWarning = ({ onGoToBatches }: { onGoToBatches?: () => void }) => (
  <Card className="border-destructive/50 bg-destructive/5">
    <CardContent className="pt-6 text-center space-y-3">
      <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
      <p className="font-semibold text-destructive">Please create a batch first</p>
      <p className="text-sm text-muted-foreground">You must create at least one batch before adding students or teachers.</p>
      {onGoToBatches && <Button variant="outline" onClick={onGoToBatches}>Go to Batches</Button>}
    </CardContent>
  </Card>
);

// ============= OVERVIEW TAB =============
const OverviewTab = ({ instituteId }: { instituteId: string }) => {
  const [stats, setStats] = useState({
    present: 0, absent: 0, late: 0,
    paid: 0, partial: 0, unpaid: 0,
    students: 0, activeStudents: 0, inactiveStudents: 0,
    teachers: 0, batchesCount: 0, gamesCount: 0,
    classes: 0, totalCollected: 0, totalPending: 0,
    teacherTotal: 0, teacherPresent: 0, teacherAbsent: 0, teacherLate: 0,
  });
  const [batches, setBatches] = useState<any[]>([]);
  const [classList, setClassList] = useState<{ key: string; name: string; date: string }[]>([]);
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterType, setFilterType] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));

  useEffect(() => {
    const fetchBatches = async () => {
      const { data } = await supabase.from('batches').select('id, name').eq('institute_id', instituteId);
      setBatches(data || []);
    };
    fetchBatches();
  }, [instituteId]);

  useEffect(() => {
    const fetchStats = async () => {
      let firstDay: string, lastDay: string, feeMonth: string;

      if (filterType === 'daily') {
        firstDay = filterDate;
        lastDay = filterDate;
        feeMonth = filterDate.substring(0, 7);
      } else if (filterType === 'monthly') {
        firstDay = `${filterMonth}-01`;
        const [year, month] = filterMonth.split('-').map(Number);
        lastDay = new Date(year, month, 0).toISOString().split('T')[0];
        feeMonth = filterMonth;
      } else {
        firstDay = `${filterYear}-01-01`;
        lastDay = `${filterYear}-12-31`;
        feeMonth = '';
      }

      let attQuery = supabase.from('attendance').select('status').eq('institute_id', instituteId).gte('date', firstDay).lte('date', lastDay);
      let feeQuery = supabase.from('fees').select('status, amount, collected_amount').eq('institute_id', instituteId);
      if (filterType === 'yearly') {
        feeQuery = feeQuery.gte('month', `${filterYear}-01`).lte('month', `${filterYear}-12`);
      } else {
        feeQuery = feeQuery.eq('month', feeMonth);
      }
      let teaAttQuery = supabase.from('teacher_attendance').select('status').eq('institute_id', instituteId).gte('date', firstDay).lte('date', lastDay);
      let classesQuery = supabase.from('attendance').select('date, batch_id').eq('institute_id', instituteId).gte('date', firstDay).lte('date', lastDay);

      let studentCount = 0;
      let teacherCount = 0;
      let activeStudents = 0;
      let inactiveStudents = 0;

      if (filterBatch !== 'all') {
        attQuery = attQuery.eq('batch_id', filterBatch);
        teaAttQuery = teaAttQuery.eq('batch_id', filterBatch);
        classesQuery = classesQuery.eq('batch_id', filterBatch);
        const [{ data: batchStudents }, { data: batchTeachers }] = await Promise.all([
          supabase.from('batch_students').select('student_id').eq('batch_id', filterBatch),
          supabase.from('batch_teachers').select('teacher_id').eq('batch_id', filterBatch),
        ]);
        const studentIds = batchStudents?.map(bs => bs.student_id) || [];
        studentCount = studentIds.length;
        teacherCount = batchTeachers?.length || 0;
        if (studentIds.length > 0) {
          feeQuery = feeQuery.in('student_id', studentIds);
          const { count: activeC } = await supabase.from('students').select('id', { count: 'exact', head: true }).in('id', studentIds).eq('status', 'active');
          const { count: inactiveC } = await supabase.from('students').select('id', { count: 'exact', head: true }).in('id', studentIds).eq('status', 'inactive');
          activeStudents = activeC || 0;
          inactiveStudents = inactiveC || 0;
        } else {
          feeQuery = feeQuery.eq('student_id', '00000000-0000-0000-0000-000000000000');
        }
      } else {
        const [stuRes, teaRes, activeStuRes, inactiveStuRes] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
          supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).eq('status', 'active'),
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId).eq('status', 'inactive'),
        ]);
        studentCount = stuRes.count || 0;
        teacherCount = teaRes.count || 0;
        activeStudents = activeStuRes.count || 0;
        inactiveStudents = inactiveStuRes.count || 0;
      }

      const [batchCntRes, gameCntRes, attRes, feeRes, teaAttRes, classesRes] = await Promise.all([
        supabase.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        supabase.from('games').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        attQuery, feeQuery, teaAttQuery, classesQuery,
      ]);

      const attData = attRes.data || [];
      const feeData = feeRes.data || [];
      const teaAttData = teaAttRes.data || [];
      const classesData = classesRes.data || [];
      const classesSet = new Set(classesData.map((c: any) => `${c.date}__${c.batch_id}`));
      setClassList(
        Array.from(classesSet)
          .map((k) => {
            const [d, bid] = (k as string).split('__');
            return { key: k as string, date: d, name: bid };
          })
          .sort((a, b) => (a.date < b.date ? 1 : -1))
      );

      const paidFees = feeData.filter(f => f.status === 'paid');
      const partialFees = feeData.filter(f => f.status === 'partial');
      const unpaidFees = feeData.filter(f => f.status === 'unpaid');
      const totalBilled = feeData.reduce((s, f: any) => s + (Number(f.amount) || 0), 0);
      const totalCollected = feeData.reduce((s, f: any) => s + (Number(f.collected_amount) || 0), 0);

      setStats({
        present: attData.filter(a => a.status === 'present').length,
        absent: attData.filter(a => a.status === 'absent').length,
        late: attData.filter(a => a.status === 'late').length,
        paid: paidFees.length,
        partial: partialFees.length,
        unpaid: unpaidFees.length,
        students: studentCount,
        activeStudents,
        inactiveStudents,
        teachers: teacherCount,
        batchesCount: batchCntRes.count || 0,
        gamesCount: gameCntRes.count || 0,
        classes: classesSet.size,
        totalCollected,
        totalPending: Math.max(0, totalBilled - totalCollected),
        teacherTotal: teacherCount,
        teacherPresent: teaAttData.filter(a => a.status === 'present').length,
        teacherAbsent: teaAttData.filter(a => a.status === 'absent').length,
        teacherLate: teaAttData.filter(a => a.status === 'late').length,
      });
    };
    fetchStats();
  }, [instituteId, filterBatch, filterType, filterDate, filterMonth, filterYear]);

  const getFilterLabel = () => {
    if (filterType === 'daily') return new Date(filterDate).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' });
    if (filterType === 'monthly') {
      const [year, month] = filterMonth.split('-').map(Number);
      return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return filterYear;
  };

  const Stat = ({ label, value, color = '' }: { label: string; value: number | string; color?: string }) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Institute Overview</h2>
          <p className="text-sm text-muted-foreground">{filterType === 'daily' ? 'Daily' : filterType === 'monthly' ? 'Monthly' : 'Yearly'} view — {getFilterLabel()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v: 'daily' | 'monthly' | 'yearly') => setFilterType(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
            </SelectContent>
          </Select>
          {filterType === 'daily' && <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44" />}
          {filterType === 'monthly' && <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-48" />}
          {filterType === 'yearly' && <Input type="number" min="2020" max="2099" value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-28" />}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Institute</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat label="Total Students" value={stats.students} />
          <Stat label="Active / Inactive" value={`${stats.activeStudents} / ${stats.inactiveStudents}`} />
          <Stat label="Total Teachers" value={stats.teachers} />
          <Stat label="Total Batches" value={stats.batchesCount} />
          <Stat label="Total Games" value={stats.gamesCount} />
        </div>
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attendance</h3>
          <Card className="w-56 shrink-0">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Classes Conducted</span>
                <span className="text-base font-bold text-foreground">{stats.classes}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-24 overflow-y-auto overscroll-contain space-y-1 pr-1">
                {classList.length === 0 && <p className="text-xs text-muted-foreground">No classes conducted</p>}
                {classList.map((c) => (
                  <div key={c.key} className="text-xs flex items-center justify-between gap-2">
                    <span className="truncate">{batches.find(b => b.id === c.name)?.name || 'Batch'}</span>
                    <span className="text-muted-foreground shrink-0">{new Date(c.date).toLocaleDateString('default', { day: '2-digit', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total Students" value={stats.students} />
          <Stat label="Present" value={stats.present} color="text-accent" />
          <Stat label="Late" value={stats.late} color="text-yellow-600" />
          <Stat label="Absent" value={stats.absent} color="text-destructive" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="Total Teachers" value={stats.teacherTotal} />
          <Stat label="Teachers Present" value={stats.teacherPresent} color="text-accent" />
          <Stat label="Teachers Late" value={stats.teacherLate} color="text-yellow-600" />
          <Stat label="Teachers Absent" value={stats.teacherAbsent} color="text-destructive" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Fees</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat label="Paid" value={stats.paid} color="text-accent" />
          <Stat label="Partial" value={stats.partial} color="text-yellow-600" />
          <Stat label="Unpaid" value={stats.unpaid} color="text-destructive" />
          <Stat label="Total Collected" value={`₹${stats.totalCollected.toLocaleString()}`} color="text-accent" />
          <Stat label="Total Pending" value={`₹${stats.totalPending.toLocaleString()}`} color="text-destructive" />
        </div>
      </div>
    </div>
  );
};

// ============= STUDENTS TAB =============
const StudentsTab = ({ instituteId, hasBatches }: { instituteId: string; hasBatches: boolean | null }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [studentGames, setStudentGames] = useState<any[]>([]); // all rows for institute
  const [filterBatch, setFilterBatch] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [dob, setDob] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [gender, setGender] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [settings, setSettings] = useState<InstituteIdSettings | null>(null);

  // Add-student flow: choose game first, monthly fee, then optional batch (filtered by game)
  const [addGameId, setAddGameId] = useState('');
  const [addMonthlyFee, setAddMonthlyFee] = useState('');
  const [addBatchId, setAddBatchId] = useState('');

  // Manage Games dialog
  const [showGames, setShowGames] = useState<any>(null); // student
  const [newGameId, setNewGameId] = useState('');
  const [newGameFee, setNewGameFee] = useState('');

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    const [stuRes, batchRes, gameRes, sgRes] = await Promise.all([
      supabase.from('students').select('*, profiles!students_user_id_profiles_fkey(name, email)').eq('institute_id', instituteId),
      supabase.from('batches').select('*').eq('institute_id', instituteId),
      supabase.from('games').select('*').eq('institute_id', instituteId).order('name'),
      supabase.from('student_games').select('*').eq('institute_id', instituteId),
    ]);
    setStudents(stuRes.data || []);
    setBatches(batchRes.data || []);
    setGames(gameRes.data || []);
    setStudentGames(sgRes.data || []);
    const batchIds = (batchRes.data || []).map(b => b.id);
    if (batchIds.length > 0) {
      const { data: bsData } = await supabase.from('batch_students').select('batch_id, student_id').in('batch_id', batchIds);
      setBatchStudents(bsData || []);
    } else {
      setBatchStudents([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [instituteId]);
  useEffect(() => { fetchInstituteIdSettings(instituteId).then(setSettings); }, [instituteId]);

  // Auto-fill Reg No when opening add dialog
  useEffect(() => {
    if (!showAdd || !settings) return;
    if (settings.auto_student_id) {
      nextStudentRegNo(instituteId).then(setRegNo);
    } else {
      setRegNo('');
    }
  }, [showAdd, settings, instituteId]);

  const filteredByBatch = filterBatch === 'all'
    ? students
    : students.filter(s => batchStudents.some(bs => bs.batch_id === filterBatch && bs.student_id === s.id));

  const filteredStudents = searchTerm
    ? filteredByBatch.filter(s => {
        const sName = (s.profiles as any)?.name?.toLowerCase() || '';
        const sReg = s.reg_no?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return sName.includes(term) || sReg.includes(term);
      })
    : filteredByBatch;

  const { sorted: displayStudents, sortKey, sortDir, toggle } = useSort(filteredStudents, {
    name: (s: any) => (s.profiles as any)?.name || '',
    reg_no: (s: any) => s.reg_no || '',
    dob: (s: any) => s.dob || '',
    parent_phone: (s: any) => s.parent_phone || '',
    status: (s: any) => s.status || '',
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addGameId) { toast.error('Select a game/course'); return; }
    try {
      // Manual mode: validate uniqueness before creating the student
      if (settings && !settings.auto_student_id) {
        if (!regNo.trim()) { toast.error('Registration Number is required'); return; }
        const taken = await isStudentRegNoTaken(instituteId, regNo.trim());
        if (taken) { toast.error('Registration Number already exists in this institute'); return; }
      }
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          action: 'create_student',
          name, reg_no: regNo, dob, parent_phone: parentPhone,
          parent_name: parentName, gender, emergency_contact: emergencyContact,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const studentId = data.student?.id;
      // Enroll into game
      if (studentId) {
        await supabase.from('student_games').insert({
          student_id: studentId,
          game_id: addGameId,
          institute_id: instituteId,
          monthly_fee: Number(addMonthlyFee) || 0,
          status: 'active',
        });
        if (addBatchId) {
          await supabase.from('batch_students').insert({ batch_id: addBatchId, student_id: studentId });
        }
      }
      setCreatedCreds(data.credentials);
      toast.success('Student added!');
      setShowAdd(false);
      setName(''); setRegNo(''); setDob(''); setParentPhone('');
      setParentName(''); setGender(''); setEmergencyContact('');
      setAddGameId(''); setAddMonthlyFee(''); setAddBatchId('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = (studentId: string) => {
    setDeleteStudentId(studentId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteStudentId) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'delete_student', student_id: deleteStudentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Student deleted');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete student');
    } finally {
      setShowDeleteDialog(false);
      setDeleteStudentId(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.functions.invoke('admin-operations', {
        body: {
          action: 'update_student',
          student_id: editStudent.id,
          name, dob,
          parent_phone: parentPhone,
          parent_name: parentName,
          gender,
          emergency_contact: emergencyContact,
          reg_no: regNo || undefined,
          status,
        },
      });
      toast.success('Student updated. Login credentials synced.');
      setShowEdit(false);
      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async (s: any) => {
    const next = s.status === 'inactive' ? 'active' : 'inactive';
    try {
      await supabase.functions.invoke('admin-operations', {
        body: { action: 'update_student', student_id: s.id, status: next },
      });
      toast.success(`Student marked ${next}`);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addGameToStudent = async () => {
    if (!showGames || !newGameId) { toast.error('Pick a game'); return; }
    const exists = studentGames.find(sg => sg.student_id === showGames.id && sg.game_id === newGameId);
    if (exists) { toast.error('Student already enrolled in this game'); return; }
    const { error } = await supabase.from('student_games').insert({
      student_id: showGames.id, game_id: newGameId,
      institute_id: instituteId, monthly_fee: Number(newGameFee) || 0,
      status: 'active',
    });
    if (error) { toast.error(error.message); return; }
    setNewGameId(''); setNewGameFee('');
    toast.success('Game added');
    fetchStudents();
  };

  const updateStudentGame = async (sgId: string, patch: any) => {
    const { error } = await supabase.from('student_games').update(patch).eq('id', sgId);
    if (error) { toast.error(error.message); return; }
    fetchStudents();
  };

  const removeStudentGame = async (sgId: string) => {
    if (!confirm('Remove this game enrollment? Fee history is preserved.')) return;
    const { error } = await supabase.from('student_games').delete().eq('id', sgId);
    if (error) { toast.error(error.message); return; }
    toast.success('Removed');
    fetchStudents();
  };

  const batchesForGame = (gameId: string) => batches.filter(b => b.game_id === gameId);
  const studentGamesFor = (sid: string) => studentGames.filter(sg => sg.student_id === sid);

  if (hasBatches === false) {
    return <NoBatchWarning />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Students</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search name or reg no..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div>
                  <Label>Registration Number {settings?.auto_student_id && <span className="text-xs text-muted-foreground">(auto-generated)</span>}</Label>
                  <Input
                    value={regNo}
                    onChange={e => setRegNo(e.target.value)}
                    required
                    readOnly={settings?.auto_student_id}
                    className={settings?.auto_student_id ? 'bg-muted' : ''}
                    placeholder={settings?.auto_student_id ? '' : 'e.g. STU0001'}
                  />
                </div>
                <div><Label>DOB (dd-mm-yyyy)</Label><Input value={dob} onChange={e => setDob(e.target.value)} required placeholder="dd-mm-yyyy" /></div>
                <div><Label>Parent / Guardian Name</Label><Input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Full name" /></div>
                <div><Label>Parent Mobile Number</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></div>
                <div><Label>Emergency Contact Number</Label><Input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} /></div>
                <div>
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Game / Course *</Label>
                  <Select value={addGameId} onValueChange={(v) => { setAddGameId(v); setAddBatchId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select a game/course" /></SelectTrigger>
                    <SelectContent>
                      {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {games.length === 0 && <p className="text-xs text-destructive mt-1">Create a game/course first.</p>}
                </div>
                <div>
                  <Label>Monthly Fee for this Game (₹)</Label>
                  <Input type="number" min="0" value={addMonthlyFee} onChange={e => setAddMonthlyFee(e.target.value)} placeholder="e.g. 1500" />
                </div>
                {addGameId && (
                  <div>
                    <Label>Batch (optional, filtered by selected game)</Label>
                    <Select value={addBatchId} onValueChange={setAddBatchId}>
                      <SelectTrigger><SelectValue placeholder="Select a batch" /></SelectTrigger>
                      <SelectContent>
                        {batchesForGame(addGameId).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {batchesForGame(addGameId).length === 0 && <p className="text-xs text-muted-foreground mt-1">No batches exist for this game yet.</p>}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={!addGameId}>Add Student</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {createdCreds && (
        <Card className="border-accent bg-accent/5">
          <CardContent className="pt-4">
            <p className="font-semibold text-accent">Login Credentials Created:</p>
            <p className="text-sm">Username: <strong>{createdCreds.username}</strong></p>
            <p className="text-sm">Password: <strong>{createdCreds.password}</strong></p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setCreatedCreds(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
              <SortableTH sortKey="reg_no" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Reg No</SortableTH>
              <SortableTH sortKey="dob" currentKey={sortKey} dir={sortDir} onToggle={toggle}>DOB</SortableTH>
              <SortableTH sortKey="parent_phone" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Parent Phone</SortableTH>
              <th className="text-left p-3 font-medium">Games</th>
              <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayStudents.map((s, index) => {
              const sgs = studentGamesFor(s.id);
              return (
                <tr key={s.id} className={`border-t ${s.status === 'inactive' ? 'opacity-60' : ''}`}>
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{(s.profiles as any)?.name || 'N/A'}</td>
                  <td className="p-3">{s.reg_no}</td>
                  <td className="p-3">{s.dob}</td>
                  <td className="p-3">{s.parent_phone || '-'}</td>
                  <td className="p-3 text-xs">
                    {sgs.length === 0 ? <span className="text-muted-foreground">—</span> :
                      sgs.map(sg => {
                        const g = games.find(g => g.id === sg.game_id);
                        return (
                          <span key={sg.id} className={`inline-block mr-1 mb-1 px-2 py-0.5 rounded ${sg.status === 'active' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                            {g?.name || '?'}
                          </span>
                        );
                      })}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleStatus(s)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'inactive' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}
                    >
                      {s.status === 'inactive' ? 'Inactive' : 'Active'}
                    </button>
                  </td>
                  <td className="p-3 flex gap-1">
                    <Button size="sm" variant="ghost" title="Manage games" onClick={() => { setShowGames(s); setNewGameId(''); setNewGameFee(''); }}>
                      <BookOpen className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditStudent(s);
                      setName((s.profiles as any)?.name || '');
                      setRegNo(s.reg_no || '');
                      setDob(s.dob);
                      setParentPhone(s.parent_phone || '');
                      setParentName(s.parent_name || '');
                      setGender(s.gender || '');
                      setEmergencyContact(s.emergency_contact || '');
                      setStatus((s.status === 'inactive' ? 'inactive' : 'active') as any);
                      setShowEdit(true);
                    }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {displayStudents.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md max-h-[75vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div>
              <Label>Registration Number</Label>
              <Input value={regNo} onChange={e => setRegNo(e.target.value)} required />
              <p className="text-xs text-muted-foreground mt-1">Used as login username. Changing it updates the student's login automatically.</p>
            </div>
            <div>
              <Label>DOB (dd-mm-yyyy)</Label>
              <Input value={dob} onChange={e => setDob(e.target.value)} required />
              <p className="text-xs text-muted-foreground mt-1">Used as login password. Changing it updates the student's password automatically.</p>
            </div>
            <div><Label>Parent / Guardian Name</Label><Input value={parentName} onChange={e => setParentName(e.target.value)} /></div>
            <div><Label>Parent Mobile Number</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></div>
            <div><Label>Emergency Contact Number</Label><Input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Overall Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showGames} onOpenChange={(o) => { if (!o) setShowGames(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enrolled Games</DialogTitle>
            {showGames && <p className="text-sm text-muted-foreground">{(showGames.profiles as any)?.name} · {showGames.reg_no}</p>}
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {showGames && studentGamesFor(showGames.id).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No games yet.</p>
              )}
              {showGames && studentGamesFor(showGames.id).map(sg => {
                const g = games.find(g => g.id === sg.game_id);
                return (
                  <div key={sg.id} className="flex items-center gap-2 p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{g?.name || '?'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Label className="text-xs">Monthly Fee ₹</Label>
                        <Input
                          type="number" min="0" className="w-24 h-7"
                          defaultValue={sg.monthly_fee}
                          onBlur={(e) => {
                            const v = Number(e.target.value) || 0;
                            if (v !== Number(sg.monthly_fee)) updateStudentGame(sg.id, { monthly_fee: v });
                          }}
                        />
                      </div>
                    </div>
                    <Button size="sm" variant="outline"
                      onClick={() => updateStudentGame(sg.id, { status: sg.status === 'active' ? 'inactive' : 'active' })}>
                      {sg.status === 'active' ? 'Active' : 'Inactive'}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeStudentGame(sg.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-3 space-y-2">
              <p className="text-sm font-medium">Add a game</p>
              <div className="flex gap-2">
                <Select value={newGameId} onValueChange={setNewGameId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pick a game" /></SelectTrigger>
                  <SelectContent>
                    {games
                      .filter(g => showGames && !studentGamesFor(showGames.id).some(sg => sg.game_id === g.id))
                      .map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min="0" placeholder="Monthly ₹" className="w-32" value={newGameFee} onChange={e => setNewGameFee(e.target.value)} />
                <Button onClick={addGameToStudent}>Add</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              Attendance and fee history will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteStudentId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ============= TEACHERS TAB =============
const TeachersTab = ({ instituteId, hasBatches }: { instituteId: string; hasBatches: boolean | null }) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [role, setRole] = useState<'teacher' | 'principal'>('teacher');
  const [teacherIdInput, setTeacherIdInput] = useState('');
  const [tGender, setTGender] = useState('');
  const [tDob, setTDob] = useState('');
  const [tBloodGroup, setTBloodGroup] = useState('');
  const [tEmergency, setTEmergency] = useState('');
  const [settings, setSettings] = useState<InstituteIdSettings | null>(null);

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*, profiles!teachers_user_id_profiles_fkey(name, email)')
      .eq('institute_id', instituteId);
    setTeachers(data || []);
  };

  useEffect(() => {
    fetchTeachers();
    fetchInstituteIdSettings(instituteId).then(setSettings);
  }, [instituteId]);

  // Prefill auto Teacher ID when opening add dialog
  useEffect(() => {
    if (!showAdd || !settings) return;
    if (settings.auto_teacher_id) {
      nextTeacherId(instituteId).then(setTeacherIdInput);
    } else {
      setTeacherIdInput('');
    }
  }, [showAdd, settings, instituteId]);

  const filteredTeachers = searchTerm
    ? teachers.filter(t => {
        const tName = (t.profiles as any)?.name?.toLowerCase() || '';
        const tEmail = (t.profiles as any)?.email?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return tName.includes(term) || tEmail.includes(term);
      })
    : teachers;

  const { sorted: displayTeachers, sortKey, sortDir, toggle } = useSort(filteredTeachers, {
    name: (t: any) => (t.profiles as any)?.name || '',
    email: (t: any) => (t.profiles as any)?.email || '',
    phone: (t: any) => t.phone || '',
    birth_year: (t: any) => Number(t.birth_year) || 0,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'teacher' && !hasBatches) {
      // Non-blocking hint: teacher role requires batch assignment. Batches are assigned after creation.
      toast.info('Remember to assign at least one batch to this teacher.');
    }
    try {
      // Resolve Teacher ID (auto or manual) with per-institute uniqueness
      let finalTeacherId: string | null = null;
      if (settings?.auto_teacher_id) {
        finalTeacherId = await nextTeacherId(instituteId);
      } else if (teacherIdInput.trim()) {
        const taken = await isTeacherIdTaken(instituteId, teacherIdInput.trim());
        if (taken) { toast.error('Teacher ID already exists in this institute'); return; }
        finalTeacherId = teacherIdInput.trim();
      }

      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          action: 'create_teacher',
          name, email, phone,
          birth_year: tDob ? String(new Date(tDob).getFullYear()) : birthYear,
          gender: tGender,
          date_of_birth: tDob,
          blood_group: tBloodGroup.trim().toUpperCase().slice(0, 20),
          emergency_contact: tEmergency,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Patch the created teacher row with role + teacher_id
      if (data?.teacher?.id) {
        const patch: any = { role };
        if (finalTeacherId) patch.teacher_id = finalTeacherId;
        await supabase.from('teachers').update(patch).eq('id', data.teacher.id);
      }

      setCreatedCreds(data.credentials);
      toast.success('Teacher added!');
      setShowAdd(false);
      setName(''); setEmail(''); setPhone(''); setBirthYear('');
      setRole('teacher'); setTeacherIdInput('');
      setTGender(''); setTDob(''); setTBloodGroup(''); setTEmergency('');
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (teacherId: string) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      await supabase.functions.invoke('admin-operations', {
        body: { action: 'delete_teacher', teacher_id: teacherId },
      });
      toast.success('Teacher deleted');
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update Teacher ID (only when manual; auto IDs stay read-only)
      if (settings && !settings.auto_teacher_id && teacherIdInput.trim() !== (editTeacher.teacher_id || '')) {
        if (teacherIdInput.trim()) {
          const taken = await isTeacherIdTaken(instituteId, teacherIdInput.trim(), editTeacher.id);
          if (taken) { toast.error('Teacher ID already exists in this institute'); return; }
        }
      }
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: {
          action: 'update_teacher',
          teacher_id: editTeacher.id,
          name, phone,
          birth_year: tDob ? String(new Date(tDob).getFullYear()) : birthYear,
          email: email || undefined,
          gender: tGender,
          date_of_birth: tDob,
          blood_group: tBloodGroup.trim().toUpperCase().slice(0, 20),
          emergency_contact: tEmergency,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const patch: any = { role };
      if (settings && !settings.auto_teacher_id) patch.teacher_id = teacherIdInput.trim() || null;
      await supabase.from('teachers').update(patch).eq('id', editTeacher.id);

      toast.success('Teacher updated. Login email synced.');
      if (data?.password_updated) {
        toast.success('Default login password has been updated successfully.');
      }

      setShowEdit(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (hasBatches === false) {
    return <NoBatchWarning />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Teachers</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Teacher</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Teacher</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div>
                  <Label>Teacher ID {settings?.auto_teacher_id && <span className="text-xs text-muted-foreground">(auto-generated)</span>}</Label>
                  <Input
                    value={teacherIdInput}
                    onChange={e => setTeacherIdInput(e.target.value)}
                    readOnly={settings?.auto_teacher_id}
                    className={settings?.auto_teacher_id ? 'bg-muted' : ''}
                    placeholder={settings?.auto_teacher_id ? '' : 'e.g. TCH0001'}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v: any) => setRole(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {role === 'principal'
                      ? 'Principals see all batches and can mark attendance; they cannot change settings, games, batches, or fee amounts.'
                      : 'Teachers must be assigned to at least one batch after creation.'}
                  </p>
                </div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div><Label>Mobile Number</Label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
                <div>
                  <Label>Gender</Label>
                  <Select value={tGender} onValueChange={setTGender}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date of Birth</Label><Input type="date" value={tDob} onChange={e => setTDob(e.target.value)} required /></div>
                <div>
                  <Label>Blood Group</Label>
                  <Input
                    list="blood-group-options"
                    value={tBloodGroup}
                    onChange={e => setTBloodGroup(e.target.value.toUpperCase().slice(0, 20))}
                    onBlur={e => setTBloodGroup(e.target.value.trim().toUpperCase().slice(0, 20))}
                    maxLength={20}
                    placeholder="e.g. O+"
                  />
                  <datalist id="blood-group-options">
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-','A1+','A1-','A2+','A2-','A1B+','A1B-','BOMBAY (OH)','RH NULL'].map(bg => <option key={bg} value={bg} />)}
                  </datalist>
                </div>
                <div><Label>Emergency Contact Number</Label><Input value={tEmergency} onChange={e => setTEmergency(e.target.value)} /></div>
                <Button type="submit" className="w-full">Add Teacher</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {createdCreds && (
        <Card className="border-accent bg-accent/5">
          <CardContent className="pt-4">
            <p className="font-semibold text-accent">Login Credentials Created:</p>
            <p className="text-sm">Email: <strong>{createdCreds.email}</strong></p>
            <p className="text-sm">Password: <strong>{createdCreds.password}</strong></p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setCreatedCreds(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
              <th className="text-left p-3 font-medium">Teacher ID</th>
              <th className="text-left p-3 font-medium">Role</th>
              <SortableTH sortKey="email" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Email</SortableTH>
              <SortableTH sortKey="phone" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Phone</SortableTH>
              <SortableTH sortKey="birth_year" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Birth Year</SortableTH>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayTeachers.map((t, index) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{(t.profiles as any)?.name || 'N/A'}</td>
                <td className="p-3 font-mono text-xs">{t.teacher_id || '—'}</td>
                <td className="p-3 capitalize">{t.role || 'teacher'}</td>
                <td className="p-3">{(t.profiles as any)?.email || '-'}</td>
                <td className="p-3">{t.phone}</td>
                <td className="p-3">{t.birth_year}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditTeacher(t);
                    setName((t.profiles as any)?.name || '');
                    setEmail((t.profiles as any)?.email || '');
                    setPhone(t.phone);
                    setBirthYear(t.birth_year);
                    setRole((t.role === 'principal' ? 'principal' : 'teacher'));
                    setTeacherIdInput(t.teacher_id || '');
                    setTGender(t.gender || '');
                    setTDob(t.date_of_birth || '');
                    setTBloodGroup(t.blood_group || '');
                    setTEmergency(t.emergency_contact || '');
                    setShowEdit(true);
                  }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {displayTeachers.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div>
              <Label>Teacher ID {settings?.auto_teacher_id && <span className="text-xs text-muted-foreground">(auto-generated, read-only)</span>}</Label>
              <Input
                value={teacherIdInput}
                onChange={e => setTeacherIdInput(e.target.value)}
                readOnly={settings?.auto_teacher_id}
                className={settings?.auto_teacher_id ? 'bg-muted' : ''}
                placeholder={settings?.auto_teacher_id ? '' : 'e.g. TCH0001'}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              <p className="text-xs text-muted-foreground mt-1">Used as login email. Changing it updates the teacher's login immediately; all batches, attendance, and assignments are preserved.</p>
            </div>
            <div><Label>Mobile Number</Label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
            <div>
              <Label>Gender</Label>
              <Select value={tGender} onValueChange={setTGender}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" value={tDob} onChange={e => setTDob(e.target.value)} required /></div>
            <div>
              <Label>Blood Group</Label>
              <Input
                list="blood-group-options-edit"
                value={tBloodGroup}
                onChange={e => setTBloodGroup(e.target.value.toUpperCase().slice(0, 20))}
                onBlur={e => setTBloodGroup(e.target.value.trim().toUpperCase().slice(0, 20))}
                maxLength={20}
                placeholder="e.g. O+"
              />
              <datalist id="blood-group-options-edit">
                {['A+','A-','B+','B-','AB+','AB-','O+','O-','A1+','A1-','A2+','A2-','A1B+','A1B-','BOMBAY (OH)','RH NULL'].map(bg => <option key={bg} value={bg} />)}
              </datalist>
            </div>
            <div><Label>Emergency Contact Number</Label><Input value={tEmergency} onChange={e => setTEmergency(e.target.value)} /></div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= GAMES TAB =============
const GamesTab = ({ instituteId }: { instituteId: string }) => {
  const [games, setGames] = useState<any[]>([]);
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gameIdInput, setGameIdInput] = useState('');
  const [settings, setSettings] = useState<InstituteIdSettings | null>(null);

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').eq('institute_id', instituteId).order('name');
    setGames(data || []);
    const { data: bData } = await supabase.from('batches').select('game_id').eq('institute_id', instituteId);
    const counts: Record<string, number> = {};
    (bData || []).forEach((b: any) => { if (b.game_id) counts[b.game_id] = (counts[b.game_id] || 0) + 1; });
    setBatchCounts(counts);
  };

  useEffect(() => { fetchGames(); }, [instituteId]);
  useEffect(() => { fetchInstituteIdSettings(instituteId).then(setSettings); }, [instituteId]);

  useEffect(() => {
    if (!showAdd || showEdit || !settings) return;
    if (settings.auto_game_id) nextGameId(instituteId).then(setGameIdInput);
    else setGameIdInput('');
  }, [showAdd, showEdit, settings, instituteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Resolve Game ID
      let finalGameId: string | null = null;
      if (settings?.auto_game_id) {
        finalGameId = showEdit ? (showEdit.game_id || await nextGameId(instituteId)) : await nextGameId(instituteId);
      } else if (gameIdInput.trim()) {
        const taken = await isGameIdTaken(instituteId, gameIdInput.trim(), showEdit?.id);
        if (taken) { toast.error('Game ID already exists in this institute'); return; }
        finalGameId = gameIdInput.trim();
      }

      if (showEdit) {
        await supabase.from('games').update({ name, description, game_id: finalGameId }).eq('id', showEdit.id);
        toast.success('Game updated');
      } else {
        await supabase.from('games').insert({ name, description, institute_id: instituteId, game_id: finalGameId });
        toast.success('Game created');
      }
      setShowAdd(false); setShowEdit(null); setName(''); setDescription(''); setGameIdInput('');
      fetchGames();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (g: any) => {
    if ((batchCounts[g.id] || 0) > 0) { toast.error('Cannot delete: batches are linked to this game'); return; }
    if (!confirm(`Delete "${g.name}"?`)) return;
    const { error } = await supabase.from('games').delete().eq('id', g.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Game deleted');
    fetchGames();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Games / Courses</h2>
        <Dialog open={showAdd || !!showEdit} onOpenChange={(o) => { if (!o) { setShowAdd(false); setShowEdit(null); setName(''); setDescription(''); setGameIdInput(''); } }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setShowAdd(true); setName(''); setDescription(''); setGameIdInput(''); }}><Plus className="h-4 w-4 mr-1" /> Add Game</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{showEdit ? 'Edit' : 'Add'} Game / Course</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Chess, Cricket" /></div>
              {settings?.show_game_id && (
                <div>
                  <Label>Game ID {settings.auto_game_id && <span className="text-xs text-muted-foreground">(auto-generated)</span>}</Label>
                  <Input
                    value={gameIdInput}
                    onChange={e => setGameIdInput(e.target.value)}
                    readOnly={settings.auto_game_id}
                    className={settings.auto_game_id ? 'bg-muted' : ''}
                    placeholder={settings.auto_game_id ? '' : 'e.g. GAM0001'}
                  />
                </div>
              )}
              <div><Label>Description (optional)</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
              <Button type="submit" className="w-full">{showEdit ? 'Update' : 'Create'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">S.No</th>
              <th className="px-3 py-2 text-left">Name</th>
              {settings?.show_game_id && <th className="px-3 py-2 text-left">Game ID</th>}
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Batches</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g, i) => (
              <tr key={g.id} className="border-t">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{g.name}</td>
                {settings?.show_game_id && <td className="px-3 py-2 font-mono text-xs">{g.game_id || '—'}</td>}
                <td className="px-3 py-2 text-muted-foreground">{g.description || '—'}</td>
                <td className="px-3 py-2">{batchCounts[g.id] || 0}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setShowEdit(g); setName(g.name); setDescription(g.description || ''); setGameIdInput(g.game_id || ''); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(g)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr><td colSpan={settings?.show_game_id ? 6 : 5} className="text-center py-8 text-muted-foreground">No games/courses yet. Add one to start creating batches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============= BATCHES TAB =============
const BatchesTab = ({ instituteId }: { instituteId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [batchName, setBatchName] = useState('');
  const [batchGameId, setBatchGameId] = useState<string>('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [enrollRegNo, setEnrollRegNo] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [batchTeachers, setBatchTeachers] = useState<any[]>([]);

  const fetchData = async () => {
    const [batchesRes, teachersRes, studentsRes, gamesRes] = await Promise.all([
      supabase.from('batches').select('*').eq('institute_id', instituteId),
      supabase.from('teachers').select('*, profiles!teachers_user_id_profiles_fkey(name)').eq('institute_id', instituteId),
      supabase.from('students').select('*, profiles!students_user_id_profiles_fkey(name)').eq('institute_id', instituteId),
      supabase.from('games').select('*').eq('institute_id', instituteId).order('name'),
    ]);
    if (batchesRes.error) console.error('[BatchesTab] batches fetch error:', batchesRes.error);
    console.log('[BatchesTab] fetched batches:', batchesRes.data?.length, batchesRes.data);
    const gamesList = gamesRes.data || [];
    const gameMap = Object.fromEntries(gamesList.map((g: any) => [g.id, g]));
    // Backward compat: old batches may have null game_id — keep them visible with games:null
    const merged = (batchesRes.data || []).map((b: any) => ({
      ...b,
      games: b.game_id && gameMap[b.game_id] ? { id: gameMap[b.game_id].id, name: gameMap[b.game_id].name } : null,
    }));
    setBatches(merged);
    setTeachers(teachersRes.data || []);
    setStudents(studentsRes.data || []);
    setGames(gamesList);
  };

  const fetchBatchDetails = async (batchId: string) => {
    const [{ data: bs }, { data: bt }] = await Promise.all([
      supabase.from('batch_students').select('*, students(id, reg_no, profiles!students_user_id_profiles_fkey(name))').eq('batch_id', batchId),
      supabase.from('batch_teachers').select('*, teachers(id, profiles!teachers_user_id_profiles_fkey(name))').eq('batch_id', batchId),
    ]);
    setBatchStudents(bs || []);
    setBatchTeachers(bt || []);
  };

  useEffect(() => { fetchData(); }, [instituteId]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchGameId) { toast.error('Select a game/course'); return; }
    try {
      const { data: newBatch, error } = await supabase.from('batches').insert({
        name: batchName,
        institute_id: instituteId,
        teacher_id: selectedTeachers[0] || null,
        game_id: batchGameId,
      }).select().single();
      if (error) throw error;

      if (selectedTeachers.length > 0 && newBatch) {
        await supabase.from('batch_teachers').insert(
          selectedTeachers.map(tid => ({ batch_id: newBatch.id, teacher_id: tid }))
        );
      }

      toast.success('Batch created');
      setShowAdd(false);
      setBatchName('');
      setBatchGameId('');
      setSelectedTeachers([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('batches').update({ name: batchName, game_id: batchGameId || null }).eq('id', showEdit.id);
      toast.success('Batch updated');
      setShowEdit(null);
      setBatchName('');
      setBatchGameId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Delete this batch? Students will be unassigned.')) return;
    try {
      await supabase.from('batch_students').delete().eq('batch_id', batchId);
      await supabase.from('batch_teachers').delete().eq('batch_id', batchId);
      await supabase.from('batches').delete().eq('id', batchId);
      toast.success('Batch deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEnrollByRegNo = async () => {
    if (!enrollRegNo.trim() || !showAssign) return;
    const student = students.find(s => s.reg_no.toLowerCase() === enrollRegNo.trim().toLowerCase());
    if (!student) { toast.error('Student not found with that Reg Number'); return; }
    if (batchStudents.some(bs => bs.student_id === student.id)) {
      toast.error('Student already enrolled in this batch');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('batch_students')
        .insert({ batch_id: showAssign, student_id: student.id })
        .select()
        .single();
      if (error) throw error;
      setEnrollRegNo('');
      await fetchBatchDetails(showAssign);
      toast.success(`${(student.profiles as any)?.name || student.reg_no} enrolled`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await supabase.from('batch_students').delete().eq('id', data.id);
            if (showAssign) fetchBatchDetails(showAssign);
            toast.message('Enrollment undone');
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll student');
    }
  };

  const handleRemoveFromBatch = async (bsId: string) => {
    const removed = batchStudents.find(bs => bs.id === bsId);
    if (!removed) return;
    if (!confirm('Remove this student from the batch?')) return;
    const { error } = await supabase.from('batch_students').delete().eq('id', bsId);
    if (error) { toast.error(error.message); return; }
    if (showAssign) await fetchBatchDetails(showAssign);
    toast.success('Student removed', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const { error: insErr } = await supabase
            .from('batch_students')
            .insert({ batch_id: removed.batch_id, student_id: removed.student_id });
          if (insErr) { toast.error(insErr.message); return; }
          if (showAssign) fetchBatchDetails(showAssign);
          toast.message('Removal undone');
        },
      },
    });
  };

  const handleAddTeacherToBatch = async (teacherId: string) => {
    if (!showAssign) return;
    if (batchTeachers.some(bt => (bt.teachers as any)?.id === teacherId)) {
      toast.error('Teacher already in this batch');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('batch_teachers')
        .insert({ batch_id: showAssign, teacher_id: teacherId })
        .select()
        .single();
      if (error) throw error;
      await fetchBatchDetails(showAssign);
      toast.success('Teacher added to batch', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await supabase.from('batch_teachers').delete().eq('id', data.id);
            if (showAssign) fetchBatchDetails(showAssign);
            toast.message('Removed teacher');
          },
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add teacher');
    }
  };

  const handleRemoveTeacherFromBatch = async (btId: string) => {
    const removed = batchTeachers.find(bt => bt.id === btId);
    if (!removed) return;
    if (!confirm('Remove this teacher from the batch?')) return;
    const { error } = await supabase.from('batch_teachers').delete().eq('id', btId);
    if (error) { toast.error(error.message); return; }
    if (showAssign) await fetchBatchDetails(showAssign);
    toast.success('Teacher removed', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const { error: insErr } = await supabase
            .from('batch_teachers')
            .insert({ batch_id: removed.batch_id, teacher_id: removed.teacher_id });
          if (insErr) { toast.error(insErr.message); return; }
          if (showAssign) fetchBatchDetails(showAssign);
          toast.message('Removal undone');
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Layers className="h-5 w-5" /> Batches</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Batch</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div><Label>Batch Name</Label><Input value={batchName} onChange={e => setBatchName(e.target.value)} required /></div>
              <div>
                <Label>Game / Course</Label>
                <Select value={batchGameId} onValueChange={setBatchGameId}>
                  <SelectTrigger><SelectValue placeholder="Select a game/course" /></SelectTrigger>
                  <SelectContent>
                    {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {games.length === 0 && <p className="text-xs text-destructive mt-1">Create a game/course first in the Games tab.</p>}
              </div>
              <div>
                <Label>Assign Teachers (select multiple)</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 mt-1">
                  {teachers.filter(t => t.role !== 'principal').map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTeachers(prev => [...prev, t.id]);
                          else setSelectedTeachers(prev => prev.filter(id => id !== t.id));
                        }}
                      />
                      {(t.profiles as any)?.name}
                    </label>
                  ))}
                  {teachers.filter(t => t.role !== 'principal').length === 0 && <p className="text-xs text-muted-foreground">No teachers available yet</p>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Principals aren't assigned to individual batches — they see all institute batches automatically.</p>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {batches.map(b => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    🎯 {(b.games as any)?.name || <span className="italic">Unassigned — edit to link a game/course</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setShowEdit(b); setBatchName(b.name); setBatchGameId(b.game_id || ''); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteBatch(b.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => { setShowAssign(b.id); fetchBatchDetails(b.id); }}>
                Manage
              </Button>
            </CardContent>
          </Card>
        ))}
        {batches.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No batches created</p>}
      </div>

      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Batch</DialogTitle></DialogHeader>
          <form onSubmit={handleEditBatch} className="space-y-3">
            <div><Label>Batch Name</Label><Input value={batchName} onChange={e => setBatchName(e.target.value)} required /></div>
            <div>
              <Label>Game / Course</Label>
              <Select value={batchGameId} onValueChange={setBatchGameId}>
                <SelectTrigger><SelectValue placeholder="Select a game/course" /></SelectTrigger>
                <SelectContent>
                  {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAssign} onOpenChange={(o) => { if (!o) { setShowAssign(null); setShowAddStudent(false); } }}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          {(() => {
            const cur = batches.find((b: any) => b.id === showAssign);
            const gameName = (cur?.games as any)?.name;
            return (
              <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-background">
                <DialogTitle className="text-2xl font-bold">{cur?.name || 'Batch'}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Batch Management{gameName && <> · 🎯 <strong className="text-foreground">{gameName}</strong></>}
                </p>
              </DialogHeader>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 p-6 bg-muted/30 flex-1 min-h-0 overflow-hidden">
            {/* LEFT COLUMN */}
            <div className="space-y-4 overflow-y-auto pr-1 min-h-0">
              {/* Assigned Teacher Card */}
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="bg-gradient-to-b from-primary/10 to-primary/5 p-5 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Teacher</p>
                  <p className="font-semibold text-base mt-1 break-words">
                    {batchTeachers.length === 0
                      ? 'Not assigned'
                      : batchTeachers.map(bt => (bt.teachers as any)?.profiles?.name).filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  <Select onValueChange={handleAddTeacherToBatch}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="+ Change / Add Teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.filter(t => t.role !== 'principal' && !batchTeachers.some(bt => (bt.teachers as any)?.id === t.id)).map(t => (
                        <SelectItem key={t.id} value={t.id}>{(t.profiles as any)?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {batchTeachers.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {batchTeachers.map(bt => (
                        <div key={bt.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/60 text-sm">
                          <span className="truncate">{(bt.teachers as any)?.profiles?.name}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveTeacherFromBatch(bt.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — Enrolled Students */}
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Enrolled Students</h4>
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-md ml-1">
                    {batchStudents.length}
                  </span>
                </div>
                <Button size="sm" onClick={() => { setEnrollRegNo(''); setShowAddStudent(true); }}>
                  + Add Student
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {batchStudents.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-12">No students in this batch</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                        <th className="px-5 py-2.5 font-medium">Student</th>
                        <th className="px-3 py-2.5 font-medium">Reg No</th>
                        <th className="px-3 py-2.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStudents.map((bs, idx) => {
                        const name = (bs.students as any)?.profiles?.name || '—';
                        const reg = (bs.students as any)?.reg_no || '';
                        const initial = name.charAt(0).toUpperCase();
                        return (
                          <tr key={bs.id} className={idx % 2 ? 'bg-muted/30' : ''}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                  {initial}
                                </div>
                                <span className="font-medium">{name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{reg}</td>
                            <td className="px-3 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleRemoveFromBatch(bs.id)}
                                title="Remove from batch"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Student to Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Search by Registration Number</Label>
              <Input
                placeholder="Enter Reg Number"
                value={enrollRegNo}
                onChange={e => setEnrollRegNo(e.target.value)}
                autoFocus
              />
            </div>
            {enrollRegNo.trim() && (() => {
              const q = enrollRegNo.trim().toLowerCase();
              const matches = students.filter(s => s.reg_no.toLowerCase().includes(q)).slice(0, 8);
              if (matches.length === 0) {
                return <div className="text-xs p-2 rounded border border-destructive text-destructive bg-destructive/10">No student found</div>;
              }
              return (
                <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                  {matches.map(s => {
                    const already = batchStudents.some(bs => (bs as any).student_id === s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={already}
                        onClick={() => { setEnrollRegNo(s.reg_no); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between ${already ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span><strong>{(s.profiles as any)?.name}</strong> <span className="text-muted-foreground">({s.reg_no})</span></span>
                        {already && <span className="text-xs text-amber-600">in batch</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddStudent(false)}>Cancel</Button>
              <Button onClick={async () => { await handleEnrollByRegNo(); setShowAddStudent(false); }}>
                + Add to Batch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= ATTENDANCE TAB =============
const AttendanceTab = ({ instituteId }: { instituteId: string }) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<'student' | 'teacher'>('student');
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterType, setFilterType] = useState<'daily' | 'monthly' | 'yearly' | 'range'>('daily');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rangeFrom, setRangeFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));


  useEffect(() => {
    const fetchBatches = async () => {
      const { data } = await supabase.from('batches').select('id, name').eq('institute_id', instituteId);
      setBatches(data || []);
    };
    fetchBatches();
  }, [instituteId]);

  const fetchAttendance = async () => {
    if (filterType === 'range') return;
    let firstDay: string, lastDay: string;



    if (filterType === 'daily') {
      firstDay = filterDate;
      lastDay = filterDate;
    } else if (filterType === 'monthly') {
      firstDay = `${filterMonth}-01`;
      const [year, month] = filterMonth.split('-').map(Number);
      lastDay = new Date(year, month, 0).toISOString().split('T')[0];
    } else {
      firstDay = `${filterYear}-01-01`;
      lastDay = `${filterYear}-12-31`;
    }

    if (filterRole === 'student') {
      let query = supabase
        .from('attendance')
        .select('*, students(reg_no, status, profiles!students_user_id_profiles_fkey(name)), batches(name)')
        .eq('institute_id', instituteId)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false });
      if (filterBatch !== 'all') query = query.eq('batch_id', filterBatch);
      const { data } = await query.limit(500);
      // Hide records belonging to currently inactive students
      const filtered = (data || []).filter((r: any) => (r.students as any)?.status !== 'inactive');

      // Show ONLY attendance actually saved in the database — no synthetic/derived rows
      setAttendance(filtered);

    } else {

      let query = supabase
        .from('teacher_attendance')
        .select('*')
        .eq('institute_id', instituteId)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false });
      if (filterBatch !== 'all') query = query.eq('batch_id', filterBatch);
      const { data, error } = await query.limit(500);
      if (error) console.error('teacher_attendance fetch error', error);
      const records = data || [];
      const teacherIds = Array.from(new Set(records.map((r: any) => r.teacher_id)));
      const batchIds = Array.from(new Set(records.map((r: any) => r.batch_id).filter(Boolean)));
      const nameMap: Record<string, string> = {};
      const phoneMap: Record<string, string> = {};
      const batchMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: tData } = await supabase.from('teachers').select('id, user_id, phone').in('id', teacherIds);
        const userIds = (tData || []).map(t => t.user_id);
        const { data: pData } = userIds.length > 0
          ? await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
          : { data: [] as any[] };
        const userToName: Record<string, string> = {};
        (pData || []).forEach((p: any) => { userToName[p.user_id] = p.name; });
        (tData || []).forEach(t => { nameMap[t.id] = userToName[t.user_id] || '-'; phoneMap[t.id] = t.phone || '-'; });
      }
      if (batchIds.length > 0) {
        const { data: bData } = await supabase.from('batches').select('id, name').in('id', batchIds);
        (bData || []).forEach(b => { batchMap[b.id] = b.name; });
      }
      setAttendance(records.map((r: any) => ({
        ...r,
        _teacherName: nameMap[r.teacher_id] || '-',
        teachers: { phone: phoneMap[r.teacher_id] || '-' },
        batches: { name: batchMap[r.batch_id] || '-' },
      })));
    }
  };

  useEffect(() => { fetchAttendance(); }, [instituteId, filterRole, filterType, filterDate, filterMonth, filterYear, filterBatch]);

  const { sorted: sortedAttendance, sortKey, sortDir, toggle } = useSort(attendance, {
    name: (a: any) => filterRole === 'student' ? ((a.students as any)?.profiles?.name || '') : (a._teacherName || ''),
    ref: (a: any) => filterRole === 'student' ? ((a.students as any)?.reg_no || '') : ((a.teachers as any)?.phone || ''),
    batch: (a: any) => (a.batches as any)?.name || '',
    date: (a: any) => a.date || '',
    status: (a: any) => a.status || '',
  });

  const counts = {
    present: attendance.filter((a: any) => a.status === 'present').length,
    absent: attendance.filter((a: any) => a.status === 'absent').length,
    late: attendance.filter((a: any) => a.status === 'late').length,
    total: new Set(attendance.map((a: any) => filterRole === 'student' ? a.student_id : a.teacher_id)).size,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Attendance</h2>
          <div className="flex flex-wrap gap-2 rounded-lg border bg-card px-3 py-2">
            <span className="rounded-md bg-green-100 dark:bg-green-950 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300">Present: {counts.present}</span>
            <span className="rounded-md bg-red-100 dark:bg-red-950 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300">Absent: {counts.absent}</span>
            <span className="rounded-md bg-yellow-100 dark:bg-yellow-950 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-300">Late: {counts.late}</span>
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">Total {filterRole === 'student' ? 'Students' : 'Teachers'}: {counts.total}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterRole} onValueChange={(v: 'student' | 'teacher') => setFilterRole(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="teacher">Teachers</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v: 'daily' | 'monthly' | 'yearly' | 'range') => setFilterType(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="range">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
          {filterType === 'daily' && <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44" />}
          {filterType === 'monthly' && <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-48" />}
          {filterType === 'yearly' && <Input type="number" min="2020" max="2099" value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-28" />}
          {filterType === 'range' && (
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="w-40" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="w-40" />
              <Button
                onClick={() => {
                  if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) { toast.error('Select a valid date range'); return; }
                  setAppliedRange({ from: rangeFrom, to: rangeTo });
                }}
              >Apply</Button>
            </div>
          )}
        </div>
      </div>
      {filterType === 'range' ? (
        appliedRange ? (
          <AttendanceRangeTable
            instituteId={instituteId}
            role={filterRole}
            batchId={filterBatch}
            from={appliedRange.from}
            to={appliedRange.to}
          />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Select a From and To date, then click Apply.
          </div>
        )
      ) : (
      <div className="rounded-lg border bg-card overflow-x-auto">

        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>{filterRole === 'student' ? 'Student' : 'Teacher'}</SortableTH>
              <SortableTH sortKey="ref" currentKey={sortKey} dir={sortDir} onToggle={toggle}>{filterRole === 'student' ? 'Reg No' : 'Phone'}</SortableTH>
              <SortableTH sortKey="batch" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Batch</SortableTH>
              <SortableTH sortKey="date" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Date</SortableTH>
              <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
            </tr>
          </thead>
          <tbody>
            {sortedAttendance.map((a, index) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{filterRole === 'student' ? (a.students as any)?.profiles?.name : a._teacherName}</td>
                <td className="p-3">{filterRole === 'student' ? (a.students as any)?.reg_no : (a.teachers as any)?.phone || '-'}</td>
                <td className="p-3">{(a.batches as any)?.name || '-'}</td>
                <td className="p-3">{a.date}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block w-8 text-center ${
                    a.status === 'present'
                      ? 'bg-accent/10 text-accent'
                      : a.status === 'late'
                        ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500'
                        : 'bg-destructive/10 text-destructive'
                  }`}>{a.status === 'present' ? 'P' : a.status === 'late' ? 'L' : 'A'}</span>
                </td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No attendance records</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

    </div>
  );
};

// ============= FEES TAB =============
const FeesTab = ({ instituteId }: { instituteId: string }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]); // merged enrollment+fee
  const [students, setStudents] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [studentGames, setStudentGames] = useState<any[]>([]);
  const [filterGame, setFilterGame] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthMode, setMonthMode] = useState<'single' | 'range'>('single');
  const [monthFrom, setMonthFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthTo, setMonthTo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [appliedMonths, setAppliedMonths] = useState<{ from: string; to: string } | null>(null);


  const [editOpen, setEditOpen] = useState(false);
  const [editFeeId, setEditFeeId] = useState<string | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editGameId, setEditGameId] = useState('');
  const [editMonth, setEditMonth] = useState(filterMonth);
  const [editAmount, setEditAmount] = useState('');
  const [editCollected, setEditCollected] = useState('');
  const [editMode, setEditMode] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<any[]>([]);

  const fetchAll = async () => {
    const [gRes, sgRes, stuRes] = await Promise.all([
      supabase.from('games').select('*').eq('institute_id', instituteId).order('name'),
      supabase.from('student_games').select('*').eq('institute_id', instituteId),
      supabase.from('students').select('id, reg_no, status, profiles!students_user_id_profiles_fkey(name)').eq('institute_id', instituteId),
    ]);
    setGames(gRes.data || []);
    setStudentGames(sgRes.data || []);
    setStudents(stuRes.data || []);
  };

  const fetchFees = async () => {
    if (monthMode === 'range') return;
    if (!filterMonth) return;

    const studentMap = Object.fromEntries(students.map((s: any) => [s.id, s]));
    const gameMap = Object.fromEntries(games.map((g: any) => [g.id, g]));

    // Load existing fee rows for the month (any game)
    let feeQ = supabase.from('fees').select('*').eq('institute_id', instituteId).eq('month', filterMonth);
    if (filterGame !== 'all') feeQ = feeQ.eq('game_id', filterGame);
    const { data: fees } = await feeQ;
    const feeRows = fees || [];

    // Build keyed map by student_id+game_id
    const feeKey = (sid: string, gid: string | null) => `${sid}__${gid || 'none'}`;
    const feeByKey: Record<string, any> = {};
    feeRows.forEach((f: any) => { feeByKey[feeKey(f.student_id, f.game_id)] = f; });

    // Generate placeholders from active student_games matching filterGame
    const activeEnrolls = studentGames.filter(sg =>
      sg.status === 'active' &&
      (filterGame === 'all' || sg.game_id === filterGame) &&
      studentMap[sg.student_id]?.status !== 'inactive'
    );

    const merged: any[] = [];
    // Add enrollment-driven rows
    for (const sg of activeEnrolls) {
      const stu = studentMap[sg.student_id];
      if (!stu) continue;
      const existing = feeByKey[feeKey(sg.student_id, sg.game_id)];
      merged.push({
        id: existing?.id || `placeholder-${sg.student_id}-${sg.game_id}-${filterMonth}`,
        _placeholder: !existing,
        _enrollment: sg,
        student_id: sg.student_id,
        game_id: sg.game_id,
        month: filterMonth,
        amount: existing?.amount ?? sg.monthly_fee ?? 0,
        collected_amount: existing?.collected_amount ?? 0,
        excess_amount: existing?.excess_amount ?? 0,
        status: existing?.status ?? 'unpaid',
        payment_mode: existing?.payment_mode ?? null,
        notes: existing?.notes ?? null,
        students: stu,
        _gameName: gameMap[sg.game_id]?.name || '—',
      });
    }
    // Add orphan legacy fees (no matching enrollment) so old data stays visible
    feeRows.forEach((f: any) => {
      if (!merged.find(m => m.student_id === f.student_id && m.game_id === f.game_id && !m._placeholder ? m.id === f.id : false)) {
        const hasEnrollment = activeEnrolls.find(sg => sg.student_id === f.student_id && sg.game_id === f.game_id);
        if (hasEnrollment) return;
        merged.push({
          ...f,
          students: studentMap[f.student_id],
          _gameName: gameMap[f.game_id]?.name || '—',
        });
      }
    });

    let final = merged;
    if (filterStatus !== 'all') final = final.filter(f => f.status === filterStatus);
    setRows(final);
  };

  useEffect(() => { fetchAll(); }, [instituteId]);
  useEffect(() => { fetchFees(); }, [instituteId, filterStatus, filterMonth, filterGame, students, games, studentGames, monthMode]);

  const totalAmount = rows.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const paidAmount = rows.reduce((sum, f) => sum + (Number(f.collected_amount) || 0), 0);
  const unpaidAmount = Math.max(0, totalAmount - paidAmount);

  const { sorted: sortedFees, sortKey, sortDir, toggle } = useSort(rows, {
    name: (f: any) => (f.students as any)?.profiles?.name || '',
    reg_no: (f: any) => (f.students as any)?.reg_no || '',
    game: (f: any) => f._gameName || '',
    amount: (f: any) => Number(f.amount) || 0,
    collected_amount: (f: any) => Number(f.collected_amount) || 0,
    status: (f: any) => f.status || '',
  });

  const openNew = () => {
    setEditFeeId(null);
    setEditStudentId('');
    setEditGameId(filterGame !== 'all' ? filterGame : (games[0]?.id || ''));
    setEditMonth(filterMonth);
    setEditAmount(''); setEditCollected(''); setEditMode(''); setEditNotes('');
    setEditOpen(true);
  };

  const openEdit = (f: any) => {
    setEditFeeId(f._placeholder ? null : f.id);
    setEditStudentId(f.student_id);
    setEditGameId(f.game_id || '');
    setEditMonth(f.month);
    setEditAmount(f.amount != null ? String(f.amount) : '');
    setEditCollected(f.collected_amount != null ? String(f.collected_amount) : '');
    setEditMode(f.payment_mode || '');
    setEditNotes(f.notes || '');
    setEditOpen(true);
  };

  const openHistory = async (f: any) => {
    let q = supabase.from('fee_history').select('*').eq('student_id', f.student_id).eq('month', f.month);
    if (f.game_id) q = q.eq('game_id', f.game_id);
    const { data } = await q.order('created_at', { ascending: false });
    setHistoryRows(data || []);
    setHistoryOpen(true);
  };

  const handleSave = async () => {
    if (!editStudentId || !editMonth) { toast.error('Select a student and month'); return; }
    setSaving(true);
    const amt = editAmount === '' ? 0 : Number(editAmount);
    const col = editCollected === '' ? 0 : Number(editCollected);
    const status = col === 0 ? 'unpaid' : col >= amt ? 'paid' : 'partial';
    const excess = Math.max(0, col - amt);
    const payload: any = {
      student_id: editStudentId,
      game_id: editGameId || null,
      month: editMonth,
      status,
      amount: amt,
      collected_amount: col,
      excess_amount: excess,
      payment_mode: editMode || null,
      notes: editNotes || null,
      institute_id: instituteId,
      updated_by: user?.id ?? null,
    };
    let error;
    let savedId: string | undefined = editFeeId || undefined;
    if (editFeeId) {
      ({ error } = await supabase.from('fees').update(payload).eq('id', editFeeId));
    } else {
      // look for existing for (student, game, month)
      let q = supabase.from('fees').select('id')
        .eq('institute_id', instituteId).eq('student_id', editStudentId).eq('month', editMonth);
      q = editGameId ? q.eq('game_id', editGameId) : q.is('game_id', null);
      const { data: existing } = await q.maybeSingle();
      if (existing) {
        savedId = existing.id;
        ({ error } = await supabase.from('fees').update(payload).eq('id', existing.id));
      } else {
        const { data: ins, error: insErr } = await supabase.from('fees').insert(payload).select('id').single();
        error = insErr;
        savedId = ins?.id;
      }
    }
    if (!error && savedId) {
      // Also update student_games.monthly_fee so future months reuse this
      if (editGameId) {
        await supabase.from('student_games')
          .update({ monthly_fee: amt })
          .eq('student_id', editStudentId).eq('game_id', editGameId);
      }
      await supabase.from('fee_history').insert({
        fee_id: savedId, student_id: editStudentId, institute_id: instituteId, month: editMonth,
        amount: amt, collected_amount: col, excess_amount: excess, status,
        payment_mode: editMode || null, notes: editNotes || null, game_id: editGameId || null,
        updated_by: user?.id ?? null, updated_by_role: 'admin',
      });
    }
    setSaving(false);
    if (error) { toast.error(error.message); }
    else { toast.success('Fee record saved'); setEditOpen(false); fetchAll(); fetchFees(); }
  };

  const quickMarkPaid = async (f: any) => {
    const amt = Number(f.amount) || 0;
    const col = Math.max(amt, Number(f.collected_amount) || 0);
    const payload: any = {
      status: 'paid', amount: amt, collected_amount: col,
      excess_amount: Math.max(0, col - amt), game_id: f.game_id || null,
      updated_by: user?.id ?? null,
    };
    let savedId: string | undefined = f._placeholder ? undefined : f.id;
    if (f._placeholder) {
      const { data: existing } = await supabase.from('fees')
        .select('id').eq('student_id', f.student_id).eq('month', f.month).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from('fees').update(payload).eq('id', existing.id);
        if (error) { toast.error(error.message); return; }
        savedId = existing.id;
      } else {
        const { data: ins, error } = await supabase.from('fees').insert({
          ...payload, student_id: f.student_id, month: f.month, institute_id: instituteId,
        }).select('id').single();
        if (error) { toast.error(error.message); return; }
        savedId = ins?.id;
      }
    } else {
      const { error } = await supabase.from('fees').update(payload).eq('id', f.id);
      if (error) { toast.error(error.message); return; }
    }
    await supabase.from('fee_history').insert({
      fee_id: savedId, student_id: f.student_id, institute_id: instituteId, month: f.month,
      amount: amt, collected_amount: col, excess_amount: Math.max(0, col - amt), status: 'paid',
      payment_mode: f.payment_mode || null, notes: f.notes || null, game_id: f.game_id || null,
      updated_by: user?.id ?? null, updated_by_role: 'admin',
    });
    toast.success('Marked paid');
    fetchFees();
  };

  const showGameFilter = games.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fees</h2>
        <div className="flex flex-wrap gap-2">
          {showGameFilter && (
            <Select value={filterGame} onValueChange={setFilterGame}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Filter by game" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={monthMode} onValueChange={(v: 'single' | 'range') => setMonthMode(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single Month</SelectItem>
              <SelectItem value="range">Custom Month Range</SelectItem>
            </SelectContent>
          </Select>
          {monthMode === 'single' ? (
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-48" />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input type="month" value={monthFrom} onChange={e => setMonthFrom(e.target.value)} className="w-40" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="month" value={monthTo} onChange={e => setMonthTo(e.target.value)} className="w-40" />
              <Button
                onClick={() => {
                  if (!monthFrom || !monthTo || monthFrom > monthTo) { toast.error('Select a valid month range'); return; }
                  setAppliedMonths({ from: monthFrom, to: monthTo });
                }}
              >Apply</Button>
            </div>
          )}
          {monthMode === 'single' && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Update Fee</Button>
        </div>
      </div>

      {monthMode === 'range' ? (
        appliedMonths ? (
          <FeesRangeTable
            instituteId={instituteId}
            gameId={filterGame}
            from={appliedMonths.from}
            to={appliedMonths.to}
          />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Select a From and To month, then click Apply.
          </div>
        )
      ) : (
      <>
      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">₹{totalAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Collected</p><p className="text-xl font-bold text-accent">₹{paidAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold text-destructive">₹{unpaidAmount.toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto mt-4">

        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Student</SortableTH>
              <SortableTH sortKey="reg_no" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Reg No</SortableTH>
              <SortableTH sortKey="game" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Game</SortableTH>
              <SortableTH sortKey="amount" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Monthly Fee (₹)</SortableTH>
              <SortableTH sortKey="collected_amount" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Collected (₹)</SortableTH>
              <th className="text-left p-3 font-medium">Balance (₹)</th>
              <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
              <th className="text-left p-3 font-medium">Mode</th>
              <th className="text-left p-3 font-medium">Note</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedFees.map((f, index) => {
              const amt = Number(f.amount) || 0;
              const col = Number(f.collected_amount) || 0;
              const due = Math.max(0, amt - col);
              const excess = Math.max(0, col - amt);
              const cls = f.status === 'paid' ? 'bg-accent/10 text-accent'
                : f.status === 'partial' ? 'bg-yellow-500/10 text-yellow-600'
                : 'bg-destructive/10 text-destructive';
              return (
                <tr key={f.id} className="border-t">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{(f.students as any)?.profiles?.name}</td>
                  <td className="p-3">{(f.students as any)?.reg_no}</td>
                  <td className="p-3">{f._gameName}</td>
                  <td className="p-3">₹{amt.toLocaleString()}</td>
                  <td className="p-3">
                    ₹{col.toLocaleString()}
                    {excess > 0 && <span className="text-xs text-accent ml-1">(+₹{excess})</span>}
                  </td>
                  <td className="p-3">₹{due.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{f.status}</span>
                  </td>
                  <td className="p-3 capitalize text-xs">{f.payment_mode || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[160px] truncate" title={f.notes || ''}>{f.notes || '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {f.status !== 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => quickMarkPaid(f)}>Mark Paid</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!f._placeholder && (
                        <Button size="sm" variant="ghost" onClick={() => openHistory(f)} title="History">
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No fee records for this month</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}


      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFeeId ? 'Edit Fee Record' : 'Update Fee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Student</Label>
              <Select value={editStudentId} onValueChange={setEditStudentId} disabled={!!editFeeId}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {(s.profiles as any)?.name} ({s.reg_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Game</Label>
              <Select value={editGameId} onValueChange={setEditGameId}>
                <SelectTrigger><SelectValue placeholder="Select game" /></SelectTrigger>
                <SelectContent>
                  {games.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Month</Label>
              <Input type="month" value={editMonth} onChange={e => setEditMonth(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monthly Fee (₹)</Label>
                <Input type="number" min="0" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="e.g. 1500" />
                <p className="text-xs text-muted-foreground mt-1">Updates default for future months.</p>
              </div>
              <div>
                <Label>Collected (₹)</Label>
                <Input type="number" min="0" step="0.01" value={editCollected} onChange={e => setEditCollected(e.target.value)} placeholder="e.g. 1000" />
              </div>
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={editMode || 'none'} onValueChange={(v) => setEditMode(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Note</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Optional note" />
            </div>
            <p className="text-xs text-muted-foreground">Status auto-calculated: Unpaid (₹0) · Partial · Paid (Collected ≥ Fee).</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment History</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {historyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No history yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted"><tr>
                  <th className="text-left p-2">Date</th><th className="text-left p-2">Fee</th>
                  <th className="text-left p-2">Collected</th><th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Mode</th><th className="text-left p-2">By</th><th className="text-left p-2">Note</th>
                </tr></thead>
                <tbody>
                  {historyRows.map(h => (
                    <tr key={h.id} className="border-t">
                      <td className="p-2">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="p-2">₹{Number(h.amount).toLocaleString()}</td>
                      <td className="p-2">₹{Number(h.collected_amount).toLocaleString()}</td>
                      <td className="p-2">{h.status}</td>
                      <td className="p-2 capitalize">{h.payment_mode || '—'}</td>
                      <td className="p-2 capitalize">{h.updated_by_role || '—'}</td>
                      <td className="p-2">{h.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstituteDashboard;
