import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, BookOpen, ClipboardList, DollarSign, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InstituteDashboard = () => {
  const { user, instituteId, instituteCode } = useAuth();
  const [activeTab, setActiveTab] = useState('students');

  const tabs = [
    { label: 'Students', value: 'students' },
    { label: 'Teachers', value: 'teachers' },
    { label: 'Batches', value: 'batches' },
    { label: 'Attendance', value: 'attendance' },
    { label: 'Fees', value: 'fees' },
  ];

  return (
    <DashboardLayout
      title="Institute Dashboard"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'students' && <StudentsTab instituteId={instituteId!} />}
      {activeTab === 'teachers' && <TeachersTab instituteId={instituteId!} />}
      {activeTab === 'batches' && <BatchesTab instituteId={instituteId!} />}
      {activeTab === 'attendance' && <AttendanceTab instituteId={instituteId!} />}
      {activeTab === 'fees' && <FeesTab instituteId={instituteId!} />}
    </DashboardLayout>
  );
};

// ============= STUDENTS TAB =============
const StudentsTab = ({ instituteId }: { instituteId: string }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterFee, setFilterFee] = useState('all');

  // Form
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [dob, setDob] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    let query = supabase
      .from('students')
      .select('*, profiles!students_user_id_fkey(name), batch_students(batch_id)')
      .eq('institute_id', instituteId);

    const { data } = await query;
    
    // Fetch batches
    const { data: batchData } = await supabase.from('batches').select('*').eq('institute_id', instituteId);
    setBatches(batchData || []);

    // Fetch fees for filter
    const { data: feesData } = await supabase.from('fees').select('student_id, status').eq('institute_id', instituteId);

    let filtered = data || [];

    // Apply batch filter
    if (filterBatch !== 'all') {
      const { data: batchStudents } = await supabase.from('batch_students').select('student_id').eq('batch_id', filterBatch);
      const studentIds = batchStudents?.map(bs => bs.student_id) || [];
      filtered = filtered.filter(s => studentIds.includes(s.id));
    }

    // Apply fee filter
    if (filterFee !== 'all') {
      const studentsWithStatus = feesData?.filter(f => f.status === filterFee).map(f => f.student_id) || [];
      if (filterFee === 'unpaid') {
        // Include students with no fee records too
        const paidStudents = feesData?.filter(f => f.status === 'paid').map(f => f.student_id) || [];
        filtered = filtered.filter(s => !paidStudents.includes(s.id) || studentsWithStatus.includes(s.id));
      } else {
        filtered = filtered.filter(s => studentsWithStatus.includes(s.id));
      }
    }

    setStudents(filtered);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [instituteId, filterBatch, filterFee]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'create_student', name, reg_no: regNo, dob, parent_phone: parentPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCreatedCreds(data.credentials);
      toast.success('Student added!');
      setShowAdd(false);
      setName(''); setRegNo(''); setDob(''); setParentPhone('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Delete this student?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'delete_student', student_id: studentId },
      });
      if (error) throw error;
      toast.success('Student deleted');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'update_student', student_id: editStudent.id, name, dob, parent_phone: parentPhone },
      });
      if (error) throw error;
      toast.success('Student updated');
      setShowEdit(false);
      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Students</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterFee} onValueChange={setFilterFee}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter by fee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fees</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div><Label>Registration Number</Label><Input value={regNo} onChange={e => setRegNo(e.target.value)} required /></div>
                <div><Label>DOB (dd-mm-yyyy)</Label><Input value={dob} onChange={e => setDob(e.target.value)} required placeholder="dd-mm-yyyy" /></div>
                <div><Label>Parent Phone</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></div>
                <Button type="submit" className="w-full">Add Student</Button>
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
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">DOB</th>
              <th className="text-left p-3 font-medium">Parent Phone</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{(s.profiles as any)?.name || 'N/A'}</td>
                <td className="p-3">{s.reg_no}</td>
                <td className="p-3">{s.dob}</td>
                <td className="p-3">{s.parent_phone || '-'}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditStudent(s);
                    setName((s.profiles as any)?.name || '');
                    setDob(s.dob);
                    setParentPhone(s.parent_phone || '');
                    setShowEdit(true);
                  }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><Label>DOB (dd-mm-yyyy)</Label><Input value={dob} onChange={e => setDob(e.target.value)} required /></div>
            <div><Label>Parent Phone</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= TEACHERS TAB =============
const TeachersTab = ({ instituteId }: { instituteId: string }) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*, profiles!teachers_user_id_fkey(name, email)')
      .eq('institute_id', instituteId);
    setTeachers(data || []);
  };

  useEffect(() => { fetchTeachers(); }, [instituteId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'create_teacher', name, email, phone, birth_year: birthYear },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCreatedCreds(data.credentials);
      toast.success('Teacher added!');
      setShowAdd(false);
      setName(''); setEmail(''); setPhone(''); setBirthYear('');
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
      await supabase.functions.invoke('admin-operations', {
        body: { action: 'update_teacher', teacher_id: editTeacher.id, name, phone, birth_year: birthYear },
      });
      toast.success('Teacher updated');
      setShowEdit(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Teachers</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Teacher</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
              <div><Label>Birth Year</Label><Input value={birthYear} onChange={e => setBirthYear(e.target.value)} required placeholder="e.g. 1990" /></div>
              <Button type="submit" className="w-full">Add Teacher</Button>
            </form>
          </DialogContent>
        </Dialog>
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
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Birth Year</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{(t.profiles as any)?.name || 'N/A'}</td>
                <td className="p-3">{(t.profiles as any)?.email || '-'}</td>
                <td className="p-3">{t.phone}</td>
                <td className="p-3">{t.birth_year}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditTeacher(t);
                    setName((t.profiles as any)?.name || '');
                    setPhone(t.phone);
                    setBirthYear(t.birth_year);
                    setShowEdit(true);
                  }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
            <div><Label>Birth Year</Label><Input value={birthYear} onChange={e => setBirthYear(e.target.value)} required /></div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= BATCHES TAB =============
const BatchesTab = ({ instituteId }: { instituteId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [batchName, setBatchName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [batchStudents, setBatchStudents] = useState<any[]>([]);

  const fetchData = async () => {
    const [{ data: b }, { data: t }, { data: s }] = await Promise.all([
      supabase.from('batches').select('*, teachers(id, profiles!teachers_user_id_fkey(name))').eq('institute_id', instituteId),
      supabase.from('teachers').select('*, profiles!teachers_user_id_fkey(name)').eq('institute_id', instituteId),
      supabase.from('students').select('*, profiles!students_user_id_fkey(name)').eq('institute_id', instituteId),
    ]);
    setBatches(b || []);
    setTeachers(t || []);
    setStudents(s || []);
  };

  const fetchBatchStudents = async (batchId: string) => {
    const { data } = await supabase
      .from('batch_students')
      .select('*, students(id, reg_no, profiles!students_user_id_fkey(name))')
      .eq('batch_id', batchId);
    setBatchStudents(data || []);
  };

  useEffect(() => { fetchData(); }, [instituteId]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('batches').insert({
        name: batchName,
        institute_id: instituteId,
        teacher_id: teacherId || null,
      });
      toast.success('Batch created');
      setShowAdd(false);
      setBatchName('');
      setTeacherId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent || !showAssign) return;
    try {
      await supabase.from('batch_students').insert({
        batch_id: showAssign,
        student_id: selectedStudent,
      });
      toast.success('Student assigned');
      setSelectedStudent('');
      fetchBatchStudents(showAssign);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveFromBatch = async (bsId: string) => {
    await supabase.from('batch_students').delete().eq('id', bsId);
    if (showAssign) fetchBatchStudents(showAssign);
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
                <Label>Assign Teacher</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id}>{(t.profiles as any)?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <CardTitle className="text-base">{b.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Teacher: {(b.teachers as any)?.profiles?.name || 'Unassigned'}
              </p>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => { setShowAssign(b.id); fetchBatchStudents(b.id); }}>
                Manage Students
              </Button>
            </CardContent>
          </Card>
        ))}
        {batches.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No batches created</p>}
      </div>

      <Dialog open={!!showAssign} onOpenChange={() => setShowAssign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Manage Batch Students</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{(s.profiles as any)?.name} ({s.reg_no})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignStudent}>Add</Button>
            </div>
            <div className="space-y-1">
              {batchStudents.map(bs => (
                <div key={bs.id} className="flex items-center justify-between p-2 rounded bg-muted">
                  <span className="text-sm">{(bs.students as any)?.profiles?.name} ({(bs.students as any)?.reg_no})</span>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveFromBatch(bs.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {batchStudents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No students in this batch</p>}
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
  const [filterDate, setFilterDate] = useState('');

  const fetchAttendance = async () => {
    let query = supabase
      .from('attendance')
      .select('*, students(reg_no, profiles!students_user_id_fkey(name))')
      .eq('institute_id', instituteId)
      .order('date', { ascending: false });
    
    if (filterDate) {
      query = query.eq('date', filterDate);
    }

    const { data } = await query.limit(100);
    setAttendance(data || []);
  };

  useEffect(() => { fetchAttendance(); }, [instituteId, filterDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Attendance</h2>
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-48" />
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Student</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{(a.students as any)?.profiles?.name}</td>
                <td className="p-3">{(a.students as any)?.reg_no}</td>
                <td className="p-3">{a.date}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    a.status === 'present' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No attendance records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============= FEES TAB =============
const FeesTab = ({ instituteId }: { instituteId: string }) => {
  const [fees, setFees] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchFees = async () => {
    let query = supabase
      .from('fees')
      .select('*, students(reg_no, profiles!students_user_id_fkey(name))')
      .eq('institute_id', instituteId)
      .order('month', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;
    setFees(data || []);
  };

  useEffect(() => { fetchFees(); }, [instituteId, filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fees</h2>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Student</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">Month</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{(f.students as any)?.profiles?.name}</td>
                <td className="p-3">{(f.students as any)?.reg_no}</td>
                <td className="p-3">{f.month}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    f.status === 'paid' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {f.status}
                  </span>
                </td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No fee records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InstituteDashboard;
