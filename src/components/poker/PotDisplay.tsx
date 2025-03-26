import Image from 'next/image';

// Define chip colors for different values (same as ChipStack)
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

interface PotDisplayProps {
  amount: number;
}

const PotDisplay: React.FC<PotDisplayProps> = ({ amount }) => {
  // Find the highest value chip that fits in the amount
  const getChipValue = (amount: number) => {
    const chipValues = [10000, 5000, 1000, 500, 200, 100, 50, 20, 10];
    return chipValues.find(value => value <= amount) || 10;
  };

  const chipValue = getChipValue(amount);

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1">
      <div className="text-xs font-bold text-white/80">TOTAL POT</div>
      <div className="flex items-center gap-2">
        <div className={`relative w-7 h-7 rounded-full ${getChipColor(chipValue)} flex items-center justify-center`}>
          <Image
            src="/poker-chip.svg"
            alt="Poker chip"
            width={28}
            height={28}
            className="opacity-90 brightness-200"
          />
        </div>
        <div className="bg-black/50 px-3 py-1.5 rounded-full text-yellow-400 text-sm font-bold">
          {amount}
        </div>
      </div>
    </div>
  );
};

export default PotDisplay; 