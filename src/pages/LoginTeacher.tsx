import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Users } from 'lucide-react';
import logo from '@/assets/logo.png';

const LoginTeacher = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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
      navigate('/dashboard/teacher');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={logo} alt="Academy Starter" className="h-12 w-12 rounded-md" />
          </div>
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(170, 60%, 93%)' }}>
              <Users className="h-6 w-6" style={{ color: 'hsl(170, 60%, 40%)' }} />
            </div>
          </div>
          <CardTitle className="text-2xl">Teacher Login</CardTitle>
          <CardDescription>Sign in with your teacher credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Last 4 digits of phone + birth year"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">🔐 Password: last 4 digits of phone + birth year</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instituteId">Institute ID</Label>
              <Input id="instituteId" value={instituteId} onChange={e => setInstituteId(e.target.value)} required placeholder="e.g., INS1001" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back to Home</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginTeacher;
