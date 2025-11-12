// components/bracket/match-scoring-dialog.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Minus, Plus, Trophy, Play, Pause, RotateCcw, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";

interface Match {
  id: string;
  round: number;
  position: number;
  homeTeam: {
    id: string;
    name: string;
    seed: number;
    score?: number;
  } | null;
  awayTeam: {
    id: string;
    name: string;
    seed: number;
    score?: number;
  } | null;
  winner?: "home" | "away";
  isPlayable: boolean;
  isCompleted: boolean;
  nextMatchId?: string;
}

interface MatchScoringDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScoreSubmit: (matchId: string, scores: {
    homeScore: number;
    awayScore: number;
    homePins: number;
    awayPins: number;
  }) => void;
}

export function MatchScoringDialog({
  match,
  open,
  onOpenChange,
  onScoreSubmit,
}: MatchScoringDialogProps) {
  const [scores, setScores] = useState({
    homeScore: 0,
    awayScore: 0,
    homePins: 0,
    awayPins: 0,
  });
  
  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [initialTime, setInitialTime] = useState(600);
  const [isLastMinute, setIsLastMinute] = useState(false);
  const [isLastTenSeconds, setIsLastTenSeconds] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to play buzzer sound
  const playBuzzerSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const startTime = audioContext.currentTime;
      oscillator.start(startTime);
      
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.setValueAtTime(0, startTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, startTime + 0.3);
      gainNode.gain.setValueAtTime(0, startTime + 0.5);
      gainNode.gain.setValueAtTime(0.3, startTime + 0.6);
      
      oscillator.stop(startTime + 1);
    } catch (error) {
      console.error('Error playing buzzer sound:', error);
    }
  };
  
  // Initialize timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            playBuzzerSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning]);
  
  // Check for last minute and last 10 seconds
  useEffect(() => {
    setIsLastMinute(timeLeft <= 60 && timeLeft > 0);
    setIsLastTenSeconds(timeLeft <= 10 && timeLeft > 0);
  }, [timeLeft]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleStartPause = () => {
    setTimerRunning(!timerRunning);
  };
  
  const handleResetTimer = () => {
    setTimerRunning(false);
    setTimeLeft(initialTime);
    setIsLastMinute(false);
    setIsLastTenSeconds(false);
    setIsOvertime(false);
  };
  
  const handleTimeAdjust = (value: number[]) => {
    const newTime = value[0];
    setTimeLeft(newTime);
    setInitialTime(newTime);
  };

  const handleOvertime = () => {
    setTimerRunning(false);
    setTimeLeft(180); // 3 minutes for overtime
    setInitialTime(180);
    setIsOvertime(true);
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

  const handleReset = () => {
    setScores({
      homeScore: 0,
      awayScore: 0,
      homePins: 0,
      awayPins: 0,
    });
    handleResetTimer();
  };

  const handleSubmit = () => {
    // Validate that there's a winner
    if (scores.homeScore === scores.awayScore && scores.homePins === scores.awayPins) {
      alert('Match cannot end in a tie. If scores are equal, play overtime until a pin is scored.');
      return;
    }
    
    onScoreSubmit(match!.id, scores);
    onOpenChange(false);
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            <span>Bracket Match Score</span>
          </DialogTitle>
          <div className="text-center text-sm text-gray-400">
            {match.homeTeam?.name} vs {match.awayTeam?.name}
          </div>
        </DialogHeader>
        
        {/* Timer Section */}
        <div className="mb-6">
          <style jsx global>{`
            @keyframes sizePulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            .size-pulse {
              animation: sizePulse 1s infinite;
            }
          `}</style>
          
          {isOvertime && (
            <div className="text-center mb-2 text-yellow-500 font-bold animate-pulse">
              OVERTIME - First Pin Wins!
            </div>
          )}
          
          <div 
            className={`text-center text-7xl font-bold mb-2 ${
              isLastMinute ? 'text-red-500' : 'text-white'
            } ${
              isLastTenSeconds ? 'animate-pulse size-pulse' : ''
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex justify-center gap-3 mb-4">
            <Button
              variant="outline"
              onClick={handleStartPause}
              className="border-white/10 bg-white/10 hover:bg-white/20 text-white"
            >
              {timerRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetTimer}
              className="border-white/10 bg-white/10 hover:bg-white/20 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            {timeLeft === 0 && scores.homeScore === scores.awayScore && (
              <Button
                variant="outline"
                onClick={handleOvertime}
                className="border-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500"
              >
                Start Overtime (3 min)
              </Button>
            )}
          </div>
          
          {!isOvertime && (
            <div className="px-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Adjust Timer (minutes:seconds)</span>
              </div>
              <Slider
                defaultValue={[initialTime]}
                max={1800}
                step={30}
                onValueChange={handleTimeAdjust}
                disabled={timerRunning}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0:00</span>
                <span>15:00</span>
                <span>30:00</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8 py-4">
          {/* Score Section */}
          <div className="grid grid-cols-2 gap-8">
            {/* Home Team */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-white/10">
                  <AvatarFallback>{match.homeTeam?.name[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{match.homeTeam?.name}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-6 text-center">
                <div className="text-6xl font-bold mb-4">
                  {scores.homeScore}
                </div>
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
              </div>
            </div>

            {/* Away Team */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 justify-end">
                <span className="font-medium">{match.awayTeam?.name}</span>
                <Avatar className="h-10 w-10 bg-white/10">
                  <AvatarFallback>{match.awayTeam?.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="bg-white/5 rounded-lg p-6 text-center">
                <div className="text-6xl font-bold mb-4">
                  {scores.awayScore}
                </div>
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
              </div>
            </div>
          </div>

          {/* Pin Tracker Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pin Tracker {isOvertime && <span className="text-yellow-500">(Overtime Tiebreaker)</span>}</h3>
            <div className="grid grid-cols-2 gap-8">
              {/* Home Team Pins */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-center mb-2">
                  <span className="text-sm text-gray-400">
                    {match.homeTeam?.name} Pins
                  </span>
                </div>
                <div className="text-4xl font-bold text-center mb-3">
                  {scores.homePins}
                </div>
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
              </div>

              {/* Away Team Pins */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-center mb-2">
                  <span className="text-sm text-gray-400">
                    {match.awayTeam?.name} Pins
                  </span>
                </div>
                <div className="text-4xl font-bold text-center mb-3">
                  {scores.awayPins}
                </div>
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
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-white/10 bg-white text-black hover:bg-white/90"
            >
              Reset All
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit Match Score
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
