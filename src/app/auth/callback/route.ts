import { NextResponse } from 'next/server'
// The client you created in Step 2
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Registrar log de Login
      try {
        const admin = createSupabaseAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const forwarded = request.headers.get('x-forwarded-for');
          const ip = forwarded ? forwarded.split(',')[0] : 'internal';
          
          await admin.from('audit_logs').insert({
            user_id: user.id,
            user_email: user.email,
            action_type: 'LOGIN',
            ip_address: ip,
            details: {
              method: 'google_oauth',
              user_agent: request.headers.get('user-agent')
            }
          });
        }
      } catch (logError) {
        console.error("Login log error:", logError);
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that origin is localhost
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}
