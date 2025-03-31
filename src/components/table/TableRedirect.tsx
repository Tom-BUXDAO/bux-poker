'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TableRedirectProps {
  tableId: string;
}

export default function TableRedirect({ tableId }: TableRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    // Get player info from localStorage
    const storedPlayer = localStorage.getItem('pokerPlayer');
    if (storedPlayer) {
      const player = JSON.parse(storedPlayer);
      router.replace(`/table/${tableId}/${player.name}`);
    } else {
      router.replace('/dev'); // Redirect to dev page if no player info
    }
  }, [tableId, router]);

  // Return null while redirecting
  return null;
} 