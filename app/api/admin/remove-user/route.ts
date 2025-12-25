import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function POST(request: Request) {
  try {
    const { profileId, organizationId } = await request.json()

    if (!profileId || !organizationId) {
      return NextResponse.json(
        { message: 'Missing required fields: profileId, organizationId' },
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
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single<{ role: string; organization_id: string }>()

    if (profileError || !adminProfile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 })
    }

    if (adminProfile.role !== 'admin' || adminProfile.organization_id !== organizationId) {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Prevent self-removal
    if (profileId === user.id) {
      return NextResponse.json(
        { message: 'Cannot remove yourself from the organization' },
        { status: 400 }
      )
    }

    // Use admin client for deletion
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

    // Verify the target profile belongs to this organization
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, organization_id, email')
      .eq('id', profileId)
      .single<{ id: string; organization_id: string; email: string }>()

    if (targetError || !targetProfile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (targetProfile.organization_id !== organizationId) {
      return NextResponse.json(
        { message: 'User does not belong to this organization' },
        { status: 400 }
      )
    }

    // Delete the profile (this will cascade due to FK constraints)
    const { error: deleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', profileId)

    if (deleteError) {
      console.error('Delete profile error:', deleteError)
      return NextResponse.json({ message: deleteError.message }, { status: 400 })
    }

    // Optionally delete the auth user as well
    // Note: This completely removes the user from the system
    // Uncomment if you want to delete the auth user too:
    // const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(profileId)
    // if (authDeleteError) {
    //   console.error('Delete auth user error:', authDeleteError)
    // }

    return NextResponse.json({
      success: true,
      message: 'User removed from organization successfully',
    })
  } catch (error) {
    console.error('Remove user error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
