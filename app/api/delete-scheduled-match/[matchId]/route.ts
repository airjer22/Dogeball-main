export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import Match from "@/app/models/Match";

export async function DELETE(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  await dbConnect();

  try {
    // Find the scheduled match
    const scheduledMatch = await ScheduledMatch.findById(params.matchId);

    if (!scheduledMatch) {
      return Response.json(
        {
          success: false,
          message: "Match not found"
        },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    // Find the original match by homeTeamId, awayTeamId, and tournamentId
    const originalMatch = await Match.findOne({
      homeTeamId: scheduledMatch.homeTeamId,
      awayTeamId: scheduledMatch.awayTeamId,
      tournamentId: scheduledMatch.tournamentId,
      round: scheduledMatch.round
    });

    // If we found the original match, update its status back to unscheduled
    if (originalMatch) {
      originalMatch.status = 'unscheduled';
      await originalMatch.save();
    }

    // Delete the scheduled match
    await ScheduledMatch.findByIdAndDelete(params.matchId);

    return Response.json(
      {
        success: true,
        message: "Match deleted successfully and returned to unscheduled matches"
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('Error deleting match:', error);
    return Response.json(
      {
        success: false,
        message: "Error deleting match"
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
