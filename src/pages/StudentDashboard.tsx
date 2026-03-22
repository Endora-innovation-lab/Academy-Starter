import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, DollarSign } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [studentRecord, setStudentRecord] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from('students').select('*').eq('user_id', user.id).single();
      setStudentRecord(data);
    };
    fetch();
  }, [user]);

  const tabs = [
    { label: 'Attendance', value: 'attendance' },
    { label: 'Fees', value: 'fees' },
  ];

  return (
    <DashboardLayout title="Student Dashboard" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'attendance' && studentRecord && <StudentAttendanceTab studentId={studentRecord.id} />}
      {activeTab === 'fees' && studentRecord && <StudentFeesTab studentId={studentRecord.id} />}
    </DashboardLayout>
  );
};

const StudentAttendanceTab = ({ studentId }: { studentId: string }) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      
      if (filterDate) query = query.eq('date', filterDate);
      const { data } = await query;
      setAttendance(data || []);
    };
    fetch();
  }, [studentId, filterDate]);

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const totalCount = attendance.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> My Attendance</h2>
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-48" />
      </div>
      {totalCount > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="px-3 py-1 rounded bg-accent/10 text-accent font-medium">Present: {presentCount}</span>
          <span className="px-3 py-1 rounded bg-destructive/10 text-destructive font-medium">Absent: {totalCount - presentCount}</span>
          <span className="px-3 py-1 rounded bg-muted font-medium">Total: {totalCount}</span>
        </div>
      )}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map(a => (
              <tr key={a.id} className="border-t">
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
              <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">No attendance records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StudentFeesTab = ({ studentId }: { studentId: string }) => {
  const [fees, setFees] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from('fees').select('*').eq('student_id', studentId).order('month', { ascending: false });
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      const { data } = await query;
      setFees(data || []);
    };
    fetch();
  }, [studentId, filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> My Fees</h2>
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
              <th className="text-left p-3 font-medium">Month</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr key={f.id} className="border-t">
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
              <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">No fee records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentDashboard;
