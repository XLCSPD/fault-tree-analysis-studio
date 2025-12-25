import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']

export function useUser() {
  const [user, setUser] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createClient()
    
    async function getUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          setUser(null)
          setOrganization(null)
          setLoading(false)
          return
        }
        
        // Get profile
        const { data: profile, error: profileError } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single() as unknown as Promise<{ data: Profile | null, error: any }>)

        if (profileError) throw profileError
        if (!profile) throw new Error('Profile not found')

        setUser(profile)

        // Get organization
        const { data: org, error: orgError } = await (supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single() as unknown as Promise<{ data: Organization | null, error: any }>)
          
        if (orgError) throw orgError
        
        setOrganization(org)
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
        setOrganization(null)
      } finally {
        setLoading(false)
      }
    }
    
    getUser()
    
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      getUser()
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  return {
    user,
    organization,
    loading,
    isAdmin: user?.role === 'admin',
  }
}