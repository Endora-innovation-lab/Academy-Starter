import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserCheck } from 'lucide-react';

const StudentLogin = () => {
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Construct email from reg_no
      const email = `${regNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.academy.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Invalid credentials. Check your Reg Number, Password, and Institute ID.');
      
      // Verify institute ID matches
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('institute_id')
          .eq('user_id', user.id)
          .single();
        
        if (roleData) {
          const { data: instData } = await supabase
            .from('institutes')
            .select('code')
            .eq('id', roleData.institute_id)
            .single();
          
          if (!instData || instData.code !== instituteId.toUpperCase()) {
            await supabase.auth.signOut();
            throw new Error('Institute ID does not match');
          }
        }
      }
      
      toast.success('Logged in successfully');
      navigate('/dashboard/student');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <UserCheck className="h-7 w-7 text-accent" />
          </div>
          <CardTitle className="text-2xl">Student Login</CardTitle>
          <CardDescription>Login with your registration number</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regNo">Registration Number</Label>
              <Input id="regNo" value={regNo} onChange={(e) => setRegNo(e.target.value)} required placeholder="e.g. STU001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (DOB: dd-mm-yyyy)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="dd-mm-yyyy"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instituteId">Institute ID</Label>
              <Input id="instituteId" value={instituteId} onChange={(e) => setInstituteId(e.target.value)} required placeholder="e.g. INS1234" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/" className="text-primary hover:underline">Back to Home</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
