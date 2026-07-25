import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma.js';
import {
  generateSessionToken,
  hashToken,
} from '../../middleware/authentication.js';
import { generateCsrfToken } from '../../middleware/csrf.js';

/**
 * Compute the roles this user is allowed to act as.
 * An ADMIN can also act as ORGANIZER if they have any organizer assignments.
 * Other users have only their base role.
 */
async function getAllowedRoles(userId: string, baseRole: string): Promise<string[]> {
  const roles = [baseRole];

  // ADMIN users with organizer assignments can switch to ORGANIZER workspace
  if (baseRole === 'ADMIN') {
    const assignmentCount = await prisma.organizerAssignment.count({
      where: { organizerId: userId },
    });
    if (assignmentCount > 0) {
      roles.push('ORGANIZER');
    }
  }

  // ADMIN users can also access SCANNER
  if (baseRole === 'ADMIN') {
    roles.push('SCANNER');
  }

  return roles;
}

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const { name, email, password } = request.body as {
      name: string;
      email: string;
      password: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'ATTENDEE' },
      select: { id: true, name: true, email: true, role: true },
    });

    const sessionToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const allowedRoles = await getAllowedRoles(user.id, user.role);

    const csrfToken = generateCsrfToken(sessionToken);

    reply.setCookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(201).send({
      user: { ...user, allowedRoles },
      csrfToken,
      sessionToken,
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Session fixation protection: revoke all previous sessions
    await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const sessionToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const allowedRoles = await getAllowedRoles(user.id, user.role);

    const csrfToken = generateCsrfToken(sessionToken);

    reply.setCookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedRoles,
      },
      csrfToken,
      sessionToken,
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const sessionToken = request.cookies?.session_token || (request.headers['x-session-token'] as string | undefined);
    if (sessionToken) {
      const tokenHash = hashToken(sessionToken);
      await prisma.session.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    reply.clearCookie('session_token', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return reply.send({ message: 'Logged out' });
  }

  async sessionHandler(request: FastifyRequest, _reply: FastifyReply) {
    // request.user is set by requireAuth middleware
    const user = request.user!;
    const allowedRoles = await getAllowedRoles(user.id, user.role);
    return {
      user: {
        ...user,
        allowedRoles,
      },
    };
  }

  async csrf(request: FastifyRequest, _reply: FastifyReply) {
    const sessionToken = request.cookies?.session_token || (request.headers['x-session-token'] as string | undefined);
    if (!sessionToken) {
      return { csrfToken: null };
    }
    return {
      csrfToken: generateCsrfToken(sessionToken),
    };
  }

  /**
   * POST /auth/active-role
   * Switch the active workspace role.
   * The backend validates that the user actually has this role.
   */
  async setActiveRole(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { role } = request.body as { role: string };
    const allowedRoles = await getAllowedRoles(request.user.id, request.user.role);

    if (!allowedRoles.includes(role)) {
      return reply.status(403).send({
        error: 'You do not have this role.',
        allowedRoles,
      });
    }

    // Update the user's effective role in the session response
    return reply.send({
      user: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
        role, // Return the switched role as the active one
        allowedRoles,
      },
    });
  }
}
