import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your 7 NOTES account password.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-white">
          ✦ 7 NOTES
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-white">Forgot password</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Password reset is not yet available. Please contact the organizer for help.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
