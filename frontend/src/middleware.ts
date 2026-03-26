import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public PWA assets without auth
    if (
        pathname === '/sw.js' ||
        pathname.startsWith('/icon-') ||
        pathname.startsWith('/screenshot-')
    ) {
        return NextResponse.next()
    }

    const token = request.cookies.get('auth_token')?.value || ''

    const isAppRoute = pathname.startsWith('/app')
    const isLoginPage = pathname === '/app/login'

    // Redirect to login if trying to access app routes without token
    if (isAppRoute && !isLoginPage && !token) {
        const url = request.nextUrl.clone()
        url.pathname = '/app/login'
        return NextResponse.redirect(url)
    }

    // Redirect to dashboard if logged in and trying to access login page
    if (isLoginPage && token) {
        const url = request.nextUrl.clone()
        url.pathname = '/app'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)',],
}
