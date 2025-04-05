export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";

export async function PUT(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  await dbConnect();

  try {
    const { scheduledDate } = await request.json();

    // Validate date
    if (!scheduledDate) {
      return Response.json(
        {
          success: false,
          message: "Scheduled date is required"
        },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    const newScheduledDate = new Date(scheduledDate);
    const newEndDate = new Date(newScheduledDate.getTime() + 60 * 60 * 1000); // Add 1 hour for end date

    // Update the match
    const updatedMatch = await ScheduledMatch.findByIdAndUpdate(
      params.matchId,
      {
        scheduledDate: newScheduledDate,
        endDate: newEndDate,
        status: 'scheduled'
      },
      { new: true }
    ).populate(['homeTeamId', 'awayTeamId']);

    if (!updatedMatch) {
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
        message: "Match schedule updated successfully",
        data: updatedMatch
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
    console.error('Error updating match schedule:', error);
    return Response.json(
      {
        success: false,
        message: "Error updating match schedule"
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
