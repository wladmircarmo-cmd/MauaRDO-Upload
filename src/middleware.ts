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

  // Verificação de Autorização (Whitelist e Domínio)
  if (user && !isAuthPage) {
    const isMauaEmail = user.email?.endsWith('@estaleiromaua.ind.br');
    
    // Verificação de Autorização (Sempre checa a Whitelist em tempo real usando ADMIN)
    const admin = createSupabaseAdminClient();
    let userRole = null;
    
    // 1. Tenta buscar na whitelist (authorized_users) - É o controle mestre
    const { data: authUser } = await admin
      .from('authorized_users')
      .select('role')
      .eq('email', user.email)
      .maybeSingle();
    
    if (authUser) {
      userRole = authUser.role;
    } else {
      // 2. Se não estiver na whitelist, checa se é o Owner (contingência)
      if (user.email === 'wladmir.carmo@estaleiromaua.ind.br') {
        userRole = 'owner';
      }
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
