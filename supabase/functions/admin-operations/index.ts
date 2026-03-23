
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Get the auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const user = { id: claimsData.claims.sub as string }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role, institute_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Not an admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'create_student') {
      const { name, reg_no, dob, parent_phone } = body
      const email = `${reg_no.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.academy.local`
      const password = dob // dd-mm-yyyy format

      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'student' }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Insert into profiles
      await supabaseAdmin.from('profiles').insert({
        user_id: newUser.user.id,
        name,
        email,
        institute_id: roleData.institute_id
      })

      // Insert into user_roles
      await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role: 'student',
        institute_id: roleData.institute_id
      })

      // Insert into students
      const { data: studentData, error: studentError } = await supabaseAdmin.from('students').insert({
        user_id: newUser.user.id,
        institute_id: roleData.institute_id,
        reg_no,
        dob,
        parent_phone
      }).select().single()

      if (studentError) {
        return new Response(JSON.stringify({ error: studentError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        success: true,
        student: studentData,
        credentials: { username: reg_no, password: dob }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'create_teacher') {
      const { name, email, phone, birth_year } = body
      const password = phone.slice(-4) + birth_year

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'teacher' }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      await supabaseAdmin.from('profiles').insert({
        user_id: newUser.user.id,
        name,
        email,
        institute_id: roleData.institute_id
      })

      await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role: 'teacher',
        institute_id: roleData.institute_id
      })

      const { data: teacherData, error: teacherError } = await supabaseAdmin.from('teachers').insert({
        user_id: newUser.user.id,
        institute_id: roleData.institute_id,
        phone,
        birth_year
      }).select().single()

      if (teacherError) {
        return new Response(JSON.stringify({ error: teacherError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        success: true,
        teacher: teacherData,
        credentials: { email, password }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'delete_student') {
      const { student_id } = body
      // Get the student's user_id
      const { data: student } = await supabaseAdmin.from('students').select('user_id').eq('id', student_id).single()
      if (student) {
        await supabaseAdmin.from('students').delete().eq('id', student_id)
        await supabaseAdmin.auth.admin.deleteUser(student.user_id)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'delete_teacher') {
      const { teacher_id } = body
      const { data: teacher } = await supabaseAdmin.from('teachers').select('user_id').eq('id', teacher_id).single()
      if (teacher) {
        await supabaseAdmin.from('teachers').delete().eq('id', teacher_id)
        await supabaseAdmin.auth.admin.deleteUser(teacher.user_id)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update_student') {
      const { student_id, name, dob, parent_phone } = body
      const { data: student } = await supabaseAdmin.from('students').select('user_id').eq('id', student_id).single()
      if (student) {
        await supabaseAdmin.from('students').update({ dob, parent_phone }).eq('id', student_id)
        await supabaseAdmin.from('profiles').update({ name }).eq('user_id', student.user_id)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update_teacher') {
      const { teacher_id, name, phone, birth_year } = body
      const { data: teacher } = await supabaseAdmin.from('teachers').select('user_id').eq('id', teacher_id).single()
      if (teacher) {
        await supabaseAdmin.from('teachers').update({ phone, birth_year }).eq('id', teacher_id)
        await supabaseAdmin.from('profiles').update({ name }).eq('user_id', teacher.user_id)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'reset_password') {
      const { email, new_password } = body
      // Find the user by email
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = users?.users?.find(u => u.email === email)
      if (!targetUser) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      // Verify user belongs to same institute
      const { data: targetRole } = await supabaseAdmin.from('user_roles')
        .select('institute_id')
        .eq('user_id', targetUser.id)
        .single()
      if (!targetRole || targetRole.institute_id !== roleData.institute_id) {
        return new Response(JSON.stringify({ error: 'User not in your institute' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password: new_password })
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
