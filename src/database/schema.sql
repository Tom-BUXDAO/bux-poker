-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and views
DROP VIEW IF EXISTS player_statistics;
DROP TABLE IF EXISTS player_actions;
DROP TABLE IF EXISTS game_history;
DROP TABLE IF EXISTS tournament_registrations;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    total_chips INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES users(id),
    discord_channel_id VARCHAR(255) NOT NULL,
    discord_message_id VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    players_per_table INTEGER NOT NULL,
    starting_chips INTEGER NOT NULL,
    blind_round_minutes INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, REGISTERING, STARTING, ACTIVE, COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tournament Registrations
CREATE TABLE IF NOT EXISTS tournament_registrations (
    tournament_id UUID REFERENCES tournaments(id),
    user_id UUID REFERENCES users(id),
    discord_id VARCHAR(255) NOT NULL,
    registration_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    table_number INTEGER,
    seat_number INTEGER,
    final_position INTEGER,
    status VARCHAR(50) DEFAULT 'REGISTERED', -- REGISTERED, PLAYING, ELIMINATED, WINNER
    PRIMARY KEY (tournament_id, user_id)
);

-- Game History
CREATE TABLE IF NOT EXISTS game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id),
    hand_number INTEGER NOT NULL,
    pot_size INTEGER NOT NULL,
    community_cards VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Player Actions
CREATE TABLE IF NOT EXISTS player_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES game_history(id),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- FOLD, CHECK, CALL, RAISE, ALL_IN
    amount INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_start_time ON tournaments(start_time);
CREATE INDEX IF NOT EXISTS idx_user_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_status ON tournament_registrations(status);
CREATE INDEX IF NOT EXISTS idx_game_history_tournament ON game_history(tournament_id);

-- Create a view for player statistics
CREATE OR REPLACE VIEW player_statistics AS
SELECT 
    u.id,
    u.username,
    u.total_chips,
    u.games_played,
    u.games_won,
    COUNT(DISTINCT tr.tournament_id) as tournaments_played,
    COUNT(CASE WHEN tr.status = 'WINNER' THEN 1 END) as tournaments_won,
    COALESCE(AVG(tr.final_position), 0) as avg_final_position
FROM users u
LEFT JOIN tournament_registrations tr ON u.id = tr.user_id
GROUP BY u.id, u.username, u.total_chips, u.games_played, u.games_won; 