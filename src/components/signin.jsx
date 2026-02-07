'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'

export default function GoogleSignIn() {
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  return (
    <Button onClick={handleGoogleSignIn}>
      Sign in with Google
    </Button>
  )
}