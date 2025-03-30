'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/tournament/dev-tournament');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-800">
      <div className="text-white">Redirecting to tournament lobby...</div>
    </div>
  );
}
