/*
  # Create all tournament management tables

  1. New Tables
    - `tournaments`
      - `id` (uuid, primary key)
      - `tournament_name` (text, not null)
      - `number_of_teams` (integer, not null)
      - `number_of_rounds` (integer, not null)
      - `progress` (text, not null) - 'In Progress' or 'Completed'
      - `round_statuses` (boolean[], not null) - Array tracking round completion
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `teams`
      - `id` (uuid, primary key)
      - `team_name` (text, not null)
      - `team_photo` (jsonb) - {url, publicId}
      - `tournament_id` (uuid, foreign key -> tournaments)
      - `team_members` (jsonb[]) - Array of {name, photo}
      - `substitute_players` (jsonb[]) - Array of {name, photo}
      - `wins` (integer, default 0)
      - `ties` (integer, default 0)
      - `losses` (integer, default 0)
      - `goals_for` (integer, default 0)
      - `goals_against` (integer, default 0)
      - `pins` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `matches`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, foreign key -> tournaments)
      - `round` (integer, not null)
      - `home_team` (text, not null)
      - `away_team` (text, not null)
      - `home_team_id` (uuid, foreign key -> teams)
      - `away_team_id` (uuid, foreign key -> teams)
      - `status` (text, default 'unscheduled')
      - `round_type` (text) - 'quarterFinal', 'semiFinal', 'final'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `scheduled_matches`
      - `id` (uuid, primary key)
      - `home_team_id` (uuid, foreign key -> teams)
      - `away_team_id` (uuid, foreign key -> teams)
      - `tournament_id` (uuid, foreign key -> tournaments)
      - `label` (text)
      - `match_type` (text) - 'quarterfinal', 'semifinal', 'final'
      - `wnum` (integer)
      - `scheduled_date` (timestamptz, not null)
      - `end_date` (timestamptz, not null)
      - `round` (integer, not null)
      - `status` (text, default 'scheduled')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `bracket_teams`
      - `id` (uuid, primary key)
      - `team_name` (text, not null)
      - `position` (integer, not null)
      - `original_team_id` (uuid, foreign key -> teams)
      - `tournament_id` (uuid, foreign key -> tournaments)
      - `round` (integer, not null, default 1)
      - `stage` (text, not null) - 'quarterFinal', 'semiFinal', 'final'
      - `is_eliminated` (boolean, default false)
      - `status` (text, default 'incomplete')
      - `score` (integer, default 0)
      - `next_match_id` (text)
      - `match_history` (jsonb[]) - Array of match history objects
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (anon users can read)
    - Add policies for authenticated users to manage data
*/

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_name text NOT NULL,
  number_of_teams integer NOT NULL CHECK (number_of_teams >= 2),
  number_of_rounds integer NOT NULL CHECK (number_of_rounds >= 1),
  progress text NOT NULL DEFAULT 'In Progress' CHECK (progress IN ('In Progress', 'Completed')),
  round_statuses boolean[] NOT NULL DEFAULT ARRAY[]::boolean[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  team_photo jsonb DEFAULT '{"url": null, "publicId": null}'::jsonb,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_members jsonb[] DEFAULT ARRAY[]::jsonb[],
  substitute_players jsonb[] DEFAULT ARRAY[]::jsonb[],
  wins integer DEFAULT 0 CHECK (wins >= 0),
  ties integer DEFAULT 0 CHECK (ties >= 0),
  losses integer DEFAULT 0 CHECK (losses >= 0),
  goals_for integer DEFAULT 0 CHECK (goals_for >= 0),
  goals_against integer DEFAULT 0 CHECK (goals_against >= 0),
  pins integer DEFAULT 0 CHECK (pins >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status text DEFAULT 'unscheduled',
  round_type text CHECK (round_type IN ('quarterFinal', 'semiFinal', 'final')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scheduled_matches table
CREATE TABLE IF NOT EXISTS scheduled_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  label text,
  match_type text CHECK (match_type IN ('quarterfinal', 'semifinal', 'final')),
  wnum integer,
  scheduled_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  round integer NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bracket_teams table
CREATE TABLE IF NOT EXISTS bracket_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  original_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 1 CHECK (round >= 1 AND round <= 3),
  stage text NOT NULL DEFAULT 'quarterFinal' CHECK (stage IN ('quarterFinal', 'semiFinal', 'final')),
  is_eliminated boolean DEFAULT false,
  status text DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'completed')),
  score integer DEFAULT 0,
  next_match_id text,
  match_history jsonb[] DEFAULT ARRAY[]::jsonb[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_teams ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
CREATE POLICY "Allow public read tournaments"
  ON tournaments FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated all on tournaments"
  ON tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Teams policies
CREATE POLICY "Allow public read teams"
  ON teams FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated all on teams"
  ON teams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Matches policies
CREATE POLICY "Allow public read matches"
  ON matches FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated all on matches"
  ON matches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Scheduled matches policies
CREATE POLICY "Allow public read scheduled_matches"
  ON scheduled_matches FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated all on scheduled_matches"
  ON scheduled_matches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bracket teams policies
CREATE POLICY "Allow public read bracket_teams"
  ON bracket_teams FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated all on bracket_teams"
  ON bracket_teams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_matches_tournament ON scheduled_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_bracket_teams_tournament ON bracket_teams(tournament_id);

-- Create update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_scheduled_matches_updated_at ON scheduled_matches;
CREATE TRIGGER update_scheduled_matches_updated_at
  BEFORE UPDATE ON scheduled_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_bracket_teams_updated_at ON bracket_teams;
CREATE TRIGGER update_bracket_teams_updated_at
  BEFORE UPDATE ON bracket_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();