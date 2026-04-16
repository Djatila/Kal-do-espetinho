import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const CRAWLER_USER_AGENTS = [
    'facebookexternalhit',
    'Facebot',
    'WhatsApp',
    'Twitterbot',
    'LinkedInBot',
    'Googlebot',
    'bingbot',
    'Slackbot',
    'TelegramBot',
]

export async function middleware(request: NextRequest) {
    const userAgent = request.headers.get('user-agent') || ''
    
    // Permite que crawlers de redes sociais acessem a página sem passar pela autenticação
    const isCrawler = CRAWLER_USER_AGENTS.some(bot => userAgent.includes(bot))
    if (isCrawler) {
        return NextResponse.next()
    }
    
    return await updateSession(request)
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
