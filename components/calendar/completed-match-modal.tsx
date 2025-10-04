"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Minus, Plus, Trophy, Pencil, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface CompletedMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    start: Date;
    homeTeamPhoto?: {
      url: string | null;
    };
    awayTeamPhoto?: {
      url: string | null;
    };
  } | null;
  onScoreUpdated?: () => void;
}

interface MatchScores {
  homeScore: number;
  awayScore: number;
  homePins: number;
  awayPins: number;
}

export function CompletedMatchModal({
  open,
  onOpenChange,
  match,
  onScoreUpdated,
}: CompletedMatchModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [scores, setScores] = useState<MatchScores>({
    homeScore: 0,
    awayScore: 0,
    homePins: 0,
    awayPins: 0,
  });
  const [originalScores, setOriginalScores] = useState<MatchScores>({
    homeScore: 0,
    awayScore: 0,
    homePins: 0,
    awayPins: 0,
  });

  useEffect(() => {
    if (open && match) {
      fetchMatchScores();
    }
  }, [open, match]);

  const fetchMatchScores = async () => {
    if (!match) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/get-match-score/${match.id}`);

      if (response.data.success) {
        const matchScores = {
          homeScore: response.data.data.homeScore || 0,
          awayScore: response.data.data.awayScore || 0,
          homePins: response.data.data.homePins || 0,
          awayPins: response.data.data.awayPins || 0,
        };
        setScores(matchScores);
        setOriginalScores(matchScores);
      }
    } catch (error) {
      console.error("Error fetching match scores:", error);
      toast({
        title: "Error",
        description: "Failed to load match scores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (team: "home" | "away", change: number) => {
    setScores((prev) => ({
      ...prev,
      [`${team}Score`]: Math.max(0, prev[`${team}Score`] + change),
    }));
  };

  const handlePinChange = (team: "home" | "away", change: number) => {
    setScores((prev) => ({
      ...prev,
      [`${team}Pins`]: Math.max(0, prev[`${team}Pins`] + change),
    }));
  };

  const handleCancel = () => {
    setScores(originalScores);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!match) return;

    try {
      const response = await axios.put(`/api/update-match-score/${match.id}`, {
        ...scores,
        status: 'completed'
      });

      if (response.data.success) {
        setOriginalScores(scores);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Match score updated successfully",
        });

        if (onScoreUpdated) {
          onScoreUpdated();
        }
      }
    } catch (error) {
      console.error("Error updating match scores:", error);
      toast({
        title: "Error",
        description: "Failed to update match scores",
        variant: "destructive",
      });
    }
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && isEditing) {
        handleCancel();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-500" />
              <span>Match Results</span>
            </DialogTitle>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="border-white/10 bg-white/10 hover:bg-white/20 text-white"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Score
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="border-white/10 bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
          <div className="text-center text-sm text-gray-400">
            {format(new Date(match.start), "MMMM d, yyyy • HH:mm")}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Final Score Section */}
            <div className="grid grid-cols-2 gap-8">
              {/* Home Team */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-white/10">
                    <AvatarImage
                      src={match.homeTeamPhoto?.url || ''}
                      alt={match.homeTeam}
                    />
                    <AvatarFallback>{match.homeTeam[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{match.homeTeam}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-6 text-center">
                  <div className="text-6xl font-bold mb-4">
                    {scores.homeScore}
                  </div>
                  {isEditing && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScoreChange("home", -1)}
                        className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScoreChange("home", 1)}
                        className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Away Team */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 justify-end">
                  <span className="font-medium">{match.awayTeam}</span>
                  <Avatar className="h-10 w-10 bg-white/10">
                    <AvatarImage
                      src={match.awayTeamPhoto?.url || ''}
                      alt={match.awayTeam}
                    />
                    <AvatarFallback>{match.awayTeam[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="bg-white/5 rounded-lg p-6 text-center">
                  <div className="text-6xl font-bold mb-4">
                    {scores.awayScore}
                  </div>
                  {isEditing && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScoreChange("away", -1)}
                        className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScoreChange("away", 1)}
                        className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pin Tracker Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pin Tracker</h3>
              <div className="grid grid-cols-2 gap-8">
                {/* Home Team Pins */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-center mb-2">
                    <span className="text-sm text-gray-400">
                      {match.homeTeam} Pins
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-center mb-3">
                    {scores.homePins}
                  </div>
                  {isEditing && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePinChange("home", -1)}
                        className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePinChange("home", 1)}
                        className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Away Team Pins */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-center mb-2">
                    <span className="text-sm text-gray-400">
                      {match.awayTeam} Pins
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-center mb-3">
                    {scores.awayPins}
                  </div>
                  {isEditing && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePinChange("away", -1)}
                        className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePinChange("away", 1)}
                        className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
