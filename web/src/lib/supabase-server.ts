import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => Array.from(cookieStore.getAll()).map(cookie => ({
          name: cookie.name,
          value: cookie.value
        })),
        setAll: (cookies) => {
          cookies.forEach(cookie => {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          });
        }
      },
    }
  );
}

// Remove the old client since it's not being used 