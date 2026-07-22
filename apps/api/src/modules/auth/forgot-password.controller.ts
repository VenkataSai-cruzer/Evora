import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma.js';
import { sendEmail } from '../../infrastructure/email/email.service.js';

/**
 * POST /auth/forgot-password
 *
 * Accepts email. Always returns the same message regardless of whether the
 * email exists (prevents email enumeration).
 */
export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { email } = request.body as { email: string };

  if (!email?.trim()) {
    return reply.status(400).send({ error: 'Email is required' });
  }

  // Always return the same message — never reveal whether email exists
  const responseMessage = 'If this email exists, a password reset link has been sent.';

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    // Still return success to prevent email enumeration
    return reply.send({ message: responseMessage });
  }

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Invalidate any previous reset tokens, then create new one
  await prisma.$transaction(async (tx) => {
    // Mark old tokens as used
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new token (expires in 15 minutes)
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  });

  // Send email with reset link
  const frontendUrl = process.env.FRONTEND_URL || 'https://evora.7notes.workers.dev';
  const resetLink = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

  await sendEmail(
    {
      to: user.email,
      subject: 'Reset your 7 NOTES password',
      text: `Dear ${user.name},\n\nA password reset was requested for your account.\n\nClick this link to reset your password (expires in 15 minutes):\n${resetLink}\n\nIf you didn't request this, please ignore this email.\n\n7 NOTES Team`,
      html: `<p>Dear <strong>${user.name}</strong>,</p>
<p>A password reset was requested for your account.</p>
<p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a></p>
<p>Or paste this link: <a href="${resetLink}">${resetLink}</a></p>
<p>This link expires in <strong>15 minutes</strong>.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>— 7 NOTES Team</p>`,
    },
    'ANNOUNCEMENT',
    user.id,
    { type: 'password_reset' },
  );

  return reply.send({ message: responseMessage });
}

/**
 * POST /auth/reset-password
 *
 * Validates the reset token and updates the password.
 * Invalidates all sessions after password change.
 */
export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { token, password } = request.body as { token: string; password: string };

  if (!token || !password) {
    return reply.status(400).send({ error: 'Token and password are required' });
  }

  if (password.length < 8) {
    return reply.status(400).send({ error: 'Password must be at least 8 characters' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken) {
    return reply.status(400).send({ error: 'Invalid or expired reset token' });
  }

  if (resetToken.usedAt) {
    return reply.status(400).send({ error: 'This reset link has already been used' });
  }

  if (resetToken.expiresAt < new Date()) {
    return reply.status(400).send({ error: 'This reset link has expired. Please request a new one.' });
  }

  // Update password, invalidate token and all sessions
  await prisma.$transaction(async (tx) => {
    const passwordHash = await bcrypt.hash(password, 12);

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Mark token as used
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all sessions
    await tx.session.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  return reply.send({ message: 'Password has been reset successfully. Please log in with your new password.' });
}

/**
 * GET /auth/reset-password/:token
 *
 * Validates whether a reset token is still valid.
 * Returns 200 if valid, 400 if expired/used.
 */
export async function validateResetToken(request: FastifyRequest, reply: FastifyReply) {
  const { token } = request.params as { token: string };

  if (!token) {
    return reply.status(400).send({ error: 'Token is required' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken) {
    return reply.status(400).send({ error: 'Invalid reset token' });
  }

  if (resetToken.usedAt) {
    return reply.status(400).send({ error: 'This reset link has already been used' });
  }

  if (resetToken.expiresAt < new Date()) {
    return reply.status(400).send({ error: 'This reset link has expired' });
  }

  return reply.send({ valid: true });
}
