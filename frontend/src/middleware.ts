import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value || ''
    const { pathname } = request.nextUrl

    // Protected routes start with these prefixes
    const protectedRoutes = ['/', '/billing', '/stock', '/purchases', '/reports', '/parties', '/returns', '/settings']

    const isProtectedRoute = protectedRoutes.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    )

    // Redirect to login if trying to access protected route without token
    if (isProtectedRoute && !token && pathname !== '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect to dashboard if logged in and trying to access login page
    if (pathname === '/login' && token) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)',],
}
