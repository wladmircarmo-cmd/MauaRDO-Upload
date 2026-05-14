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
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && session) {
      const user = session.user;
      
      // Registrar log de Login no Servidor usando ADMIN (Infalível para Tablets/Produção)
      try {
        const admin = createSupabaseAdminClient();
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'internal';
        
        await admin.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email,
          action_type: 'LOGIN',
          ip_address: ip,
          details: { 
            method: 'google_oauth_admin',
            device: 'server_callback'
          }
        });
      } catch (logErr) {
        console.error("Server-side admin login log failed:", logErr);
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
