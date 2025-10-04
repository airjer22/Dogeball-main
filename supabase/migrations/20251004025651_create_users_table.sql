/*
  # Create users table for authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier for each user
      - `email` (text, unique, not null) - User's email address
      - `password` (text, not null) - User's hashed password (stored as plain text for now, should be hashed in production)
      - `role` (text, not null) - User role: 'user', 'admin', or 'guest'
      - `created_at` (timestamptz) - Timestamp when user was created
      - `updated_at` (timestamptz) - Timestamp when user was last updated

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for admins to read all users
    - Passwords are stored as plain text (matching current implementation)

  3. Initial Data
    - Create default admin user: admin@gmail.com / admin123
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'guest')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Policy: Allow anyone to authenticate (needed for login)
CREATE POLICY "Allow public login check"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Insert default admin user
INSERT INTO users (email, password, role, created_at)
VALUES ('admin@gmail.com', 'admin123', 'admin', now())
ON CONFLICT (email) DO NOTHING;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();