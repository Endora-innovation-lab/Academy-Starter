import React, { useState } from 'react';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, Users, BookOpen, ClipboardList, DollarSign, Shield, LogIn, Building2, CheckSquare, Key } from 'lucide-react';
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
      <header className="sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, hsl(199, 100%, 50%), hsl(210, 100%, 56%))' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Academy Starter" className="h-8 w-8 rounded-md" />
            <span className="font-bold text-lg text-white">AcademyStarter</span>
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" asChild>
            <a href="https://forms.gle/3PsfR181KFEMnXkB7" target="_blank" rel="noopener noreferrer">
              Feedback
            </a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <div className="py-20 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(220, 100%, 55%), hsl(265, 85%, 55%))' }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
            <GraduationCap className="h-5 w-5 text-white" />
            <span className="text-white font-medium text-sm">Academy Starter System</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 leading-tight">
            Manage your institute
          </h1>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight" style={{ color: 'hsl(42, 100%, 55%)', fontStyle: 'italic' }}>
            effortlessly.
          </h1>
          <p className="text-lg text-white/85 max-w-2xl mx-auto mb-8">
            The all-in-one platform for educational institutes. Track attendance, manage fees, organize batches, and manage teachers and students.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="bg-white text-primary font-bold hover:bg-white/90 px-8 py-6 text-base"
              onClick={() => setShowLogin(true)}
            >
              <LogIn className="h-5 w-5 mr-2" />
              Login to Dashboard
            </Button>
            <Button
              size="lg"
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-base font-bold"
              asChild
            >
              <Link to="/register">Register Institute</Link>
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

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-4 py-16 w-full">
        <h2 className="text-3xl font-bold text-center mb-2">How it works</h2>
        <p className="text-center text-muted-foreground mb-10">Three roles, one platform</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Building2,
              title: 'Institute Admin',
              desc: 'Register your institute. Add students and teachers directly — no self-registration needed. Manage batches, attendance, and fees.',
              hint: null,
              iconBg: 'hsl(210, 80%, 95%)',
              iconColor: 'hsl(210, 80%, 50%)',
            },
            {
              icon: Users,
              title: 'Teachers',
              desc: 'Login using your email and auto-generated password. Mark daily attendance, update fee status, and manage your assigned batches.',
              hint: '🔐 Password: last 4 digits of phone + birth year',
              iconBg: 'hsl(170, 60%, 93%)',
              iconColor: 'hsl(170, 60%, 40%)',
            },
            {
              icon: GraduationCap,
              title: 'Students',
              desc: 'Login using your registration number and date of birth. View your attendance record and fee payment history.',
              hint: '🔐 Password: Date of Birth (dd-mm-yyyy)',
              iconBg: 'hsl(180, 60%, 93%)',
              iconColor: 'hsl(180, 60%, 40%)',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: f.iconBg }}>
                  <f.icon className="h-8 w-8" style={{ color: f.iconColor }} />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{f.desc}</p>
              {f.hint && (
                <p className="text-xs font-medium px-3 py-2 rounded-lg border" style={{ color: 'hsl(170, 60%, 35%)' }}>
                  {f.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features strip */}
      <div className="border-t border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Shield, label: 'Role-Based Access', color: 'hsl(210, 80%, 55%)' },
            { icon: ClipboardList, label: 'Batch Management', color: 'hsl(170, 60%, 45%)' },
            { icon: CheckSquare, label: 'Attendance Tracking', color: 'hsl(42, 90%, 50%)' },
            { icon: DollarSign, label: 'Fee Management', color: 'hsl(30, 90%, 55%)' },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${f.color}20` }}>
                <f.icon className="h-6 w-6" style={{ color: f.color }} />
              </div>
              <span className="font-semibold text-sm">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 px-4 text-center" style={{ background: 'linear-gradient(135deg, hsl(199, 100%, 50%), hsl(210, 100%, 56%))' }}>
        <h2 className="text-3xl font-bold text-white mb-3">Ready to get started?</h2>
        <p className="text-white/85 mb-8">Register your institute and take full control in minutes.</p>
        <Button size="lg" className="bg-white text-primary font-bold hover:bg-white/90 px-8 py-6 text-base" asChild>
          <Link to="/register">
            <Building2 className="h-5 w-5 mr-2" />
            Register Your Institute
          </Link>
        </Button>
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
