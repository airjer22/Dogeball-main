"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Clock, X } from "lucide-react";
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
    name: string;
    photo?: {
      url: string | null;
    };
  } | null;
  awayTeam: {
    name: string;
    photo?: {
      url: string | null;
    };
  } | null;
  isCompleted: boolean;
}

export function MatchDetailsModal({
  open,
  onOpenChange,
  matchId,
  matchDate,
  homeTeam,
  awayTeam,
  isCompleted,
}: MatchDetailsModalProps) {
  const [enlargedLogo, setEnlargedLogo] = useState<{
    url: string;
    teamName: string;
  } | null>(null);

  if (!matchId || !matchDate || !homeTeam || !awayTeam) {
    return null;
  }

  const handleLogoClick = (url: string | null, teamName: string) => {
    if (url) {
      setEnlargedLogo({ url, teamName });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Match Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <Avatar 
                  className={`h-10 w-10 md:h-12 md:w-12 bg-white/10 ${homeTeam.photo?.url ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all' : ''}`}
                  onClick={() => homeTeam.photo?.url && handleLogoClick(homeTeam.photo.url, homeTeam.name)}
                >
                  {homeTeam.photo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={homeTeam.photo.url} 
                      alt={homeTeam.name} 
                      title="Click to enlarge"
                    />
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
                <Avatar 
                  className={`h-10 w-10 md:h-12 md:w-12 bg-white/10 ${awayTeam.photo?.url ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all' : ''}`}
                  onClick={() => awayTeam.photo?.url && handleLogoClick(awayTeam.photo.url, awayTeam.name)}
                >
                  {awayTeam.photo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={awayTeam.photo.url} 
                      alt={awayTeam.name}
                      title="Click to enlarge"
                    />
                  ) : (
                    <span className="text-base md:text-lg">{awayTeam.name[0]}</span>
                  )}
                </Avatar>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400 text-sm md:text-base">
                <Clock className="h-4 w-4" />
                <span>
                  {format(matchDate, "MMMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <span 
                className={`inline-flex items-center rounded-full px-2 md:px-2.5 py-0.5 text-xs md:text-sm font-medium ${
                  isCompleted 
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-blue-500/10 text-blue-500'
                }`}
              >
                {isCompleted ? 'Completed' : 'Upcoming'}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enlarged Logo Modal */}
      {enlargedLogo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={() => setEnlargedLogo(null)}>
          <div className="relative max-w-3xl w-full mx-4">
            <button 
              className="absolute -top-10 right-0 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700"
              onClick={() => setEnlargedLogo(null)}
            >
              <X className="h-6 w-6" />
            </button>
            <div className="bg-gray-900 p-4 rounded-lg">
              <h3 className="text-white text-xl mb-4">{enlargedLogo.teamName} Logo</h3>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={enlargedLogo.url} 
                  alt={`${enlargedLogo.teamName} logo`} 
                  className="max-h-[70vh] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MatchDetailsModal;
