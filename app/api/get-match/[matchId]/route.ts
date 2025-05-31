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
    
    // If the match is completed but doesn't have scores, we'll leave it as is
    // This ensures we only show the actual scores that were recorded
    if (match.status === 'completed' && !match.scores) {
      console.log("Match is completed but has no scores");
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
