
import { supabase } from '../lib/supabase'

export const authService = {
  login(email: string, password: string) {
    return supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
  },

  register(
    nombre: string,
    email: string,
    password: string
  ) {
    return supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: nombre.trim(),
        },
        emailRedirectTo: window.location.origin,
      },
    })
  },

  logout() {
    return supabase.auth.signOut()
  },
  
  loginWithDiscord() {
    return supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    })
  },

  loginWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/home`,
      },
    })
  },

    
  forgotPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  },

  updatePassword(password: string) {
    return supabase.auth.updateUser({
      password,
    })
  },

}
