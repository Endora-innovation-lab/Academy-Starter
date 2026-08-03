import React, { useState } from 'react';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type LoginRole = 'institute' | 'teacher' | 'student';

const Login = () => {
  const [activeRole, setActiveRole] = useState<LoginRole>('institute');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role } = useAuth();

  React.useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/dashboard/institute');
      else if (role === 'teacher') {
        (async () => {
          const { data: t } = await supabase.from('teachers').select('role').eq('user_id', user.id).maybeSingle();
          navigate(t?.role === 'principal' ? '/dashboard/principal' : '/dashboard/teacher');
        })();
      } else if (role === 'student') navigate('/dashboard/student');
    }
  }, [user, role]);

  const resetFields = () => {
    setEmail(''); setRegNo(''); setPassword(''); setInstituteId('');
  };

  const handleRoleChange = (r: LoginRole) => {
    setActiveRole(r);
    resetFields();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeRole === 'institute') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
          if (!roleData || roleData.role !== 'admin') {
            await supabase.auth.signOut();
            throw new Error('This account is not an Institute account. Please use the Teacher or Student tab.');
          }
        }
        toast.success('Logged in successfully');
        navigate('/dashboard/institute');
      } else if (activeRole === 'teacher') {
        if (!instituteId.trim()) throw new Error('Institute ID is required');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Invalid credentials');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('role, institute_id').eq('user_id', user.id).single();
          if (!roleData || roleData.role !== 'teacher') {
            await supabase.auth.signOut();
            throw new Error('This account is not a Teacher account.');
          }
          const { data: instData } = await supabase.from('institutes').select('code').eq('id', roleData.institute_id).single();
          if (!instData || instData.code !== instituteId.toUpperCase()) {
            await supabase.auth.signOut();
            throw new Error('Institute ID does not match');
          }
        }
        toast.success('Logged in successfully');
        const { data: teacherRow } = await supabase.from('teachers').select('role').eq('user_id', user!.id).maybeSingle();
        navigate(teacherRow?.role === 'principal' ? '/dashboard/principal' : '/dashboard/teacher');
      } else {
        if (!instituteId.trim()) throw new Error('Institute ID is required');
        const loginEmail = `${regNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.academy.local`;
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw new Error('Invalid credentials. Check your Reg Number, Password, and Institute ID.');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('role, institute_id').eq('user_id', user.id).single();
          if (!roleData || roleData.role !== 'student') {
            await supabase.auth.signOut();
            throw new Error('This account is not a Student account.');
          }
          const { data: instData } = await supabase.from('institutes').select('code').eq('id', roleData.institute_id).single();
          if (!instData || instData.code !== instituteId.toUpperCase()) {
            await supabase.auth.signOut();
            throw new Error('Institute ID does not match');
          }
        }
        toast.success('Logged in successfully');
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
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(220, 100%, 55%), hsl(265, 85%, 55%))' }}>
      <header className="px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl overflow-hidden">
          <div className="p-6 pb-4 text-center">
            <img src={logo} alt="Academy Starter" className="h-12 w-12 rounded-lg mx-auto mb-3" />
            <h1 className="text-2xl font-bold">Login</h1>
            <p className="text-sm text-muted-foreground">Select your role and enter credentials</p>
          </div>

          <div className="px-6 flex gap-1 justify-center">
            {roles.map(r => (
              <button
                key={r.key}
                type="button"
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
                <Link to="/forgot-password" className="text-sm text-primary hover:underline block">
                  Forgot Password?
                </Link>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Register Institute
                  </Link>
                </p>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;
