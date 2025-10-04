export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";

export async function GET(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  await dbConnect();

  try {
    const { matchId } = params;

    const match = await ScheduledMatch.findById(matchId)
      .populate('homeTeamId', 'teamName teamPhoto')
      .populate('awayTeamId', 'teamName teamPhoto')
      .lean();

    if (!match) {
      return Response.json(
        {
          success: false,
          message: "Match not found",
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
        data: {
          homeScore: (match as any).homeScore || 0,
          awayScore: (match as any).awayScore || 0,
          homePins: (match as any).homePins || 0,
          awayPins: (match as any).awayPins || 0,
          homeTeam: (match as any).homeTeamId,
          awayTeam: (match as any).awayTeamId,
        },
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
    console.error("Error fetching match score:", error);

    if (error instanceof Error) {
      console.error(error.stack);
    }

    return Response.json(
      {
        success: false,
        message: "Error fetching match score. Please try again.",
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
