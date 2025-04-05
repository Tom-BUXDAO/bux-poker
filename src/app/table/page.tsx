'use client';

import { useSearchParams } from 'next/navigation';
import TablePage from '../table-update/page';

export default function Page() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  const playerId = searchParams.get('playerId');

  if (!tournamentId) {
    return <div>Invalid tournament ID</div>;
  }

  return <TablePage playerId={playerId || undefined} />;
} 