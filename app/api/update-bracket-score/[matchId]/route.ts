export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import BracketTeamModel, { TournamentStage } from '@/app/models/BracketTeam';
import Match from '@/app/models/Match';
import ScheduledMatch from '@/app/models/ScheduledMatch';
import Tournament from '@/app/models/Tournament';
import mongoose from 'mongoose';

// Define interfaces for data structures
interface TeamData {
  id: string;
  name: string;
}

interface MatchUpdateData {
  homeTeam: TeamData;
  awayTeam: TeamData;
  homeScore: number;
  awayScore: number;
  homePins: number;
  awayPins: number;
}

interface BracketMatch {
  tournamentId: mongoose.Types.ObjectId;
  round: number;
  roundType: 'quarterFinal' | 'semiFinal' | 'final';
  homeTeam: string;
  awayTeam: string;
  homeTeamId: mongoose.Types.ObjectId;
  awayTeamId: mongoose.Types.ObjectId;
  status: 'scheduled' | 'unscheduled' | 'completed';
}

interface StageProgression {
  currentRound: number;
  nextRound: number | null;
  nextStage: TournamentStage | null;
  teamsNeeded: number | null;
  matchPrefix: string | null;
}

interface MatchHistory {
  round: number;
  stage: TournamentStage;
  opponent: mongoose.Types.ObjectId;
  opponentPosition: number;
  position: number;
  score: number;
  opponentScore: number;
  won: boolean;
}

// Helper function to determine tournament progression for each stage
function getStageProgression(stage: TournamentStage): StageProgression {
  switch (stage) {
    case TournamentStage.QUARTER_FINALS:
      return {
        currentRound: 1,
        nextRound: 2,
        nextStage: TournamentStage.SEMI_FINALS,
        teamsNeeded: 4,
        matchPrefix: 'R2M'
      };
    case TournamentStage.SEMI_FINALS:
      return {
        currentRound: 2,
        nextRound: 3,
        nextStage: TournamentStage.FINALS,
        teamsNeeded: 2,
        matchPrefix: 'R3M'
      };
    case TournamentStage.FINALS:
      return {
        currentRound: 3,
        nextRound: null,
        nextStage: null,
        teamsNeeded: null,
        matchPrefix: null
      };
    default:
      throw new Error('Invalid tournament stage');
  }
}

// Function to update bracket team statistics and match history
// NOTE: This does NOT update main team standings - those are finalized after round robin
async function updateTeamStats(
  team: any,
  opponent: any,
  score: number,
  opponentScore: number,
  isWinner: boolean,
  pins: number
): Promise<void> {
  // Create match history entry
  const matchHistory: MatchHistory = {
    round: team.round,
    stage: team.stage,
    opponent: opponent._id,
    opponentPosition: opponent.position,
    position: team.position,
    score,
    opponentScore,
    won: isWinner
  };

  // Prepare update data for bracket team
  const updateData = {
    score,
    status: 'completed' as const,
    isEliminated: !isWinner,
    $push: { matchHistory }
  };

  // Update bracket team while preserving in database
  // Bracket games do NOT update main team standings
  await BracketTeamModel.findByIdAndUpdate(team._id, updateData);
}

// Function to create matches for next tournament stage
async function createNextStageMatches(
  tournamentId: mongoose.Types.ObjectId,
  winners: any[],
  currentStage: TournamentStage
): Promise<void> {
  const progression = getStageProgression(currentStage);
  if (!progression.nextStage) return;

  let matches: BracketMatch[] = [];

  if (currentStage === TournamentStage.QUARTER_FINALS) {
    // Standard bracket progression for quarterfinals to semifinals:
    // QF matches are played in order: 1v8, 4v5, 3v6, 2v7
    // Winners advance based on which QF match they won, not their seed
    // SF1: Winner of QF1 (1v8) vs Winner of QF2 (4v5) 
    // SF2: Winner of QF3 (3v6) vs Winner of QF4 (2v7)
    
    // Get all bracket teams to determine which QF match each winner came from
    const allBracketTeams = await BracketTeamModel.find({ 
      tournamentId,
      stage: currentStage
    }).sort({ position: 1 });
    
    // Map to track which QF match each winner came from
    // QF matches based on original seeding positions:
    // QF1: positions 1 vs 8, QF2: positions 4 vs 5, QF3: positions 3 vs 6, QF4: positions 2 vs 7
    const qfMatchMap = new Map<string, number>();
    allBracketTeams.forEach(team => {
      if (team.position === 1 || team.position === 8) qfMatchMap.set(team._id.toString(), 1);
      else if (team.position === 4 || team.position === 5) qfMatchMap.set(team._id.toString(), 2);
      else if (team.position === 3 || team.position === 6) qfMatchMap.set(team._id.toString(), 3);
      else if (team.position === 2 || team.position === 7) qfMatchMap.set(team._id.toString(), 4);
    });
    
    // Group winners by their QF match number
    const winnersByQF = new Map<number, any>();
    winners.forEach(winner => {
      const qfMatch = qfMatchMap.get(winner._id.toString());
      if (qfMatch) {
        winnersByQF.set(qfMatch, winner);
      }
    });
    
    // Create semifinals with correct pairings
    const sf1Home = winnersByQF.get(1); // Winner of QF1 (1v8)
    const sf1Away = winnersByQF.get(2); // Winner of QF2 (4v5)
    const sf2Home = winnersByQF.get(3); // Winner of QF3 (3v6)
    const sf2Away = winnersByQF.get(4); // Winner of QF4 (2v7)
    
    if (sf1Home && sf1Away) {
      matches.push({
        tournamentId,
        round: progression.nextRound!,
        roundType: 'semiFinal',
        homeTeam: sf1Home.teamName,
        awayTeam: sf1Away.teamName,
        homeTeamId: sf1Home.originalTeamId,
        awayTeamId: sf1Away.originalTeamId,
        status: 'unscheduled'
      });
    }
    
    if (sf2Home && sf2Away) {
      matches.push({
        tournamentId,
        round: progression.nextRound!,
        roundType: 'semiFinal',
        homeTeam: sf2Home.teamName,
        awayTeam: sf2Away.teamName,
        homeTeamId: sf2Home.originalTeamId,
        awayTeamId: sf2Away.originalTeamId,
        status: 'unscheduled'
      });
    }
    
    // Update nextMatchId for each winner based on their QF match
    await Promise.all(winners.map(async (winner) => {
      const qfMatch = qfMatchMap.get(winner._id.toString());
      let nextMatchId = 'R2M1'; // Default to SF1
      
      // QF1 and QF2 winners go to SF1, QF3 and QF4 winners go to SF2
      if (qfMatch && (qfMatch === 3 || qfMatch === 4)) {
        nextMatchId = 'R2M2';
      }
      
      await BracketTeamModel.findByIdAndUpdate(winner._id, {
        round: progression.nextRound,
        stage: progression.nextStage,
        status: 'incomplete',
        nextMatchId,
        score: 0
      });
    }));
    
  } else if (currentStage === TournamentStage.SEMI_FINALS) {
    // For semifinals to finals, pair based on which SF match they won
    // Winner of SF1 vs Winner of SF2
    const sf1Winner = winners.find(w => {
      const lastMatch = w.matchHistory[w.matchHistory.length - 1];
      return lastMatch && lastMatch.round === 2;
    });
    
    const sf2Winner = winners.find(w => w._id.toString() !== sf1Winner?._id.toString());
    
    if (sf1Winner && sf2Winner) {
      matches = [{
        tournamentId,
        round: progression.nextRound!,
        roundType: 'final',
        homeTeam: sf1Winner.teamName,
        awayTeam: sf2Winner.teamName,
        homeTeamId: sf1Winner.originalTeamId,
        awayTeamId: sf2Winner.originalTeamId,
        status: 'unscheduled'
      }];
    }
    
    // Update all advancing teams for finals
    await Promise.all(winners.map(async (team) => {
      await BracketTeamModel.findByIdAndUpdate(team._id, {
        round: progression.nextRound,
        stage: progression.nextStage,
        status: 'incomplete',
        nextMatchId: 'R3M1',
        score: 0
      });
    }));
  }

  // Create matches for next stage
  if (matches.length > 0) {
    await Match.create(matches);
  }
}

// Function to check if all matches in a stage are completed
async function isStageCompleted(
  tournamentId: mongoose.Types.ObjectId,
  stage: TournamentStage
): Promise<boolean> {
  const teamsInStage = await BracketTeamModel.find({
    tournamentId,
    stage
  });
  return teamsInStage.every(team => team.status === 'completed');
}

// Main route handler for updating bracket scores
export async function PUT(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    await dbConnect();
    const matchData: MatchUpdateData = await request.json();

    // Find all teams involved in this match
    const bracketTeams = await BracketTeamModel.find({
      $or: [
        { originalTeamId: matchData.homeTeam.id },
        { originalTeamId: matchData.awayTeam.id }
      ]
    });

    const homeTeam = bracketTeams.find(
      team => team.originalTeamId.toString() === matchData.homeTeam.id
    );
    const awayTeam = bracketTeams.find(
      team => team.originalTeamId.toString() === matchData.awayTeam.id
    );

    if (!homeTeam || !awayTeam) {
      return Response.json({
        success: false,
        message: 'Teams not found in bracket'
      }, { status: 404 });
    }

    // Update scheduled match status
    const scheduledMatches = await ScheduledMatch.find({
      tournamentId: homeTeam.tournamentId,
      $or: [
        {
          homeTeamId: new mongoose.Types.ObjectId(matchData.homeTeam.id),
          awayTeamId: new mongoose.Types.ObjectId(matchData.awayTeam.id)
        },
        {
          homeTeamId: new mongoose.Types.ObjectId(matchData.awayTeam.id),
          awayTeamId: new mongoose.Types.ObjectId(matchData.homeTeam.id)
        }
      ],
      status: "scheduled"
    });

    // Mark all scheduled matches as completed
    if (scheduledMatches.length > 0) {
      await ScheduledMatch.updateMany(
        { _id: { $in: scheduledMatches.map(match => match._id) } },
        { status: "completed" }
      );
    }

    // Determine winner and loser with pin-based tiebreaker
    let isHomeWinner: boolean;
    let winReason: string;

    if (matchData.homeScore > matchData.awayScore) {
      isHomeWinner = true;
      winReason = 'score';
    } else if (matchData.awayScore > matchData.homeScore) {
      isHomeWinner = false;
      winReason = 'score';
    } else {
      // Tied on score - use pins as tiebreaker
      if (matchData.homePins > matchData.awayPins) {
        isHomeWinner = true;
        winReason = 'pins';
      } else if (matchData.awayPins > matchData.homePins) {
        isHomeWinner = false;
        winReason = 'pins';
      } else {
        // Still tied - should not happen with overtime rules
        return Response.json({
          success: false,
          message: 'Match cannot end in a tie. If scores are equal, play overtime until a pin is scored.'
        }, { status: 400 });
      }
    }

    const winner = isHomeWinner ? homeTeam : awayTeam;
    const loser = isHomeWinner ? awayTeam : homeTeam;

    // Update both teams while preserving them in database
    await Promise.all([
      updateTeamStats(
        winner,
        loser,
        isHomeWinner ? matchData.homeScore : matchData.awayScore,
        isHomeWinner ? matchData.awayScore : matchData.homeScore,
        true,
        isHomeWinner ? matchData.homePins : matchData.awayPins
      ),
      updateTeamStats(
        loser,
        winner,
        isHomeWinner ? matchData.awayScore : matchData.homeScore,
        isHomeWinner ? matchData.homeScore : matchData.awayScore,
        false,
        isHomeWinner ? matchData.awayPins : matchData.homePins
      )
    ]);

    // Check stage completion and handle progression
    const stageCompleted = await isStageCompleted(winner.tournamentId, winner.stage);

    if (stageCompleted && winner.stage !== TournamentStage.FINALS) {
      // Get all winners from current stage
      const winners = await BracketTeamModel.find({
        tournamentId: winner.tournamentId,
        stage: winner.stage,
        isEliminated: false
      }).sort({ position: 1 });

      // Create next stage matches and update advancing teams
      await createNextStageMatches(winner.tournamentId, winners, winner.stage);
    }

    // Handle tournament completion
    if (winner.stage === TournamentStage.FINALS && stageCompleted) {
      await Tournament.findByIdAndUpdate(
        winner.tournamentId,
        {
          progress: "Completed",
          winner: winner.originalTeamId
        }
      );
    }

    return Response.json({
      success: true,
      data: {
        winner: {
          id: winner._id,
          teamName: winner.teamName,
          round: winner.round,
          stage: winner.stage,
          position: winner.position,
          nextMatchId: winner.nextMatchId
        },
        loser: {
          id: loser._id,
          teamName: loser.teamName,
          position: loser.position,
          stage: loser.stage,
          isEliminated: true
        }
      }
    });

  } catch (error) {
    console.error('Error updating bracket score:', error);
    return Response.json({
      success: false,
      message: 'Failed to update bracket score'
    }, { status: 500 });
  }
}
