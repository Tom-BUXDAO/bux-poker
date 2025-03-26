import Image from 'next/image';
import { TablePosition } from '@/types/poker';

// Define chip colors for different values
const getChipColor = (value: number): string => {
  switch (value) {
    case 10: return 'bg-gray-500';     // Gray
    case 20: return 'bg-red-600';      // Red
    case 50: return 'bg-green-600';    // Green
    case 100: return 'bg-black';       // Black
    case 200: return 'bg-purple-600';  // Purple
    case 500: return 'bg-blue-600';    // Blue
    case 1000: return 'bg-yellow-500'; // Yellow
    case 5000: return 'bg-pink-600';   // Pink
    case 10000: return 'bg-orange-500';// Orange
    default: return 'bg-gray-500';     // Default gray
  }
};

interface ChipStackProps {
  amount: number;
  position: TablePosition;
}

const ChipStack: React.FC<ChipStackProps> = ({ amount, position }) => {
  // Determine chip position based on seat position
  const getChipPosition = () => {
    switch (position) {
      case 1: // Top left
      case 2: // Top right
        return 'absolute -bottom-24 left-1/2 transform -translate-x-1/2 flex items-center gap-2';
      case 3: // Right top
        return 'absolute -bottom-14 -left-24 flex flex-row-reverse items-center gap-2';
      case 4: // Right bottom
        return 'absolute -top-14 -left-24 flex flex-row-reverse items-center gap-2';
      case 5: // Bottom right
      case 6: // Bottom left
        return 'absolute -top-24 left-1/2 transform -translate-x-1/2 flex items-center gap-2';
      case 7: // Left bottom
        return 'absolute -top-14 -right-24 flex items-center gap-2';
      case 8: // Left top
        return 'absolute -bottom-14 -right-24 flex items-center gap-2';
    }
  };

  // Find the highest value chip that fits in the amount
  const getChipValue = (amount: number) => {
    const chipValues = [10000, 5000, 1000, 500, 200, 100, 50, 20, 10];
    return chipValues.find(value => value <= amount) || 10;
  };

  const chipValue = getChipValue(amount);

  return (
    <div className={getChipPosition()}>
      <div className={`relative w-6 h-6 rounded-full ${getChipColor(chipValue)} flex items-center justify-center`}>
        <Image
          src="/poker-chip.svg"
          alt="Poker chip"
          width={24}
          height={24}
          className="opacity-90 brightness-200"
        />
      </div>
      <div className="bg-black/50 px-2 py-1 rounded-full text-yellow-400 text-xs font-bold">
        {amount}
      </div>
    </div>
  );
};

export default ChipStack; 