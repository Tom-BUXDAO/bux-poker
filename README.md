# BUX Poker

A Discord-based poker tournament platform for community gaming.

## Features

- Discord bot integration for tournament management
- Real-time poker games
- Tournament organization and tracking
- Player statistics and leaderboards
- Secure user authentication

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
DISCORD_TOKEN=your_discord_bot_token
DATABASE_URL=your_postgres_database_url
```

3. Start the development server:
```bash
npm run dev
```

## Technologies Used

- Node.js
- TypeScript
- Express
- Discord.js
- Socket.io
- PostgreSQL
- Pokersolver

## Project Structure

```
src/
├── bot/          # Discord bot implementation
├── game/         # Poker game logic
├── server/       # Express server setup
├── database/     # Database models and migrations
└── types/        # TypeScript type definitions
``` 