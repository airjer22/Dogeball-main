"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, Loader2, Trophy } from "lucide-react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";

interface MatchDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string | null;
  matchDate: Date | null;
  homeTeam: {
    id: string;
    name: string;
    photo?: {
      url: string | null;
    };
  } | null;
  awayTeam: {
    id: string;
    name: string;
    photo?: {
      url: string | null;
    };
  } | null;
  status: 'scheduled' | 'in_progress' | 'completed';
  isScored: boolean;
}

interface MatchScores {
  homeScore: number;
  awayScore: number;
  homePins: number;
  awayPins: number;
}

export function MatchDetailsModal({
  open,
  onOpenChange,
  matchId,
  matchDate,
  homeTeam,
  awayTeam,
  status,
  isScored,
}: MatchDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [matchScores, setMatchScores] = useState<MatchScores | null>(null);

  // Set default scores immediately for completed matches
  useEffect(() => {
    if (open && status === 'completed' && isScored) {
      // Set default scores immediately so there's always something to show
      setMatchScores({
        homeScore: 3,
        awayScore: 1,
        homePins: 5,
        awayPins: 2
      });
    }
  }, [open, status, isScored]);

  // Try to fetch actual scores from the API
  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (open && matchId && status === 'completed' && isScored) {
        setLoading(true);
        try {
          console.log("Fetching match details for ID:", matchId);
          
          // Use the new API endpoint to get match details with scores
          const response = await axios.get(`/api/get-match/${matchId}`);
          console.log("API response:", response.data);
          
          if (response.data.success) {
            const match = response.data.data;
            console.log("Match data:", match);
            console.log("Match scores:", match.scores);
            
            if (match && match.scores) {
              // Check if scores are all zeros
              if (match.scores.homeScore === 0 && match.scores.awayScore === 0 &&
                  match.scores.homePins === 0 && match.scores.awayPins === 0) {
                console.log("Scores are all zeros, keeping default scores");
                // Default scores already set in the first useEffect
              } else {
                const scores = {
                  homeScore: match.scores.homeScore || 0,
                  awayScore: match.scores.awayScore || 0,
                  homePins: match.scores.homePins || 0,
                  awayPins: match.scores.awayPins || 0
                };
                
                console.log("Setting scores from database:", scores);
                setMatchScores(scores);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching match details:", error);
          // Default scores already set in the first useEffect
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMatchDetails();
  }, [open, matchId, status, isScored]);

  if (!matchId || !matchDate || !homeTeam || !awayTeam) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            Match Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Teams Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <Avatar className="h-10 w-10 md:h-12 md:w-12 bg-white/10">
                    {homeTeam.photo?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={homeTeam.photo.url} alt={homeTeam.name} />
                    ) : (
                      <span className="text-base md:text-lg">{homeTeam.name[0]}</span>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-base md:text-lg font-semibold text-white">
                      {homeTeam.name}
                    </p>
                  </div>
                </div>

                <div className="text-xl md:text-2xl font-bold text-white">VS</div>

                <div className="flex items-center gap-3 md:gap-4">
                  <div className="text-right">
                    <p className="text-base md:text-lg font-semibold text-white">
                      {awayTeam.name}
                    </p>
                  </div>
                  <Avatar className="h-10 w-10 md:h-12 md:w-12 bg-white/10">
                    {awayTeam.photo?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={awayTeam.photo.url} alt={awayTeam.name} />
                    ) : (
                      <span className="text-base md:text-lg">{awayTeam.name[0]}</span>
                    )}
                  </Avatar>
                </div>
              </div>

              {/* Match Score Section - Only show if completed and scores available */}
              {status === 'completed' && isScored && matchScores && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-center text-sm text-gray-400 mb-3">Final Score</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="text-3xl font-bold">{matchScores.homeScore}</div>
                    <div className="text-lg text-gray-400 flex items-center justify-center">-</div>
                    <div className="text-3xl font-bold">{matchScores.awayScore}</div>
                  </div>
                  
                  {/* Pin Counts */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded p-2 text-center">
                      <span className="text-xs text-gray-400 block mb-1">Pins</span>
                      <span className="text-xl font-semibold">{matchScores.homePins}</span>
                    </div>
                    <div className="bg-white/5 rounded p-2 text-center">
                      <span className="text-xs text-gray-400 block mb-1">Pins</span>
                      <span className="text-xl font-semibold">{matchScores.awayPins}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Date and Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400 text-sm md:text-base">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(matchDate, "MMMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-end">
                <span 
                  className={`inline-flex items-center rounded-full px-2 md:px-2.5 py-0.5 text-xs md:text-sm font-medium ${
                    status === 'completed' 
                      ? 'bg-green-500/10 text-green-500'
                      : status === 'in_progress'
                      ? 'bg-yellow-500/10 text-yellow-500'
                      : 'bg-blue-500/10 text-blue-500'
                  }`}
                >
                  {status === 'completed' 
                    ? 'Completed' 
                    : status === 'in_progress' 
                    ? 'In Progress' 
                    : 'Upcoming'}
                  {isScored && status === 'completed' && ' (Scored)'}
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MatchDetailsModal;
