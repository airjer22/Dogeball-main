export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import Team from "@/app/models/Team";

export async function POST(request: Request) {
  await dbConnect();
  
  try {
    const body = await request.json();
    const { homeTeamId, awayTeamId, tournamentId, scheduledDate, endDate } = body;

    // Validate required fields
    if (!homeTeamId || !awayTeamId || !tournamentId || !scheduledDate || !endDate) {
      return Response.json(
        {
          success: false,
          message: "Missing required fields",
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

    // Validate that teams exist
    const [homeTeam, awayTeam] = await Promise.all([
      Team.findById(homeTeamId),
      Team.findById(awayTeamId)
    ]);

    if (!homeTeam || !awayTeam) {
      return Response.json(
        {
          success: false,
          message: "One or both teams not found",
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

    // Validate that teams belong to the tournament
    if (homeTeam.tournamentId.toString() !== tournamentId || 
        awayTeam.tournamentId.toString() !== tournamentId) {
      return Response.json(
        {
          success: false,
          message: "Teams do not belong to the specified tournament",
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

    // Create the custom match
    // Custom matches will have round = 0 to distinguish them from regular matches
    const customMatch = await ScheduledMatch.create({
      homeTeamId,
      awayTeamId,
      tournamentId,
      scheduledDate: new Date(scheduledDate),
      endDate: new Date(endDate),
      round: 0, // 0 indicates a custom match
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
      homePins: 0,
      awayPins: 0
    });

    // Populate team details for the response
    const populatedMatch = await ScheduledMatch.findById(customMatch._id)
      .populate('homeTeamId', 'teamName teamPhoto')
      .populate('awayTeamId', 'teamName teamPhoto')
      .lean();

    return Response.json(
      {
        success: true,
        message: "Custom match created successfully",
        data: populatedMatch,
      },
      { 
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error("Error creating custom match:", error);

    if (error instanceof Error) {
      console.error(error.stack);
    }

    if (error instanceof Error && error.name === "MongooseError") {
      return Response.json(
        {
          success: false,
          message: "Database connection error. Please try again later.",
        },
        { 
          status: 503,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    return Response.json(
      {
        success: false,
        message: "Error creating custom match. Please try again.",
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
