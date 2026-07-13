export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/dbConnect";
import ScheduledMatch from "@/app/models/ScheduledMatch";
import BracketTeam from "@/app/models/BracketTeam";

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

    const legacyScores = (match as any).scores;
    let homeScore = (match as any).homeScore || legacyScores?.homeScore || 0;
    let awayScore = (match as any).awayScore || legacyScores?.awayScore || 0;
    let homePins = (match as any).homePins || legacyScores?.homePins || 0;
    let awayPins = (match as any).awayPins || legacyScores?.awayPins || 0;

    // Older bracket results were stored only in BracketTeam.matchHistory.
    // Use that history as a fallback so already-completed bracket matches can
    // still display their score.
    if ((match as any).matchType && homeScore === 0 && awayScore === 0) {
      const [homeBracketTeam, awayBracketTeam] = await Promise.all([
        BracketTeam.findOne({
          tournamentId: (match as any).tournamentId,
          originalTeamId: (match as any).homeTeamId._id
        }).lean(),
        BracketTeam.findOne({
          tournamentId: (match as any).tournamentId,
          originalTeamId: (match as any).awayTeamId._id
        }).lean()
      ]);

      if (homeBracketTeam && awayBracketTeam) {
        const history = (homeBracketTeam as any).matchHistory?.find(
          (entry: any) =>
            entry.round === (match as any).round &&
            entry.opponent?.toString() === (awayBracketTeam as any)._id.toString()
        );

        if (history) {
          homeScore = history.score;
          awayScore = history.opponentScore;
        }
      }
    }

    return Response.json(
      {
        success: true,
        data: {
          homeScore,
          awayScore,
          homePins,
          awayPins,
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
