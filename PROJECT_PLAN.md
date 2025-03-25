# BUX Poker - Discord Tournament Platform

A multiplayer Texas Hold'em poker platform for hosting community tournaments through Discord integration. Players can register and play tournaments using their Discord accounts.

## Tech Stack
- Next.js + TypeScript
- Neon Tech Postgres
- Prisma ORM
- Discord.js
- Vercel (Deployment)
- NextAuth.js (Authentication)

## Project Timeline (4 Days)

### Day 1: Foundation Setup
- [ ] Project Initialization
  - [ ] Create Next.js project with TypeScript
  - [ ] Set up Git repository
  - [ ] Configure ESLint and Prettier
  - [ ] Create initial project structure

- [ ] Database Setup
  - [ ] Set up Neon Postgres database
  - [ ] Configure Prisma
  - [ ] Create database schema
  - [ ] Set up migrations
  - [ ] Implement database connection pooling

- [ ] Discord Integration Setup
  - [ ] Create Discord application
  - [ ] Set up bot
  - [ ] Configure permissions
  - [ ] Add bot to test server

- [ ] Authentication
  - [ ] Set up NextAuth.js
  - [ ] Configure Discord OAuth
  - [ ] Create authentication middleware
  - [ ] Implement protected routes

### Day 2: Core Features
- [ ] Discord Bot Commands
  - [ ] Create command handler
  - [ ] Implement tournament creation command
  - [ ] Create registration embed system
  - [ ] Add player management commands
  - [ ] Implement tournament status commands

- [ ] Tournament Management
  - [ ] Create tournament creation logic
  - [ ] Implement registration system
  - [ ] Build table assignment algorithm
  - [ ] Create tournament progression system
  - [ ] Add blind level management

### Day 3: Game Implementation
- [ ] Poker Engine
  - [ ] Implement card deck system
  - [ ] Create hand evaluator
  - [ ] Build betting system
  - [ ] Add game state management
  - [ ] Implement turn system
  - [ ] Create action validator

- [ ] Real-time Features
  - [ ] Set up WebSocket connections
  - [ ] Implement game state sync
  - [ ] Create player action handling
  - [ ] Add timeout management
  - [ ] Build table chat system

### Day 4: UI and Polish
- [ ] Game Interface
  - [ ] Create table view
  - [ ] Implement card display
  - [ ] Add betting interface
  - [ ] Create action buttons
  - [ ] Add timer displays
  - [ ] Implement chat UI

- [ ] Testing and Deployment
  - [ ] Test full tournament flow
  - [ ] Configure Vercel deployment
  - [ ] Set up environment variables
  - [ ] Create deployment documentation
  - [ ] Final bug fixes

## Environment Variables
```env
# Discord
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=

# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Vercel
NEXT_PUBLIC_WEBSOCKET_URL=
```

## Getting Started

1. Clone the repository
```bash
git clone [repository-url]
cd bux-poker
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Run database migrations
```bash
npx prisma migrate dev
```

5. Start the development server
```bash
npm run dev
```

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure
```
bux-poker/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/             # Utility functions
│   ├── server/          # Server-side code
│   │   ├── db/         # Database utilities
│   │   ├── discord/    # Discord bot logic
│   │   └── poker/      # Poker game logic
│   └── types/           # TypeScript types
├── prisma/
│   └── schema.prisma    # Database schema
└── public/              # Static files
```

## Contributing
This is a private project for the BUX community. Please do not share or distribute without permission.

## License
Private - All rights reserved 