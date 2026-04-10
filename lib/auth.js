import { supabase } from './supabase'

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, stores(*)')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// Invite a new employee (manager only)
export async function inviteEmployee(email, storeId, role = 'employee') {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { store_id: storeId, role }
  })
  if (error) throw error
  return data
}
