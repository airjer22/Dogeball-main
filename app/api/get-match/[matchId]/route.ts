export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import TeamModel from "@/app/models/Team";

export async function GET(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  await dbConnect();

  try {
    console.log("Fetching match with ID:", params.matchId);
    
    const match = await ScheduledMatch.findById(params.matchId)
      .populate({
        path: 'homeTeamId',
        model: TeamModel,
        select: 'teamName teamPhoto wins losses ties pins goalsFor goalsAgainst'
      })
      .populate({
        path: 'awayTeamId',
        model: TeamModel,
        select: 'teamName teamPhoto wins losses ties pins goalsFor goalsAgainst'
      });

    console.log("Match found:", match ? "Yes" : "No");
    
    if (!match) {
      return Response.json(
        { success: false, message: "Match not found" },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }
    
    console.log("Match status:", match.status);
    console.log("Match scores:", match.scores);

    console.log("Match status:", match.status);
    console.log("Match scores:", match.scores);
    
    // If the match is completed but doesn't have scores, try to calculate them from team stats
    if (match.status === 'completed' && !match.scores) {
      console.log("Match is completed but has no scores, calculating from team stats");
      
      // Get team statistics to calculate the scores
      const homeTeam = match.homeTeamId;
      const awayTeam = match.awayTeamId;
      
      console.log("Home team stats:", homeTeam);
      console.log("Away team stats:", awayTeam);
      
      // Calculate the likely scores based on team statistics
      // This is a best-effort approach to reconstruct what the scores might have been
      
      // First, determine who won based on the win/loss records
      let homeWon = false;
      let awayWon = false;
      let tie = false;
      
      // Check if this match contributed to home team's wins
      if (homeTeam.wins > 0) {
        homeWon = true;
      }
      
      // Check if this match contributed to away team's wins
      if (awayTeam.wins > 0) {
        awayWon = true;
      }
      
      // Check if this match contributed to a tie
      if (homeTeam.ties > 0 && awayTeam.ties > 0) {
        tie = true;
      }
      
      // Set scores based on the outcome
      let homeScore = 0;
      let awayScore = 0;
      
      if (homeWon && !awayWon) {
        // Home team won
        homeScore = Math.max(1, homeTeam.goalsFor || 1);
        awayScore = Math.max(0, awayTeam.goalsFor || 0);
        
        // Make sure home score is greater than away score
        if (homeScore <= awayScore) {
          homeScore = awayScore + 1;
        }
      } else if (awayWon && !homeWon) {
        // Away team won
        homeScore = Math.max(0, homeTeam.goalsFor || 0);
        awayScore = Math.max(1, awayTeam.goalsFor || 1);
        
        // Make sure away score is greater than home score
        if (awayScore <= homeScore) {
          awayScore = homeScore + 1;
        }
      } else if (tie) {
        // It was a tie
        homeScore = Math.max(1, homeTeam.goalsFor || 1);
        awayScore = homeScore; // Same score for a tie
      } else {
        // Can't determine the outcome, use default scores
        homeScore = 1;
        awayScore = 1;
      }
      
      // Get pins from team stats
      const homePins = homeTeam.pins || 0;
      const awayPins = awayTeam.pins || 0;
      
      console.log("Calculated scores:", { homeScore, awayScore, homePins, awayPins });
      
      // Add scores to the match
      match.scores = {
        homeScore,
        awayScore,
        homePins,
        awayPins
      };
      
      // Save the updated match
      await match.save();
      console.log("Match saved with calculated scores");
    }

    return Response.json(
      {
        success: true,
        data: match
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching match:', error);
    return Response.json(
      {
        success: false,
        message: "Error fetching match"
      }, 
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}
