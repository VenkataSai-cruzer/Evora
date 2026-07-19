# Authentication Design — Jamming Events Platform

## 1. Authentication Strategy

**Library:** NextAuth.js (Auth.js v5)
**Provider:** Credentials (email + password) + Google OAuth
**Session Strategy:** JWT (stateless, no database sessions)

---

## 2. Auth Flow

### Email/Password Registration

```
[Client] → POST /api/auth/register
  Body: { email, password, displayName }
  Server:
    1. Validate input (Zod)
    2. Check email uniqueness
    3. Hash password (bcrypt, cost factor 12)
    4. Create user record
    5. Generate email verification token
    6. Send verification email (Phase 2)
    7. Return success (auto-login)

[Client] → POST /api/auth/login
  Body: { email, password }
  Server:
    1. Validate input
    2. Find user by email
    3. Compare password hash (bcrypt.compare)
    4. Generate JWT session
    5. Set HTTP-only cookie
    6. Return user data
```

### Google OAuth Flow

```
[Client] → Click "Continue with Google"
  → Redirect to Google OAuth consent screen
  → User approves
  → Redirect back to /api/auth/callback/google
  → NextAuth handles token exchange
  → Find or create user by Google email
  → Generate JWT session
  → Redirect to origin page
```

---

## 3. Session Strategy

### JWT Structure

```typescript
interface SessionToken {
  sub: string;           // User ID
  email: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
  name: string;
  iat: number;           // Issued at
  exp: number;           // Expiry (15 minutes)
}
```

### Refresh Token Strategy

- **Access token:** 15 minutes (JWT)
- **Refresh token:** 7 days (stored in HTTP-only cookie)
- On expiry: NextAuth auto-refreshes via `/api/auth/session`
- On refresh failure: Force re-login

### Cookie Configuration

```typescript
cookies: {
  sessionToken: {
    name: 'jamming.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
}
```

---

## 4. Middleware Protection

```typescript
// src/middleware.ts
export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/tickets/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/api/tickets/:path*',
    '/api/checkin/:path*',
    '/api/events/:path*',
  ],
};
```

### Role-Based Access Control

```typescript
// Route protection patterns
const routes = {
  // Any authenticated user
  'user-only': ['/tickets', '/profile'],
  
  // Organizer role required
  'organizer-only': [
    '/dashboard',
    '/dashboard/events/new',
    '/dashboard/events/:id/edit',
    '/dashboard/events/:id/checkin',
  ],
  
  // Admin only
  'admin-only': ['/admin'],
};
```

### Permission Enforcement (API Level)

```typescript
// /api/events/[id]/checkin route
async function handler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const event = await getEvent(req.params.id);
  if (event.organizerId !== session.user.id && session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // ... proceed with check-in logic
}
```

---

## 5. Email Verification

### Phase 1: In-App Verification

In Phase 1 (no email service), verification is handled in-app:

```
[Register] → Create user (emailVerified: false)
  → Generate 6-digit verification code (expires 24h)
  → Store code hash in database
  → Display code on-screen in registration success page
  → User enters code in verification form

[Verify] → POST /api/auth/verify-email
  Body: { code }
  Server:
    1. Hash code and compare with stored hash
    2. Check expiry
    3. Mark emailVerified: true
    4. Delete verification token
    5. Return success
```

**Restrictions for unverified users:**
- Can browse events and RSVP for free events
- CANNOT create events
- CANNOT purchase paid tickets
- CANNOT become organizer

### Phase 2: Email Verification

When email service is integrated:

```
[Register] → Create user (emailVerified: false)
  → Generate 6-digit verification token (expires 24h)
  → Store token hash in database
  → Send verification email via SendGrid/Resend
  → User clicks link in email

[Verify] → POST /api/auth/verify-email
  Body: { token }
  Server:
    1. Hash token and compare with stored hash
    2. Check expiry
    3. Mark emailVerified: true
    4. Delete verification token
    5. Return success
```

---

## 6. Password Reset Flow

```
[Request Reset] → POST /api/auth/forgot-password
  Body: { email }
  Server:
    1. Find user by email
    2. Generate reset token (crypto.randomBytes(32))
    3. Store hashed token + expiry (1 hour)
    4. Send reset email (Phase 2)

[Reset Password] → POST /api/auth/reset-password
  Body: { token, newPassword }
  Server:
    1. Hash token and compare
    2. Check expiry
    3. Update password (bcrypt hash)
    4. Invalidate all existing sessions
    5. Return success
```

---

## 7. Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcrypt with cost factor 12 |
| Rate limiting | 5 login attempts per IP per 15 minutes |
| Brute force protection | Progressive delay after failed attempts |
| Session invalidation | On password change, force re-login |
| CSRF protection | SameSite cookie + CSRF token for forms |
| Password policy | Min 8 chars, 1 uppercase, 1 number |
| Email verification | Required for elevated privileges |
| Token expiry | 15 min for access, 7 days for refresh |

---

## 8. Auth API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register new user |
| `/api/auth/login` | POST | No | Login (email/password) |
| `/api/auth/logout` | POST | Yes | Logout, clear session |
| `/api/auth/session` | GET | Optional | Get current session |
| `/api/auth/verify-email` | POST | Yes | Verify email with token |
| `/api/auth/forgot-password` | POST | No | Request password reset |
| `/api/auth/reset-password` | POST | No | Reset password with token |
| `/api/auth/csrf` | GET | No | Get CSRF token |

---

## 9. NextAuth Configuration

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcrypt';
import prisma from './prisma';

export const authOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        
        if (!user || !user.passwordHash) return null;
        
        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        
        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};
```

---

## 10. Guest User (Phase 2)

For guest RSVPs (no account):

```typescript
interface GuestTicket {
  id: string;
  eventId: string;
  email: string;
  guestName: string;
  ticketNumber: string;
  qrDataUrl: string;
  expiresAt: Date; // 7 days after event
}
```

- Guests are stored in a separate `GuestTicket` table
- Limited functionality: cannot cancel, no profile, no history
- Email is required for verification (QR contains hashed email)
- Guest tickets cannot be transferred or refunded
- Prompted to create account after RSVP
