/*
  # Fix teams table photo structure

  1. Changes
    - Drop the team_photo_url and team_photo_public_id columns
    - Add team_photo jsonb column to match MongoDB structure
    - Convert jsonb[] to jsonb for team_members and substitute_players
*/

-- Drop the split columns if they exist
DO $$ BEGIN
  ALTER TABLE teams DROP COLUMN IF EXISTS team_photo_url;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE teams DROP COLUMN IF EXISTS team_photo_public_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Add team_photo as jsonb
DO $$ BEGIN
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_photo jsonb DEFAULT '{"url": null, "publicId": null}'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;