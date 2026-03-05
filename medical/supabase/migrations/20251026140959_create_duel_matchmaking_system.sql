/*
  # Create Complete Duel Matchmaking System

  ## Overview
  This migration creates a full matchmaking system for code duels with:
  - User profiles with ELO ratings
  - Problem repository
  - Match tracking
  - Matchmaking queue (in-memory on server, tracked via last_online)
  - Submission history
  - Leaderboards

  ## New Tables

  ### `duel_users`
  Stores player profiles for the dueling system
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique, not null)
  - `rating` (integer, default 1000) - ELO rating
  - `wins` (integer, default 0)
  - `losses` (integer, default 0)
  - `draws` (integer, default 0)
  - `total_matches` (integer, default 0)
  - `win_streak` (integer, default 0)
  - `avatar_url` (text)
  - `last_online` (timestamptz)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### `problems`
  Stores coding problems for duels
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `statement` (text, not null) - Problem description
  - `difficulty` (text, not null) - easy, medium, hard
  - `time_limit_seconds` (integer, default 900) - 15 minutes
  - `test_cases` (jsonb, not null) - Array of test cases
  - `starter_code` (jsonb) - Starter code for different languages
  - `supported_languages` (text[], default ['javascript', 'python'])
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz, default now())

  ### `matches`
  Tracks all matches between players
  - `id` (uuid, primary key)
  - `player_a_id` (uuid, references duel_users)
  - `player_b_id` (uuid, references duel_users)
  - `problem_id` (uuid, references problems)
  - `match_type` (text, default 'ranked') - ranked or casual
  - `status` (text, default 'waiting') - waiting, in_progress, completed, abandoned
  - `winner_id` (uuid, references duel_users, nullable)
  - `player_a_score` (integer, default 0)
  - `player_b_score` (integer, default 0)
  - `player_a_rating_before` (integer)
  - `player_b_rating_before` (integer)
  - `player_a_rating_after` (integer)
  - `player_b_rating_after` (integer)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz, default now())

  ### `submissions`
  Tracks code submissions during matches
  - `id` (uuid, primary key)
  - `match_id` (uuid, references matches)
  - `user_id` (uuid, references duel_users)
  - `code` (text, not null)
  - `language` (text, not null)
  - `test_results` (jsonb) - Results from test execution
  - `passed_tests` (integer, default 0)
  - `total_tests` (integer, default 0)
  - `execution_time_ms` (integer)
  - `submitted_at` (timestamptz, default now())

  ### `leaderboard_entries`
  Materialized view of top players for leaderboard
  - `user_id` (uuid, references duel_users)
  - `username` (text)
  - `rating` (integer)
  - `wins` (integer)
  - `losses` (integer)
  - `total_matches` (integer)
  - `win_rate` (numeric)
  - `rank` (bigint)

  ### `code_snapshots`
  Optional: Periodic snapshots of code during matches for replay
  - `id` (uuid, primary key)
  - `match_id` (uuid, references matches)
  - `user_id` (uuid, references duel_users)
  - `code` (text)
  - `timestamp` (timestamptz, default now())

  ## Security (RLS)
  - All tables have RLS enabled
  - Users can read their own data
  - Users can read public leaderboard data
  - Users can read match data they participated in
  - Only authenticated users can submit code

  ## Indexes
  - Index on duel_users.rating for matchmaking
  - Index on matches for user queries
  - Index on submissions for match queries
*/

-- Create duel_users table
CREATE TABLE IF NOT EXISTS duel_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  rating integer DEFAULT 1000 CHECK (rating >= 0),
  wins integer DEFAULT 0 CHECK (wins >= 0),
  losses integer DEFAULT 0 CHECK (losses >= 0),
  draws integer DEFAULT 0 CHECK (draws >= 0),
  total_matches integer DEFAULT 0 CHECK (total_matches >= 0),
  win_streak integer DEFAULT 0,
  avatar_url text DEFAULT '',
  last_online timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create problems table
CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  statement text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit_seconds integer DEFAULT 900 CHECK (time_limit_seconds > 0),
  test_cases jsonb NOT NULL,
  starter_code jsonb DEFAULT '{}'::jsonb,
  supported_languages text[] DEFAULT ARRAY['javascript', 'python'],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id uuid REFERENCES duel_users(id) ON DELETE CASCADE,
  player_b_id uuid REFERENCES duel_users(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES problems(id) ON DELETE SET NULL,
  match_type text DEFAULT 'ranked' CHECK (match_type IN ('ranked', 'casual')),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),
  winner_id uuid REFERENCES duel_users(id) ON DELETE SET NULL,
  player_a_score integer DEFAULT 0 CHECK (player_a_score >= 0),
  player_b_score integer DEFAULT 0 CHECK (player_b_score >= 0),
  player_a_rating_before integer,
  player_b_rating_before integer,
  player_a_rating_after integer,
  player_b_rating_after integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES duel_users(id) ON DELETE CASCADE,
  code text NOT NULL,
  language text NOT NULL,
  test_results jsonb DEFAULT '[]'::jsonb,
  passed_tests integer DEFAULT 0 CHECK (passed_tests >= 0),
  total_tests integer DEFAULT 0 CHECK (total_tests >= 0),
  execution_time_ms integer DEFAULT 0,
  submitted_at timestamptz DEFAULT now()
);

-- Create code_snapshots table
CREATE TABLE IF NOT EXISTS code_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES duel_users(id) ON DELETE CASCADE,
  code text DEFAULT '',
  timestamp timestamptz DEFAULT now()
);

-- Create leaderboard_entries view
CREATE OR REPLACE VIEW leaderboard_entries AS
SELECT 
  id AS user_id,
  username,
  rating,
  wins,
  losses,
  total_matches,
  CASE 
    WHEN total_matches > 0 THEN ROUND((wins::numeric / total_matches::numeric) * 100, 2)
    ELSE 0
  END AS win_rate,
  ROW_NUMBER() OVER (ORDER BY rating DESC, wins DESC) AS rank
FROM duel_users
ORDER BY rating DESC, wins DESC;

-- Enable RLS on all tables
ALTER TABLE duel_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for duel_users
CREATE POLICY "Users can view all duel profiles"
  ON duel_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own duel profile"
  ON duel_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own duel profile"
  ON duel_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for problems
CREATE POLICY "Anyone can view active problems"
  ON problems
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for matches
CREATE POLICY "Users can view their own matches"
  ON matches
  FOR SELECT
  TO authenticated
  USING (player_a_id = auth.uid() OR player_b_id = auth.uid());

CREATE POLICY "System can insert matches"
  ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update matches"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for submissions
CREATE POLICY "Users can view submissions from their matches"
  ON submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = submissions.match_id
      AND (matches.player_a_id = auth.uid() OR matches.player_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own submissions"
  ON submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for code_snapshots
CREATE POLICY "Users can view snapshots from their matches"
  ON code_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = code_snapshots.match_id
      AND (matches.player_a_id = auth.uid() OR matches.player_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own snapshots"
  ON code_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_duel_users_rating ON duel_users(rating DESC);
CREATE INDEX IF NOT EXISTS idx_duel_users_last_online ON duel_users(last_online DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player_a ON matches(player_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_player_b ON matches(player_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_match_id ON submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_code_snapshots_match_id ON code_snapshots(match_id);