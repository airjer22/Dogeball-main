export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import BracketTeamModel, { TournamentStage, IMatchHistory } from '@/app/models/BracketTeam';
import Match from '@/app/models/Match';
import ScheduledMatch from '@/app/models/ScheduledMatch';
import mongoose from 'mongoose';

/**
 * Repair Bracket API
 * 
 * This endpoint repairs corrupted bracket data by:
 * 1. Analyzing BracketTeam matchHistory to determine actual winners
 * 2. Deleting incorrectly paired Match documents
 * 3. Recreating Match documents with correct pairings
 * 4. Updating BracketTeam nextMatchId references
 * 5. Cleaning up invalid ScheduledMatch entries
 * 
 * Usage: POST /api/repair-bracket
 * Body: { tournamentId: string }
 */

interface RepairLog {
  action: string;
  details: any;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const { tournamentId } = await request.json();
    
    if (!tournamentId) {
      return Response.json({
        success: false,
        message: "Tournament ID is required"
      }, { status: 400 });
    }
    
    const logs: RepairLog[] = [];
    const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
    
    // Step 1: Get all bracket teams for this tournament
    const allBracketTeams = await BracketTeamModel.find({ 
      tournamentId: tournamentObjectId 
    }).sort({ position: 1 });
    
    if (allBracketTeams.length === 0) {
      return Response.json({
        success: false,
        message: "No bracket teams found for this tournament"
      }, { status: 404 });
    }
    
    logs.push({
      action: 'Found bracket teams',
      details: { count: allBracketTeams.length }
    });
    
    // Step 2: Identify quarterfinal winners from matchHistory
    const qfWinners = allBracketTeams.filter(team => 
      !team.isEliminated && 
      team.matchHistory.some((m: IMatchHistory) => m.round === 1 && m.won)
    );
    
    logs.push({
      action: 'Identified quarterfinal winners',
      details: { 
        winners: qfWinners.map(w => ({ name: w.teamName, position: w.position }))
      }
    });
    
    // Step 3: Map QF winners to their quarterfinal match numbers
    // QF1: positions 1v8, QF2: positions 4v5, QF3: positions 3v6, QF4: positions 2v7
    const qfMatchMap = new Map<string, number>();
    allBracketTeams.forEach(team => {
      if (team.position === 1 || team.position === 8) qfMatchMap.set(team._id.toString(), 1);
      else if (team.position === 4 || team.position === 5) qfMatchMap.set(team._id.toString(), 2);
      else if (team.position === 3 || team.position === 6) qfMatchMap.set(team._id.toString(), 3);
      else if (team.position === 2 || team.position === 7) qfMatchMap.set(team._id.toString(), 4);
    });
    
    // Group winners by QF match
    const winnersByQF = new Map<number, any>();
    qfWinners.forEach(winner => {
      const qfMatch = qfMatchMap.get(winner._id.toString());
      if (qfMatch) {
        winnersByQF.set(qfMatch, winner);
      }
    });
    
    // Step 4: Delete existing semifinal and final Match documents
    const deletedMatches = await Match.deleteMany({
      tournamentId: tournamentObjectId,
      round: { $in: [2, 3] }
    });
    
    logs.push({
      action: 'Deleted existing semifinal/final Match documents',
      details: { deletedCount: deletedMatches.deletedCount }
    });
    
    // Step 5: Recreate semifinal Match documents with correct pairings
    const sf1Home = winnersByQF.get(1); // Winner of QF1 (1v8)
    const sf1Away = winnersByQF.get(2); // Winner of QF2 (4v5)
    const sf2Home = winnersByQF.get(3); // Winner of QF3 (3v6)
    const sf2Away = winnersByQF.get(4); // Winner of QF4 (2v7)
    
    const newMatches = [];
    
    if (sf1Home && sf1Away) {
      const sf1Match = await Match.create({
        tournamentId: tournamentObjectId,
        round: 2,
        roundType: 'semiFinal',
        homeTeam: sf1Home.teamName,
        awayTeam: sf1Away.teamName,
        homeTeamId: sf1Home.originalTeamId,
        awayTeamId: sf1Away.originalTeamId,
        status: 'unscheduled'
      });
      newMatches.push({ match: 'SF1', teams: `${sf1Home.teamName} vs ${sf1Away.teamName}` });
    }
    
    if (sf2Home && sf2Away) {
      const sf2Match = await Match.create({
        tournamentId: tournamentObjectId,
        round: 2,
        roundType: 'semiFinal',
        homeTeam: sf2Home.teamName,
        awayTeam: sf2Away.teamName,
        homeTeamId: sf2Home.originalTeamId,
        awayTeamId: sf2Away.originalTeamId,
        status: 'unscheduled'
      });
      newMatches.push({ match: 'SF2', teams: `${sf2Home.teamName} vs ${sf2Away.teamName}` });
    }
    
    logs.push({
      action: 'Created new semifinal Match documents',
      details: { matches: newMatches }
    });
    
    // Step 6: Update BracketTeam nextMatchId for QF winners
    for (const winner of qfWinners) {
      const qfMatch = qfMatchMap.get(winner._id.toString());
      let nextMatchId = 'R2M1'; // Default to SF1
      
      // QF1 and QF2 winners go to SF1, QF3 and QF4 winners go to SF2
      if (qfMatch && (qfMatch === 3 || qfMatch === 4)) {
        nextMatchId = 'R2M2';
      }
      
      await BracketTeamModel.findByIdAndUpdate(winner._id, {
        round: 2,
        stage: TournamentStage.SEMI_FINALS,
        status: 'incomplete',
        nextMatchId,
        score: 0
      });
    }
    
    logs.push({
      action: 'Updated BracketTeam records for semifinal stage',
      details: { updatedCount: qfWinners.length }
    });
    
    // Step 7: Check for semifinal winners and handle finals
    const sfWinners = allBracketTeams.filter(team => 
      !team.isEliminated && 
      team.matchHistory.some((m: IMatchHistory) => m.round === 2 && m.won)
    );
    
    if (sfWinners.length === 2) {
      logs.push({
        action: 'Found semifinal winners',
        details: { 
          winners: sfWinners.map(w => ({ name: w.teamName, position: w.position }))
        }
      });
      
      // Create final match
      const finalMatch = await Match.create({
        tournamentId: tournamentObjectId,
        round: 3,
        roundType: 'final',
        homeTeam: sfWinners[0].teamName,
        awayTeam: sfWinners[1].teamName,
        homeTeamId: sfWinners[0].originalTeamId,
        awayTeamId: sfWinners[1].originalTeamId,
        status: 'unscheduled'
      });
      
      logs.push({
        action: 'Created final Match document',
        details: { teams: `${sfWinners[0].teamName} vs ${sfWinners[1].teamName}` }
      });
      
      // Update SF winners for finals
      for (const winner of sfWinners) {
        await BracketTeamModel.findByIdAndUpdate(winner._id, {
          round: 3,
          stage: TournamentStage.FINALS,
          status: 'incomplete',
          nextMatchId: 'R3M1',
          score: 0
        });
      }
      
      logs.push({
        action: 'Updated BracketTeam records for finals stage',
        details: { updatedCount: sfWinners.length }
      });
    } else if (sfWinners.length > 0) {
      logs.push({
        action: 'Partial semifinal completion detected',
        details: { 
          message: 'Only one semifinal completed. Finals will be created after second semifinal.',
          completedCount: sfWinners.length
        }
      });
    }
    
    // Step 8: Clean up duplicate ScheduledMatch entries for semifinals
    const scheduledMatches = await ScheduledMatch.find({
      tournamentId: tournamentObjectId,
      round: { $in: [2, 3] }
    });
    
    logs.push({
      action: 'Found scheduled matches for rounds 2-3',
      details: { count: scheduledMatches.length }
    });
    
    // Identify and remove duplicate scheduled matches
    const seen = new Set<string>();
    const duplicates = [];
    
    for (const match of scheduledMatches) {
      const key = `${match.homeTeamId}-${match.awayTeamId}-${match.round}`;
      const reverseKey = `${match.awayTeamId}-${match.homeTeamId}-${match.round}`;
      
      if (seen.has(key) || seen.has(reverseKey)) {
        duplicates.push(match._id);
      } else {
        seen.add(key);
      }
    }
    
    if (duplicates.length > 0) {
      await ScheduledMatch.deleteMany({ _id: { $in: duplicates } });
      logs.push({
        action: 'Removed duplicate scheduled matches',
        details: { deletedCount: duplicates.length }
      });
    }
    
    return Response.json({
      success: true,
      message: "Bracket repair completed successfully",
      logs
    });
    
  } catch (error) {
    console.error('Error repairing bracket:', error);
    return Response.json({
      success: false,
      message: 'Failed to repair bracket',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
