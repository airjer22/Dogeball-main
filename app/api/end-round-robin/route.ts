import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import TeamModel from "@/app/models/Team";
import MatchModel from "@/app/models/Match";
import BracketTeamModel from "@/app/models/BracketTeam";
import TournamentModel from "@/app/models/Tournament";

interface Team {
  _id: string;
  teamName: string;
  wins: number;
  ties: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  pins: number;
}

function calculatePoints(team: Team): number {
  return (team.wins * 3) + team.ties;
}

function calculateGoalDifference(team: Team): number {
  return team.goalsFor - team.goalsAgainst;
}

function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const pointsDiff = calculatePoints(b) - calculatePoints(a);
    if (pointsDiff !== 0) return pointsDiff;

    const goalDiff = calculateGoalDifference(b) - calculateGoalDifference(a);
    if (goalDiff !== 0) return goalDiff;

    const goalsScoredDiff = b.goalsFor - a.goalsFor;
    if (goalsScoredDiff !== 0) return goalsScoredDiff;

    const pinsDiff = b.pins - a.pins;
    if (pinsDiff !== 0) return pinsDiff;

    return a.teamName.localeCompare(b.teamName);
  });
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { tournamentId } = await request.json();

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    // Fetch tournament
    const tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { success: false, message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Fetch all teams for the tournament
    const teamsFromDb = await TeamModel.find({ tournamentId });

    if (teamsFromDb.length < 2) {
      return NextResponse.json(
        { success: false, message: "Not enough teams to create a bracket (minimum 2 teams required)" },
        { status: 400 }
      );
    }

    // Convert to plain objects for sorting
    const teams: Team[] = teamsFromDb.map(team => ({
      _id: String(team._id),
      teamName: team.teamName,
      wins: team.wins,
      ties: team.ties,
      losses: team.losses,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      pins: team.pins
    }));

    // Sort teams by standings
    const sortedTeams = sortTeams(teams);
    
    // Take top 8 teams (or all available if less than 8)
    const topTeams = sortedTeams.slice(0, Math.min(8, sortedTeams.length));

    // Check if bracket teams already exist for this tournament
    const existingBracketTeams = await BracketTeamModel.find({ tournamentId });
    if (existingBracketTeams.length > 0) {
      return NextResponse.json(
        { success: false, message: "Bracket already exists for this tournament" },
        { status: 400 }
      );
    }

    // Delete all unscheduled matches for this tournament
    await MatchModel.deleteMany({
      tournamentId,
      status: 'unscheduled'
    });

    // Create bracket seeding: 1v8, 4v5, 2v7, 3v6
    const bracketPositions = [
      { seed: 1, position: 1 },
      { seed: 8, position: 2 },
      { seed: 4, position: 3 },
      { seed: 5, position: 4 },
      { seed: 2, position: 5 },
      { seed: 7, position: 6 },
      { seed: 3, position: 7 },
      { seed: 6, position: 8 },
    ];

    // Create BracketTeam entries
    const bracketTeams = [];
    for (const { seed, position } of bracketPositions) {
      if (seed <= topTeams.length) {
        const team = topTeams[seed - 1];
        const bracketTeam = new BracketTeamModel({
          teamName: team.teamName,
          position,
          originalTeamId: team._id,
          tournamentId,
          round: 1,
          stage: 'quarterFinal',
          isEliminated: false,
          status: 'incomplete',
          score: 0,
          matchHistory: []
        });
        bracketTeams.push(bracketTeam);
        await bracketTeam.save();
      }
    }

    // Create quarter-final matches (unscheduled)
    const quarterFinalMatches = [];
    const matchups = [
      { home: 1, away: 2 }, // Seed 1 vs Seed 8
      { home: 3, away: 4 }, // Seed 4 vs Seed 5
      { home: 5, away: 6 }, // Seed 2 vs Seed 7
      { home: 7, away: 8 }, // Seed 3 vs Seed 6
    ];

    for (const { home, away } of matchups) {
      const homeTeam = bracketTeams.find(t => t.position === home);
      const awayTeam = bracketTeams.find(t => t.position === away);

      if (homeTeam && awayTeam) {
        const match = new MatchModel({
          tournamentId,
          round: 1,
          roundType: 'quarterFinal',
          homeTeam: homeTeam.teamName,
          awayTeam: awayTeam.teamName,
          homeTeamId: homeTeam.originalTeamId,
          awayTeamId: awayTeam.originalTeamId,
          status: 'unscheduled'
        });
        await match.save();
        quarterFinalMatches.push(match);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Round robin ended successfully and bracket created",
      data: {
        bracketTeams,
        quarterFinalMatches,
        topTeams: topTeams.map((t, i) => ({ rank: i + 1, teamName: t.teamName }))
      }
    });

  } catch (error) {
    console.error("Error ending round robin:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
