export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/admin/:path*',
  ],
};

// Note: /tickets and /tickets/* are NOT middleware-protected
// because they do their own auth check server-side to support
// both authenticated viewing and public redirect cases.
