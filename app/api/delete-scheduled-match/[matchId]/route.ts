export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";

export async function DELETE(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  await dbConnect();

  try {
    // Find and delete the match
    const deletedMatch = await ScheduledMatch.findByIdAndDelete(params.matchId);

    if (!deletedMatch) {
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

    return Response.json(
      {
        success: true,
        message: "Match deleted successfully"
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
