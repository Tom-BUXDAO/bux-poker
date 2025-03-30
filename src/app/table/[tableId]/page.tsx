'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PokerTable from '@/components/poker/PokerTable';

export default function TablePage({ params }: { params: { tableId: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Get player info from localStorage
    const storedPlayer = localStorage.getItem('pokerPlayer');
    if (storedPlayer) {
      const player = JSON.parse(storedPlayer);
      router.replace(`/table/${params.tableId}/${player.name}`);
    } else {
      router.replace('/dev'); // Redirect to dev page if no player info
    }
  }, [params.tableId, router]);

  return null;
} 