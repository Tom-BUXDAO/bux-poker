import PokerTable from '@/components/poker/PokerTable';

export default function TablePage({ params }: { params: { tableId: string } }) {
  return (
    <div className="h-[calc(100vh-40px)] overflow-hidden">
      <PokerTable tableId={params.tableId} />
    </div>
  );
} 