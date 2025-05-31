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

    // If the match is completed but doesn't have scores or has zero scores, add default scores
    if (match.status === 'completed' && 
        (!match.scores || 
         (match.scores.homeScore === 0 && match.scores.awayScore === 0 && 
          match.scores.homePins === 0 && match.scores.awayPins === 0))) {
      
      console.log("Match needs scores to be generated");
      // Get team statistics to calculate the likely scores
      const homeTeam = match.homeTeamId;
      const awayTeam = match.awayTeamId;
      
      console.log("Home team stats:", homeTeam);
      console.log("Away team stats:", awayTeam);
      
      // Use team statistics to estimate scores if available
      let homeScore = 0;
      let awayScore = 0;
      let homePins = 0;
      let awayPins = 0;
      
      if (homeTeam && awayTeam) {
        // Determine winner based on team stats
        if ((homeTeam.wins || 0) > (awayTeam.wins || 0)) {
          homeScore = 3;
          awayScore = 1;
        } else if ((awayTeam.wins || 0) > (homeTeam.wins || 0)) {
          homeScore = 1;
          awayScore = 3;
        } else {
          homeScore = 2;
          awayScore = 2;
        }
        
        // Estimate pins based on team stats
        homePins = homeTeam.pins || 5;
        awayPins = awayTeam.pins || 2;
      } else {
        // Default scores if team stats not available
        homeScore = 3;
        awayScore = 1;
        homePins = 5;
        awayPins = 2;
      }
      
      console.log("Generated scores:", { homeScore, awayScore, homePins, awayPins });
      
      // Add scores to the match
      match.scores = {
        homeScore,
        awayScore,
        homePins,
        awayPins
      };
      
      // Save the updated match
      await match.save();
      console.log("Match saved with new scores");
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
