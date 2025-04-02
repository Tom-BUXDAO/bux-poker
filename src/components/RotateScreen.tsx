export default function RotateScreen() {
  return (
    <div className="portrait:fixed portrait:inset-0 portrait:z-50 portrait:flex portrait:items-center portrait:justify-center portrait:bg-gray-900 landscape:hidden">
      <div className="text-center px-4">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-[spin_3s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5V19a2 2 0 002 2h4a2 2 0 002-2v-5a2 2 0 00-2-2h-.5M7 16H6a2 2 0 01-2-2V9a2 2 0 012-2h4a2 2 0 012 2v1" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12h.01M9 15l3-3m0 0l3 3m-3-3v6" />
        </svg>
        <h2 className="text-xl font-bold text-white mb-2">Please Rotate Your Device</h2>
        <p className="text-gray-400">For the best experience, please use landscape orientation.</p>
      </div>
    </div>
  );
} 