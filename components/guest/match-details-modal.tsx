"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
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
  if (!matchId || !matchDate || !homeTeam || !awayTeam) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Match Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
  );
}

export default MatchDetailsModal;
