import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function POST(request: Request) {
  try {
    const { email, role, organizationId } = await request.json()

    if (!email || !role || !organizationId) {
      return NextResponse.json(
        { message: 'Missing required fields: email, role, organizationId' },
        { status: 400 }
      )
    }

    // Verify the requesting user is an admin using server client
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin in the organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single<{ role: string; organization_id: string }>()

    if (profileError || !profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'admin' || profile.organization_id !== organizationId) {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Use admin client to invite user
    const adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    if (existingUser) {
      // Check if user is already in this organization
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, organization_id')
        .eq('id', existingUser.id)
        .single()

      if (existingProfile) {
        if (existingProfile.organization_id === organizationId) {
          return NextResponse.json(
            { message: 'User is already a member of this organization' },
            { status: 400 }
          )
        } else {
          return NextResponse.json(
            { message: 'User belongs to a different organization' },
            { status: 400 }
          )
        }
      }
    }

    // Invite the user
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          organization_id: organizationId,
          role: role,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      }
    )

    if (inviteError) {
      console.error('Invite error:', inviteError)
      return NextResponse.json({ message: inviteError.message }, { status: 400 })
    }

    // Create the profile for the invited user
    if (inviteData.user) {
      const { error: createProfileError } = await adminClient.from('profiles').insert({
        id: inviteData.user.id,
        email: email,
        organization_id: organizationId,
        role: role,
      })

      if (createProfileError) {
        console.error('Create profile error:', createProfileError)
        // Don't fail the whole operation, the profile can be created on first login
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      userId: inviteData.user?.id,
    })
  } catch (error) {
    console.error('Invite user error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
