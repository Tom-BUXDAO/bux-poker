import { LoginButton } from '@/app/tournament/[id]/LoginButton';

export default function SignIn() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Welcome to BUX Poker
          </h1>
          <p className="text-gray-400">
            Sign in with Discord to join tournaments and track your progress
          </p>
        </div>
        
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  );
} 