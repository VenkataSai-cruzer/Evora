import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-white">Forgot password</h1>
        <p className="mt-2 text-sm text-text-secondary">Contact support to reset your password.</p>
        <Link href="/auth/login" className="mt-6 inline-block text-sm text-primary">&larr; Back to sign in</Link>
      </div>
    </div>
  );
}
