# BUX Poker - Discord Tournament Platform

A multiplayer Texas Hold'em poker platform for hosting community tournaments through Discord integration. Players can register and play tournaments using their Discord accounts.

## Features
- Discord integration for tournament management
- Real-time multiplayer poker games
- Tournament bracket system
- Admin controls for tournament management
- Player authentication via Discord
- Modern web interface for gameplay

## Tech Stack
- Next.js + TypeScript
- Neon Tech Postgres
- Prisma ORM
- Discord.js
- Socket.io
- Vercel (Deployment)
- NextAuth.js (Authentication)

## Prerequisites
- Node.js v18+
- npm v8+
- A Discord application with bot
- A Neon Tech Postgres database

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

Fill in the following environment variables:
- `DATABASE_URL`: Your Neon database URL
- `DISCORD_CLIENT_ID`: Your Discord application client ID
- `DISCORD_CLIENT_SECRET`: Your Discord application client secret
- `DISCORD_BOT_TOKEN`: Your Discord bot token
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

4. Set up the database
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server
```bash
npm run dev
```

## Project Plan

### Day 1: Foundation Setup ✅
- [x] Initialize Next.js project with TypeScript
- [x] Set up Neon Postgres database
- [x] Configure Prisma
- [x] Create database schema
- [x] Set up Discord bot
- [ ] Implement authentication
- [ ] Create basic UI layout

### Day 2: Core Features
- [ ] Discord Bot Commands
  - [ ] Tournament creation
  - [ ] Registration system
  - [ ] Player management
  - [ ] Tournament status updates
- [ ] Tournament Management
  - [ ] Creation flow
  - [ ] Registration handling
  - [ ] Table assignments
  - [ ] Tournament progression

### Day 3: Game Implementation
- [ ] Poker Engine
  - [ ] Card dealing
  - [ ] Hand evaluation
  - [ ] Betting system
  - [ ] Turn management
- [ ] Real-time Features
  - [ ] WebSocket setup
  - [ ] Game state sync
  - [ ] Player actions
  - [ ] Timeouts

### Day 4: UI and Polish
- [ ] Game Interface
  - [ ] Table view
  - [ ] Card display
  - [ ] Betting interface
  - [ ] Action buttons
- [ ] Testing and Deployment
  - [ ] Full tournament flow
  - [ ] Vercel deployment
  - [ ] Documentation
  - [ ] Bug fixes

## Project Structure
```
bux-poker/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/             # Utility functions
│   │   ├── db/         # Database utilities
│   │   ├── discord/    # Discord bot logic
│   │   └── poker/      # Poker game logic
│   └── types/           # TypeScript types
├── prisma/
│   └── schema.prisma    # Database schema
└── public/              # Static files
```

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Contributing
This is a private project for the BUX community. Please do not share or distribute without permission.

## License
Private - All rights reserved
