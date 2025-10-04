import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import TournamentModel from '../app/models/Tournament';
import TeamModel from '../app/models/Team';
import Match from '../app/models/Match';
import ScheduledMatch from '../app/models/ScheduledMatch';
import BracketTeam from '../app/models/BracketTeam';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.log('No MONGODB_URI found. Skipping migration.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri!);
    console.log('Connected to MongoDB');

    // Migrate Tournaments
    console.log('\nMigrating tournaments...');
    const tournaments = await TournamentModel.find().lean();
    console.log(`Found ${tournaments.length} tournaments`);

    const tournamentIdMap = new Map();

    for (const tournament of tournaments) {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          tournament_name: tournament.tournamentName,
          number_of_teams: tournament.numberOfTeams,
          number_of_rounds: tournament.numberOfRounds,
          progress: tournament.progress,
          round_statuses: tournament.roundStatuses || [],
          created_at: tournament.createdAt,
          updated_at: tournament.updatedAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting tournament:', error);
      } else {
        tournamentIdMap.set(tournament._id.toString(), data.id);
        console.log(`✓ Migrated tournament: ${tournament.tournamentName}`);
      }
    }

    // Migrate Teams
    console.log('\nMigrating teams...');
    const teams = await TeamModel.find().lean();
    console.log(`Found ${teams.length} teams`);

    const teamIdMap = new Map();

    for (const team of teams) {
      const newTournamentId = tournamentIdMap.get(team.tournamentId.toString());
      if (!newTournamentId) {
        console.log(`Skipping team ${team.teamName} - tournament not found`);
        continue;
      }

      const { data, error } = await supabase
        .from('teams')
        .insert({
          team_name: team.teamName,
          team_photo: team.teamPhoto,
          tournament_id: newTournamentId,
          team_members: team.teamMembers || [],
          substitute_players: team.substitutePlayers || [],
          wins: team.wins || 0,
          ties: team.ties || 0,
          losses: team.losses || 0,
          goals_for: team.goalsFor || 0,
          goals_against: team.goalsAgainst || 0,
          pins: team.pins || 0,
          created_at: team.createdAt,
          updated_at: team.updatedAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting team:', error);
      } else {
        teamIdMap.set(team._id.toString(), data.id);
        console.log(`✓ Migrated team: ${team.teamName}`);
      }
    }

    // Migrate Matches
    console.log('\nMigrating matches...');
    const matches = await Match.find().lean();
    console.log(`Found ${matches.length} matches`);

    for (const match of matches) {
      const newTournamentId = tournamentIdMap.get(match.tournamentId.toString());
      const newHomeTeamId = teamIdMap.get(match.homeTeamId.toString());
      const newAwayTeamId = teamIdMap.get(match.awayTeamId.toString());

      if (!newTournamentId || !newHomeTeamId || !newAwayTeamId) {
        console.log(`Skipping match - missing reference`);
        continue;
      }

      const { error } = await supabase
        .from('matches')
        .insert({
          tournament_id: newTournamentId,
          round: match.round,
          home_team: match.homeTeam,
          away_team: match.awayTeam,
          home_team_id: newHomeTeamId,
          away_team_id: newAwayTeamId,
          status: match.status,
          round_type: match.roundType,
          created_at: match.createdAt,
          updated_at: match.updatedAt
        });

      if (error) {
        console.error('Error inserting match:', error);
      } else {
        console.log(`✓ Migrated match: ${match.homeTeam} vs ${match.awayTeam}`);
      }
    }

    // Migrate Scheduled Matches
    console.log('\nMigrating scheduled matches...');
    const scheduledMatches = await ScheduledMatch.find().lean();
    console.log(`Found ${scheduledMatches.length} scheduled matches`);

    for (const match of scheduledMatches) {
      const newTournamentId = tournamentIdMap.get(match.tournamentId.toString());
      const newHomeTeamId = teamIdMap.get(match.homeTeamId.toString());
      const newAwayTeamId = teamIdMap.get(match.awayTeamId.toString());

      if (!newTournamentId || !newHomeTeamId || !newAwayTeamId) {
        console.log(`Skipping scheduled match - missing reference`);
        continue;
      }

      const { error } = await supabase
        .from('scheduled_matches')
        .insert({
          home_team_id: newHomeTeamId,
          away_team_id: newAwayTeamId,
          tournament_id: newTournamentId,
          label: match.label,
          match_type: match.matchType,
          wnum: match.wnum,
          scheduled_date: match.scheduledDate,
          end_date: match.endDate,
          round: match.round,
          status: match.status,
          created_at: match.createdAt,
          updated_at: match.updatedAt
        });

      if (error) {
        console.error('Error inserting scheduled match:', error);
      } else {
        console.log(`✓ Migrated scheduled match`);
      }
    }

    // Migrate Bracket Teams
    console.log('\nMigrating bracket teams...');
    const bracketTeams = await BracketTeam.find().lean();
    console.log(`Found ${bracketTeams.length} bracket teams`);

    for (const bracketTeam of bracketTeams) {
      const newTournamentId = tournamentIdMap.get(bracketTeam.tournamentId.toString());
      const newOriginalTeamId = teamIdMap.get(bracketTeam.originalTeamId.toString());

      if (!newTournamentId || !newOriginalTeamId) {
        console.log(`Skipping bracket team ${bracketTeam.teamName} - missing reference`);
        continue;
      }

      const { error } = await supabase
        .from('bracket_teams')
        .insert({
          team_name: bracketTeam.teamName,
          position: bracketTeam.position,
          original_team_id: newOriginalTeamId,
          tournament_id: newTournamentId,
          round: bracketTeam.round,
          stage: bracketTeam.stage,
          is_eliminated: bracketTeam.isEliminated,
          status: bracketTeam.status,
          score: bracketTeam.score,
          next_match_id: bracketTeam.nextMatchId,
          match_history: bracketTeam.matchHistory || [],
          created_at: bracketTeam.createdAt,
          updated_at: bracketTeam.updatedAt
        });

      if (error) {
        console.error('Error inserting bracket team:', error);
      } else {
        console.log(`✓ Migrated bracket team: ${bracketTeam.teamName}`);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
