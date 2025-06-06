"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { format } from "date-fns";
import { Calendar } from "@/components/calendar/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilIcon, Search, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrag } from "react-dnd";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Types and Interfaces
export type RoundType = "regular" | "quarterFinal" | "semiFinal" | "final";
export type MatchType = "quarterfinal" | "semifinal" | "final";

interface Match {
  _id: string;
  tournamentId: string;
  round: number;
  roundType: RoundType;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string;
  awayTeamId: string;
  status: 'scheduled' | 'unscheduled' | 'completed';
  scheduledDate?: Date;
  scores?: {
    homeScore?: number;
    awayScore?: number;
    homePins?: number;
    awayPins?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ScheduledMatch {
  id: string;
  title: string;
  start: Date;
  end: Date;
  round: number;
  matchType?: MatchType;
  roundType?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  homeTeam: {
    id: string;
    name: string;
    photo?: {
      url: string | null;
    };
  };
  awayTeam: {
    id: string;
    name: string;
    photo?: {
      url: string | null;
    };
  };
  isScored: boolean;
}

interface RoundGroup {
  roundNumber: number;
  roundType: RoundType;
  matches: Match[];
  isExpanded: boolean;
}

interface UnscheduledMatchProps {
  match: Match;
  isEditing: boolean;
}

interface Scores {
  homeScore: number;
  awayScore: number;
  homePins: number;
  awayPins: number;
}

// Helper Functions
const getMatchType = (roundType: RoundType): MatchType | undefined => {
  switch (roundType) {
    case 'quarterFinal':
      return 'quarterfinal';
    case 'semiFinal':
      return 'semifinal';
    case 'final':
      return 'final';
    default:
      return undefined;
  }
};

const getRoundLabel = (roundType: RoundType, roundNumber: number): string => {
  switch (roundType) {
    case 'quarterFinal':
      return 'Quarter Finals';
    case 'semiFinal':
      return 'Semi Finals';
    case 'final':
      return 'Final';
    default:
      return `Round ${roundNumber}`;
  }
};

// States Components
const LoadingState = () => (
  <div className="flex items-center justify-center h-[92vh]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
      <p className="text-white text-sm">Loading tournaments...</p>
    </div>
  </div>
);

const NoTournamentsState = () => (
  <div className="flex flex-col items-center justify-center h-[92vh]">
    <h1 className="text-xl font-semibold text-white mb-2">No Tournaments Available</h1>
    <p className="text-gray-400 text-sm">Create a tournament to get started.</p>
  </div>
);

// UnscheduledMatch Component
const UnscheduledMatch: React.FC<UnscheduledMatchProps> = ({ match, isEditing }) => {
  const [{ isDragging }, drag] = useDrag({
    type: "match",
    item: match,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => isEditing
  });

  return (
    <div
      ref={drag}
      className={cn(
        "p-3 rounded-lg bg-white/5 mb-2",
        isEditing && "cursor-move",
        isDragging && "opacity-50"
      )}
    >
      <div className="text-white font-medium">
        {match.homeTeam} vs {match.awayTeam}
      </div>
      <div className="text-sm text-blue-400">
        {getRoundLabel(match.roundType, match.round)}
      </div>
    </div>
  );
};

// RoundGroup Component
const RoundGroup: React.FC<{
  roundData: RoundGroup;
  isEditing: boolean;
  onToggleExpand: (roundNumber: number) => void;
}> = ({ roundData, isEditing, onToggleExpand }) => {
  return (
    <div className="mb-4">
      <button
        onClick={() => onToggleExpand(roundData.roundNumber)}
        className="flex items-center w-full p-2 text-white hover:bg-white/5 rounded-lg transition-colors"
      >
        {roundData.isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        <span className="font-medium">
          {getRoundLabel(roundData.roundType, roundData.roundNumber)}
        </span>
        <span className="ml-2 text-sm text-gray-400">
          ({roundData.matches.length} matches)
        </span>
      </button>
      
      {roundData.isExpanded && (
        <div className="ml-6 mt-2 space-y-2">
          {roundData.matches.map((match) => (
            <UnscheduledMatch
              key={match._id}
              match={match}
              isEditing={isEditing}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Calendar Page Component
export default function CalendarPage() {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roundGroups, setRoundGroups] = useState<RoundGroup[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTournaments, setHasTournaments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkTournamentsAndFetchMatches = async () => {
      try {
        setLoading(true);
        const tournamentsResponse = await axios.get("/api/get-tournament");
        if (!tournamentsResponse.data.success || tournamentsResponse.data.data.length === 0) {
          setHasTournaments(false);
          setLoading(false);
          return;
        }

        setHasTournaments(true);

        // Fetch unscheduled matches
        const matchesResponse = await axios.get("/api/get-match");
        
        // Process unscheduled matches
        if (matchesResponse.data && 
            matchesResponse.data.message !== "No unscheduled matches found." && 
            matchesResponse.data.message !== "All matches are scheduled.") {
          
          const matches = matchesResponse.data as Match[];
          
          const groupedMatches = matches.reduce<Record<string, RoundGroup>>((groups, match) => {
            const key = `${match.round}-${match.roundType}`;
            if (!groups[key]) {
              groups[key] = {
                roundNumber: match.round,
                roundType: match.roundType || "regular",
                matches: [],
                isExpanded: true
              };
            }
            if (match.status === 'unscheduled') {
              groups[key].matches.push(match);
            }
            return groups;
          }, {});

          const sortedGroups = Object.values(groupedMatches)
            .sort((a, b) => {
              if (a.roundType === "regular" && b.roundType !== "regular") return -1;
              if (a.roundType !== "regular" && b.roundType === "regular") return 1;
              
              const typePriority = {
                regular: 0,
                quarterFinal: 1,
                semiFinal: 2,
                final: 3
              };
              
              if (a.roundType !== b.roundType) {
                return typePriority[a.roundType] - typePriority[b.roundType];
              }
              
              return a.roundNumber - b.roundNumber;
            });

          setRoundGroups(sortedGroups);
        } else {
          setRoundGroups([]);
        }

        // Fetch scheduled matches
        const scheduledMatchesResponse = await axios.get("/api/get-all-scheduled-matches");
        
        if (scheduledMatchesResponse.data && scheduledMatchesResponse.data.success) {
          const scheduledMatchesData = scheduledMatchesResponse.data.data;
          
          const scheduled = scheduledMatchesData.map((match: any) => ({
            id: match._id,
            start: new Date(match.scheduledDate),
            end: new Date(match.endDate),
            title: `${format(new Date(match.scheduledDate), 'h:mm a')} - ${match.homeTeamId.teamName} vs ${match.awayTeamId.teamName}${
              match.matchType ? ` (${match.matchType.charAt(0).toUpperCase() + match.matchType.slice(1)})` : ''
            }`,
            round: match.round,
            matchType: match.matchType,
            roundType: match.roundType,
            status: match.status as 'scheduled' | 'in_progress' | 'completed',
            homeTeam: {
              id: match.homeTeamId._id,
              name: match.homeTeamId.teamName,
              photo: match.homeTeamId.teamPhoto
            },
            awayTeam: {
              id: match.awayTeamId._id,
              name: match.awayTeamId.teamName,
              photo: match.awayTeamId.teamPhoto
            },
            isScored: match.status === 'completed'
          }));

          setScheduledMatches(scheduled);
        } else {
          setScheduledMatches([]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTournamentsAndFetchMatches();
  }, [toast]);

  // Function to refresh both scheduled and unscheduled matches
  const refreshMatches = async () => {
    try {
      // Fetch unscheduled matches
      const matchesResponse = await axios.get("/api/get-match");
      
      // Process unscheduled matches
      if (matchesResponse.data && 
          matchesResponse.data.message !== "No unscheduled matches found." && 
          matchesResponse.data.message !== "All matches are scheduled.") {
        
        const matches = matchesResponse.data as Match[];
        
        const groupedMatches = matches.reduce<Record<string, RoundGroup>>((groups, match) => {
          const key = `${match.round}-${match.roundType}`;
          if (!groups[key]) {
            groups[key] = {
              roundNumber: match.round,
              roundType: match.roundType || "regular",
              matches: [],
              isExpanded: true
            };
          }
          if (match.status === 'unscheduled') {
            groups[key].matches.push(match);
          }
          return groups;
        }, {});

        const sortedGroups = Object.values(groupedMatches)
          .sort((a, b) => {
            if (a.roundType === "regular" && b.roundType !== "regular") return -1;
            if (a.roundType !== "regular" && b.roundType === "regular") return 1;
            
            const typePriority = {
              regular: 0,
              quarterFinal: 1,
              semiFinal: 2,
              final: 3
            };
            
            if (a.roundType !== b.roundType) {
              return typePriority[a.roundType] - typePriority[b.roundType];
            }
            
            return a.roundNumber - b.roundNumber;
          });

        setRoundGroups(sortedGroups);
      } else {
        setRoundGroups([]);
      }

      // Fetch scheduled matches
      const scheduledMatchesResponse = await axios.get("/api/get-all-scheduled-matches");
      
      if (scheduledMatchesResponse.data && scheduledMatchesResponse.data.success) {
        const scheduledMatchesData = scheduledMatchesResponse.data.data;
        
        const scheduled = scheduledMatchesData.map((match: any) => ({
          id: match._id,
          start: new Date(match.scheduledDate),
          end: new Date(match.endDate),
          title: `${format(new Date(match.scheduledDate), 'h:mm a')} - ${match.homeTeamId.teamName} vs ${match.awayTeamId.teamName}${
            match.matchType ? ` (${match.matchType.charAt(0).toUpperCase() + match.matchType.slice(1)})` : ''
          }`,
          round: match.round,
          matchType: match.matchType,
          roundType: match.roundType,
          status: match.status as 'scheduled' | 'in_progress' | 'completed',
          homeTeam: {
            id: match.homeTeamId._id,
            name: match.homeTeamId.teamName,
            photo: match.homeTeamId.teamPhoto
          },
          awayTeam: {
            id: match.awayTeamId._id,
            name: match.awayTeamId.teamName,
            photo: match.awayTeamId.teamPhoto
          },
          isScored: match.status === 'completed'
        }));

        setScheduledMatches(scheduled);
      } else {
        setScheduledMatches([]);
      }
    } catch (error) {
      console.error('Error refreshing matches:', error);
    }
  };

  const handleMatchScheduled = async (match: Match, date: Date) => {
    try {
      console.log("Scheduling match:", match, "at date:", date);
      const matchType = getMatchType(match.roundType);

      const response = await axios.post<{ success: boolean; data?: any; message?: string }>('/api/schedule-match', {
        matchId: match._id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        scheduledDate: date.toISOString(),  // Ensure date is properly formatted
        tournamentId: match.tournamentId,
        round: match.round,
        roundType: match.roundType,
        matchType: matchType
      });

      console.log("Schedule match response:", response.data);

      if (response.data.success) {
        // Instead of manually updating the state, refresh all matches
        // This ensures we have the most up-to-date data from the server
        await refreshMatches();
        
        toast({
          title: "Success",
          description: "Match scheduled successfully"
        });
      } else {
        // Handle the case where success is false
        const errorMessage = response.data.message || "Failed to schedule match";
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error scheduling match:', err);
      toast({
        title: "Error",
        description: "Failed to schedule match",
        variant: "destructive"
      });
    }
  };

  const handleToggleRound = (roundNumber: number) => {
    setRoundGroups(prevGroups =>
      prevGroups.map(group =>
        group.roundNumber === roundNumber
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    );
  };

  const filteredRoundGroups = roundGroups
    .map(group => ({
      ...group,
      matches: group.matches.filter(match =>
        match.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.awayTeam.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(group => group.matches.length > 0);

  if (loading) {
    return <LoadingState />;
  }

  if (!hasTournaments) {
    return <NoTournamentsState />;
  }

  // Function to handle match updates (including deletions)
  const handleMatchUpdated = () => {
    refreshMatches();
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col md:flex-row">
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 h-[40vh] md:h-screen">
          <div className="p-4 space-y-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-white/5">
            <h3 className="text-lg font-semibold text-white">
              Unscheduled Matches
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1">
              {filteredRoundGroups.map((group) => (
                <RoundGroup
                  key={`${group.roundNumber}-${group.roundType}`}
                  roundData={group}
                  isEditing={isEditing}
                  onToggleExpand={handleToggleRound}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 h-[60vh] md:h-screen overflow-hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h1 className=" text-lg  xl:text-3xl font-bold text-white">Calendar</h1>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "default" : "outline"}
                className={cn(
                  isEditing
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-white hover:bg-white/90",
                  "text-sm"
                )}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {isEditing ? "Done Editing" : "Edit Calendar"}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto lg:overflow-visible scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-white/5">
              <Calendar
                events={scheduledMatches}
                isEditing={isEditing}
                onMatchScheduled={handleMatchScheduled}
                onMatchUpdated={handleMatchUpdated}
              />
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
