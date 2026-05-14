import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action_type, user_id, user_email, details } = body;

    const admin = createSupabaseAdminClient();
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'internal_api';

    const { error } = await admin.from('audit_logs').insert({
      user_id,
      user_email,
      action_type,
      ip_address: ip,
      details: {
        ...details,
        source: 'api_route'
      }
    });

    if (error) {
      console.error('API Log Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('API Log Panic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
