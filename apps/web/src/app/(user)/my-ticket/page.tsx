'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyTicketRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/tickets'); }, [router]);
  return null;
}
