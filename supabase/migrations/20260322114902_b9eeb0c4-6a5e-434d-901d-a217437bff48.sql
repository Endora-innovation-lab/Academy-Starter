
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Institutes table
CREATE TABLE public.institutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  UNIQUE (user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  institute_id UUID REFERENCES public.institutes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  reg_no TEXT NOT NULL,
  dob TEXT NOT NULL,
  parent_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reg_no, institute_id)
);

-- Teachers table
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  birth_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Batch students
CREATE TABLE public.batch_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  UNIQUE(batch_id, student_id)
);

-- Attendance
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  marked_by UUID REFERENCES auth.users(id),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Fees
CREATE TABLE public.fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  institute_id UUID NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, month)
);

-- Enable RLS on all tables
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user institute_id
CREATE OR REPLACE FUNCTION public.get_user_institute_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institute_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for institutes
CREATE POLICY "Admins can view own institute" ON public.institutes
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert institute" ON public.institutes
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update own institute" ON public.institutes
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view their institute" ON public.institutes
  FOR SELECT USING (id = public.get_user_institute_id(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users in same institute can view profiles" ON public.profiles
  FOR SELECT USING (institute_id = public.get_user_institute_id(auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );

-- RLS for students
CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );
CREATE POLICY "Teachers can view students" ON public.students
  FOR SELECT USING (
    public.has_role(auth.uid(), 'teacher')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );
CREATE POLICY "Students can view own record" ON public.students
  FOR SELECT USING (user_id = auth.uid());

-- RLS for teachers
CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );
CREATE POLICY "Teachers can view own record" ON public.teachers
  FOR SELECT USING (user_id = auth.uid());

-- RLS for batches
CREATE POLICY "Institute users can view batches" ON public.batches
  FOR SELECT USING (institute_id = public.get_user_institute_id(auth.uid()));
CREATE POLICY "Admins can manage batches" ON public.batches
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );

-- RLS for batch_students
CREATE POLICY "Institute users can view batch_students" ON public.batch_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.batches b
      WHERE b.id = batch_id
      AND b.institute_id = public.get_user_institute_id(auth.uid())
    )
  );
CREATE POLICY "Admins can manage batch_students" ON public.batch_students
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.batches b
      WHERE b.id = batch_id
      AND b.institute_id = public.get_user_institute_id(auth.uid())
    )
  );

-- RLS for attendance
CREATE POLICY "Institute users can view attendance" ON public.attendance
  FOR SELECT USING (institute_id = public.get_user_institute_id(auth.uid()));
CREATE POLICY "Students can view own attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Teachers can manage attendance" ON public.attendance
  FOR ALL USING (
    public.has_role(auth.uid(), 'teacher')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );
CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );

-- RLS for fees
CREATE POLICY "Institute users can view fees" ON public.fees
  FOR SELECT USING (institute_id = public.get_user_institute_id(auth.uid()));
CREATE POLICY "Students can view own fees" ON public.fees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Teachers can manage fees" ON public.fees
  FOR ALL USING (
    public.has_role(auth.uid(), 'teacher')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );
CREATE POLICY "Admins can manage fees" ON public.fees
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND institute_id = public.get_user_institute_id(auth.uid())
  );

-- Generate unique institute code function
CREATE OR REPLACE FUNCTION public.generate_institute_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := 'INS' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.institutes WHERE code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;
