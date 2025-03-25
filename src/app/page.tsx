import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      {/* Hero Section */}
      <div className="w-full max-w-6xl mx-auto text-center py-16">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          BUX Poker
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          The Ultimate Multiplayer Poker Experience
        </p>
      </div>

      {/* Quick Access Grid */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {/* Development Card */}
        <a
          href="/dev"
          className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
            Development
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none ml-1">
              →
            </span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Test and develop poker features in a sandbox environment
          </p>
        </a>

        {/* Tables Card */}
        <a
          href="/tables"
          className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-4 text-green-600 dark:text-green-400">
            Tables
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none ml-1">
              →
            </span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Join active poker tables and start playing
          </p>
        </a>

        {/* Tournaments Card */}
        <a
          href="/tournaments"
          className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">
            Tournaments
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none ml-1">
              →
            </span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Browse and register for upcoming tournaments
          </p>
        </a>

        {/* Profile Card */}
        <a
          href="/profile"
          className="group p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-4 text-red-600 dark:text-red-400">
            Profile
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none ml-1">
              →
            </span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            View your stats and manage your account
          </p>
        </a>
      </div>

      {/* Features Section */}
      <div className="w-full max-w-6xl mx-auto mt-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Real-time Gameplay</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Experience smooth, real-time poker action with WebSocket technology
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Discord Integration</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Seamlessly connect with your Discord community
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Tournament System</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Organize and participate in exciting poker tournaments
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
