'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldVerificationsRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/orders'); }, [router]);
  return null;
}
