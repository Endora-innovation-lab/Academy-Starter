import React, { useState } from 'react';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Users, BookOpen, ClipboardList, DollarSign, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type LoginRole = 'institute' | 'teacher' | 'student';

const Index = () => {
  const [showLogin, setShowLogin] = useState(false);
  const { user, role } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/dashboard/institute');
      else if (role === 'teacher') navigate('/dashboard/teacher');
      else if (role === 'student') navigate('/dashboard/student');
    }
  }, [user, role]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Academy Starter" className="h-8 w-8 rounded-md" />
            <span className="font-bold text-lg">Academy Starter</span>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="https://forms.gle/3PsfR181KFEMnXkB7" target="_blank" rel="noopener noreferrer">
              Feedback
            </a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px)'
          }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20">
              <GraduationCap className="h-9 w-9" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3">Academy Starter</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-6">
            Manage your educational institute with ease
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setShowLogin(true)}
            >
              Login
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Login Dialog */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <LoginModal onClose={() => setShowLogin(false)} />
        </DialogContent>
      </Dialog>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 py-16 flex-1">
        <h2 className="text-2xl font-bold text-center mb-8">Everything You Need</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: 'Student Management', desc: 'Add, edit, search, and manage student records with batch filtering' },
            { icon: BookOpen, title: 'Teacher Management', desc: 'Create teacher accounts with auto-generated credentials' },
            { icon: ClipboardList, title: 'Attendance Tracking', desc: 'Mark and view attendance by date and batch with monthly summaries' },
            { icon: DollarSign, title: 'Fee Management', desc: 'Track paid/unpaid fee status with monthly records and amounts' },
            { icon: Shield, title: 'Role-Based Access', desc: 'Secure dashboards for admins, teachers, and students' },
            { icon: GraduationCap, title: 'Batch Organization', desc: 'Group students into batches with multiple teachers' },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
              <f.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Academy Starter" className="h-5 w-5 rounded" />
            <span>Academy Starter</span>
          </div>
          <p>© {new Date().getFullYear()} Endora Innovation. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const LoginModal = ({ onClose }: { onClose: () => void }) => {
  const [activeRole, setActiveRole] = useState<LoginRole>('institute');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetFields = () => {
    setEmail(''); setRegNo(''); setPassword(''); setInstituteId('');
  };

  const handleRoleChange = (role: LoginRole) => {
    setActiveRole(role);
    resetFields();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeRole === 'institute') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Logged in successfully');
        onClose();
        navigate('/dashboard/institute');
      } else if (activeRole === 'teacher') {
        if (!instituteId.trim()) throw new Error('Institute ID is required');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Invalid credentials');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('institute_id').eq('user_id', user.id).single();
          if (roleData) {
            const { data: instData } = await supabase.from('institutes').select('code').eq('id', roleData.institute_id).single();
            if (!instData || instData.code !== instituteId.toUpperCase()) {
              await supabase.auth.signOut();
              throw new Error('Institute ID does not match');
            }
          }
        }
        toast.success('Logged in successfully');
        onClose();
        navigate('/dashboard/teacher');
      } else {
        if (!instituteId.trim()) throw new Error('Institute ID is required');
        const loginEmail = `${regNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.academy.local`;
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw new Error('Invalid credentials. Check your Reg Number, Password, and Institute ID.');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('institute_id').eq('user_id', user.id).single();
          if (roleData) {
            const { data: instData } = await supabase.from('institutes').select('code').eq('id', roleData.institute_id).single();
            if (!instData || instData.code !== instituteId.toUpperCase()) {
              await supabase.auth.signOut();
              throw new Error('Institute ID does not match');
            }
          }
        }
        toast.success('Logged in successfully');
        onClose();
        navigate('/dashboard/student');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const roles: { key: LoginRole; label: string }[] = [
    { key: 'institute', label: 'Institute' },
    { key: 'teacher', label: 'Teacher' },
    { key: 'student', label: 'Student' },
  ];

  return (
    <div>
      <div className="p-6 pb-4">
        <h2 className="text-xl font-bold">Login</h2>
        <p className="text-sm text-muted-foreground">Select your role and enter credentials</p>
      </div>

      <div className="px-6 flex gap-1">
        {roles.map(r => (
          <button
            key={r.key}
            onClick={() => handleRoleChange(r.key)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeRole === r.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleLogin} className="p-6 space-y-4">
        {activeRole === 'student' ? (
          <div className="space-y-2">
            <Label htmlFor="regNo">Reg Number</Label>
            <Input id="regNo" value={regNo} onChange={e => setRegNo(e.target.value)} required placeholder="e.g. STU001" />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder={activeRole === 'student' ? 'DOB (ddmmyyyy)' : activeRole === 'teacher' ? 'Last 4 digits of phone + birth year' : 'Enter password'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {(activeRole === 'teacher' || activeRole === 'student') && (
          <div className="space-y-2">
            <Label htmlFor="instituteId">Institute ID</Label>
            <Input id="instituteId" value={instituteId} onChange={e => setInstituteId(e.target.value)} required placeholder="e.g., INS1001" />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        {activeRole === 'institute' && (
          <div className="text-center space-y-1">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline block" onClick={() => onClose()}>
              Forgot Password?
            </Link>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium" onClick={() => onClose()}>
                Register Institute
              </Link>
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default Index;
