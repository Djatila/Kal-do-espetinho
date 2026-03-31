import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        'https://mtvehkyansdqiwpddwwa.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dmVoa3lhbnNkcWl3cGRkd3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjA0NTcsImV4cCI6MjA3NDAzNjQ1N30.6nwYHvgW5KrYfVV-pSLEZicY-Nre6ZPoLLxJkc61WoU',
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (user && user.user_metadata?.funcao === 'atendente') {
        const url = request.nextUrl.clone()
        if (url.pathname.startsWith('/dashboard') && url.pathname !== '/dashboard/pdv') {
            url.pathname = '/dashboard/pdv'
            return NextResponse.redirect(url)
        }
    }

    return response
}
