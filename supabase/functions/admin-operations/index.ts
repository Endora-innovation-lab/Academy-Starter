
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

    // Verify the calling user via JWT claims (works with new signing-keys system)
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
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
      const { name, reg_no, dob, parent_phone, parent_name, gender, emergency_contact } = body
      const email = `${reg_no.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.academy.local`
      const password = dob // dd-mm-yyyy format

      // Try to create auth user, handle duplicate by cleaning up orphan
      let newUser: any
      const { data: firstTry, error: firstError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'student' }
      })

      if (firstError && firstError.message.includes('already been registered')) {
        // Find and clean up orphaned auth user
        let page = 1
        let found = null
        while (!found) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 })
          if (!users || users.length === 0) break
          found = users.find(u => u.email === email)
          page++
        }
        if (found) {
          await supabaseAdmin.from('fees').delete().eq('student_id', found.id)
          await supabaseAdmin.from('batch_students').delete().eq('student_id', found.id)
          await supabaseAdmin.from('attendance').delete().eq('student_id', found.id)
          await supabaseAdmin.from('students').delete().eq('user_id', found.id)
          await supabaseAdmin.from('user_roles').delete().eq('user_id', found.id)
          await supabaseAdmin.from('profiles').delete().eq('user_id', found.id)
          await supabaseAdmin.auth.admin.deleteUser(found.id)
        }
        // Retry creation
        const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role: 'student' }
        })
        if (retryError) {
          return new Response(JSON.stringify({ error: retryError.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        newUser = retryData
      } else if (firstError) {
        return new Response(JSON.stringify({ error: firstError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        newUser = firstTry
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
        parent_phone,
        parent_name: parent_name || null,
        gender: gender || null,
        emergency_contact: emergency_contact || null,
      }).select().single()

      if (studentError) {
        return new Response(JSON.stringify({ error: studentError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Auto-create unpaid fee record for current month
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      await supabaseAdmin.from('fees').insert({
        student_id: studentData.id,
        institute_id: roleData.institute_id,
        month: currentMonth,
        status: 'unpaid',
      })

      return new Response(JSON.stringify({
        success: true,
        student: studentData,
        credentials: { username: reg_no, password: dob }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'create_teacher') {
      const { name, email, phone, birth_year, gender, date_of_birth, blood_group, emergency_contact } = body
      const password = phone.slice(-4) + birth_year

      // Try to create auth user, handle duplicate by cleaning up orphan
      let newUser: any
      const { data: firstTry, error: firstError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'teacher' }
      })

      if (firstError && firstError.message.includes('already been registered')) {
        let page = 1
        let found = null
        while (!found) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 })
          if (!users || users.length === 0) break
          found = users.find(u => u.email === email)
          page++
        }
        if (found) {
          await supabaseAdmin.from('batch_teachers').delete().eq('teacher_id', found.id)
          await supabaseAdmin.from('teachers').delete().eq('user_id', found.id)
          await supabaseAdmin.from('user_roles').delete().eq('user_id', found.id)
          await supabaseAdmin.from('profiles').delete().eq('user_id', found.id)
          await supabaseAdmin.auth.admin.deleteUser(found.id)
        }
        const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role: 'teacher' }
        })
        if (retryError) {
          return new Response(JSON.stringify({ error: retryError.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        newUser = retryData
      } else if (firstError) {
        return new Response(JSON.stringify({ error: firstError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } else {
        newUser = firstTry
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
        birth_year,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        blood_group: blood_group || null,
        emergency_contact: emergency_contact || null,
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

    const forbidden = () => new Response(JSON.stringify({ error: 'Record not in your institute' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    if (action === 'delete_student') {
      const { student_id } = body
      // Get the student's user_id (scoped to the caller's institute)
      const { data: student } = await supabaseAdmin.from('students').select('user_id, institute_id').eq('id', student_id).single()
      if (!student || student.institute_id !== roleData.institute_id) return forbidden()
      await supabaseAdmin.from('students').delete().eq('id', student_id).eq('institute_id', roleData.institute_id)
      await supabaseAdmin.auth.admin.deleteUser(student.user_id)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'delete_teacher') {
      const { teacher_id } = body
      const { data: teacher } = await supabaseAdmin.from('teachers').select('user_id, institute_id').eq('id', teacher_id).single()
      if (!teacher || teacher.institute_id !== roleData.institute_id) return forbidden()
      await supabaseAdmin.from('teachers').delete().eq('id', teacher_id).eq('institute_id', roleData.institute_id)
      await supabaseAdmin.auth.admin.deleteUser(teacher.user_id)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update_student') {
      const { student_id, name, dob, parent_phone, reg_no, status, parent_name, gender, emergency_contact } = body
      const { data: student } = await supabaseAdmin.from('students').select('user_id, reg_no, dob, institute_id').eq('id', student_id).single()
      if (!student || student.institute_id !== roleData.institute_id) return forbidden()
      {

        const stuPatch: any = {}
        if (dob !== undefined) stuPatch.dob = dob
        if (parent_phone !== undefined) stuPatch.parent_phone = parent_phone
        if (reg_no !== undefined) stuPatch.reg_no = reg_no
        if (status !== undefined) stuPatch.status = status
        if (parent_name !== undefined) stuPatch.parent_name = parent_name
        if (gender !== undefined) stuPatch.gender = gender
        if (emergency_contact !== undefined) stuPatch.emergency_contact = emergency_contact
        if (Object.keys(stuPatch).length > 0) {
          await supabaseAdmin.from('students').update(stuPatch).eq('id', student_id)
        }
        const profPatch: any = {}
        if (name !== undefined) profPatch.name = name

        // Sync login credentials when reg_no or dob change.
        // Login email = `<reg_no normalized>@student.academy.local`, password = dob.
        const authPatch: any = {}
        if (reg_no !== undefined && reg_no !== student.reg_no) {
          const newEmail = `${String(reg_no).toLowerCase().replace(/[^a-z0-9]/g, '')}@student.academy.local`
          authPatch.email = newEmail
          authPatch.email_confirm = true
          profPatch.email = newEmail
        }
        if (dob !== undefined && dob !== student.dob) {
          authPatch.password = dob
        }
        if (Object.keys(profPatch).length > 0) {
          await supabaseAdmin.from('profiles').update(profPatch).eq('user_id', student.user_id)
        }
        if (Object.keys(authPatch).length > 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(student.user_id, authPatch)
          if (authErr) {
            return new Response(JSON.stringify({ error: authErr.message }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'update_teacher') {
      const { teacher_id, name, phone, birth_year, email, gender, date_of_birth, blood_group, emergency_contact } = body
      const { data: teacher } = await supabaseAdmin.from('teachers').select('user_id, phone, birth_year, institute_id').eq('id', teacher_id).single()
      if (!teacher || teacher.institute_id !== roleData.institute_id) return forbidden()
      {
        const tPatch: any = { phone, birth_year }
        if (gender !== undefined) tPatch.gender = gender
        if (date_of_birth !== undefined) tPatch.date_of_birth = date_of_birth || null
        if (blood_group !== undefined) tPatch.blood_group = blood_group
        if (emergency_contact !== undefined) tPatch.emergency_contact = emergency_contact
        await supabaseAdmin.from('teachers').update(tPatch).eq('id', teacher_id)
        const profPatch: any = {}
        if (name !== undefined) profPatch.name = name
        if (email !== undefined) profPatch.email = email
        if (Object.keys(profPatch).length > 0) {
          await supabaseAdmin.from('profiles').update(profPatch).eq('user_id', teacher.user_id)
        }
        const authPatch: any = {}
        if (email !== undefined) {
          authPatch.email = email
          authPatch.email_confirm = true
        }
        // Always sync password to canonical format: last4(phone) + birth_year
        const newPhone = phone !== undefined ? phone : teacher.phone
        const newBirthYear = birth_year !== undefined ? birth_year : teacher.birth_year
        let passwordUpdated = false
        if (newPhone && newBirthYear) {
          const oldPhoneStr = String(teacher.phone ?? '')
          const oldYearStr = String(teacher.birth_year ?? '')
          const newPhoneStr = String(newPhone)
          const newYearStr = String(newBirthYear)
          if (oldPhoneStr !== newPhoneStr || oldYearStr !== newYearStr) {
            authPatch.password = newPhoneStr.slice(-4) + newYearStr
            passwordUpdated = true
          }
        }
        if (Object.keys(authPatch).length > 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(teacher.user_id, authPatch)
          if (authErr) {
            return new Response(JSON.stringify({ error: authErr.message }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
        return new Response(JSON.stringify({ success: true, password_updated: passwordUpdated, new_password: passwordUpdated ? authPatch.password : undefined }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
