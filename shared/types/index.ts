export interface Tournament {
  id: string;
  creator_id: string;
  start_time: string;
  players_per_table: number;
  starting_chips: number;
  blind_levels: number;
  channel_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  registered_players: number;
  created_at: string;
}

export interface Player {
  id: string;
  discord_id: string;
  username: string;
  total_chips: number;
  games_played: number;
  games_won: number;
  created_at: string;
}

export interface TournamentRegistration {
  tournament_id: string;
  player_id: string;
  discord_id: string;
  registered_at: string;
}

export interface TournamentWithPlayers extends Tournament {
  players: Player[];
} 