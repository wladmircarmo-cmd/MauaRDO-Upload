import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await updateSession(request)
  
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isLoginPage && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url, {
      headers: response.headers,
    })
  }

  // Log de Login Automático (Rede de Segurança Master)
  if (user && !request.cookies.has('rdo_audit_login')) {
    try {
      const admin = createSupabaseAdminClient();
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : 'middleware-api';
      
      await admin.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action_type: 'LOGIN',
        ip_address: ip,
        details: { method: 'middleware_auto_log', device: 'next_middleware' }
      });
      
      // Marcar como logado para não repetir nesta sessão
      response.cookies.set('rdo_audit_login', 'true', { maxAge: 60 * 60 * 24 }); // 24h
    } catch (e) {
      console.error('Middleware Log Error:', e);
    }
  }

  // Verificação de Autorização (Whitelist e Domínio)
  if (user && !isAuthPage) {
    const isMauaEmail = user.email?.endsWith('@estaleiromaua.ind.br');
    
    // Buscar perfil (usando logica de admin para não depender de RLS no middleware)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    // Se falhar em pegar o perfil, tentamos buscar na whitelist diretamente
    let userRole = profile?.role;
    if (!userRole) {
       const { data: authUser } = await supabase
         .from('authorized_users')
         .select('role')
         .eq('email', user.email)
         .maybeSingle();
       userRole = authUser?.role;
    }

    // Contingência Master para o Owner
    if (user.email === 'wladmir.carmo@estaleiromaua.ind.br') {
      userRole = 'owner';
    }

    const isGuest = !userRole || userRole === 'guest';

    console.log('--- DEBUG MIDDLEWARE ---');
    console.log('Email:', user.email);
    console.log('isMauaEmail:', isMauaEmail);
    console.log('userRole:', userRole);
    console.log('isGuest:', isGuest);
    console.log('Pathname:', request.nextUrl.pathname);

    // Bloqueia qualquer usuário que não esteja na whitelist (isGuest), independente do domínio
    if (isGuest && !isLoginPage) {
      console.log('REDIRECTING TO LOGIN: NOT IN WHITELIST');
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

    // Proteção da Rota Admin
    const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
    const isOwner = user.email === 'wladmir.carmo@estaleiromaua.ind.br';
    
    if (isAdminPage && !isOwner && userRole !== 'admin' && userRole !== 'owner') {
      console.log('BLOCKING ADMIN ACCESS: NOT AUTHORIZED');
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Se já estiver logado e autorizado, não deixa voltar para a tela de login
    if (!isGuest && isMauaEmail && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
