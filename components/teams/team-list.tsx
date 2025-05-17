"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Trash2, ChevronRight, ChevronDown, Users, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Tournament {
  _id: string;
  tournamentName: string;
}

interface TeamMember {
  _id: string;
  name: string;
  photo: {
    url: string | null;
    publicId: string | null;
  };
}

interface Team {
  _id: string;
  teamName: string;
  teamPhoto: {
    url: string | null;
    publicId: string | null;
  };
  tournamentId: string;
  teamMembers?: TeamMember[];
  substitutePlayers?: TeamMember[];
}

interface TeamListProps {
  onTeamSelect: (teamId: string | null) => void;
  selectedTeam: string | null;
  refetchTrigger?: number;
}

export function TeamList({ 
  onTeamSelect, 
  selectedTeam, 
  refetchTrigger = 0 
}: TeamListProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"tournaments" | "members">("tournaments");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<{ [key: string]: Team[] }>({});
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  
  useEffect(() => {
    if (!selectedTournament) {
      onTeamSelect(null);
    }
  }, [selectedTournament, onTeamSelect]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/get-tournament");
        if (response.data.success) {
          setTournaments(response.data.data || []);
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError("Failed to load tournaments");
        console.error("Error fetching tournaments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  // Fetch all teams for all tournaments
  useEffect(() => {
    const fetchAllTeams = async () => {
      if (!tournaments.length) return;
      
      try {
        const allTeamsData: Team[] = [];
        
        for (const tournament of tournaments) {
          try {
            const response = await axios.post("/api/get-teams", {
              tournamentId: tournament._id,
            });
            
            if (response.data.success && response.data.data) {
              allTeamsData.push(...response.data.data);
            }
          } catch (err) {
            console.error(`Error fetching teams for tournament ${tournament._id}:`, err);
          }
        }
        
        setAllTeams(allTeamsData);
      } catch (err) {
        console.error("Error fetching all teams:", err);
      }
    };

    fetchAllTeams();
  }, [tournaments, refetchTrigger]);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!selectedTournament) {
        setTeams({});
        return;
      }

      try {
        const response = await axios.post("/api/get-teams", {
          tournamentId: selectedTournament,
        });

        if (response.data.success) {
          setTeams(prev => ({
            ...prev,
            [selectedTournament]: response.data.data || []
          }));
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError("Failed to load teams");
        console.error("Error fetching teams:", err);
      }
    };

    if (selectedTournament) {
      fetchTeams();
    }
  }, [selectedTournament, refetchTrigger]);

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const response = await axios.delete('/api/delete-team', {
        data: { teamId }
      });

      if (response.data.success) {
        setTeams(prev => {
          const newTeams = { ...prev };
          Object.keys(newTeams).forEach(tournamentId => {
            newTeams[tournamentId] = newTeams[tournamentId].filter(
              t => t._id !== teamId
            );
          });
          return newTeams;
        });

        if (selectedTeam === teamId) {
          onTeamSelect(null);
        }

        toast({
          title: "Success",
          description: "Team deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  // Filter tournaments or teams based on search mode
  const filteredTournaments = tournaments.filter((tournament) =>
    tournament?.tournamentName
      ?.toLowerCase()
      .includes((searchQuery || "").toLowerCase())
  );

  // Filter teams based on member names
  const teamsWithMatchingMembers = searchQuery && searchMode === "members" 
    ? allTeams.filter(team => {
        const memberMatches = team.teamMembers?.some(member => 
          member.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || false;
        
        const substituteMatches = team.substitutePlayers?.some(member => 
          member.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || false;
        
        return memberMatches || substituteMatches;
      })
    : [];

  // Get tournaments that have teams with matching members
  const tournamentsWithMatchingMembers = searchQuery && searchMode === "members"
    ? tournaments.filter(tournament => 
        teamsWithMatchingMembers.some(team => team.tournamentId === tournament._id)
      )
    : [];

  if (loading && !tournaments.length) {
    return <div className="text-white">Loading tournaments...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden px-2 sm:px-4">
      {/* Search Tabs and Input */}
      <div className="space-y-2 pt-2">
        <Tabs defaultValue="tournaments" onValueChange={(value) => setSearchMode(value as "tournaments" | "members")}>
          <TabsList className="grid grid-cols-2 bg-white/5">
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-blue-600">
              <Search className="h-4 w-4 mr-2" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-blue-600">
              <User className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder={searchMode === "tournaments" ? "Search tournaments..." : "Search team members..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-400 w-full"
          />
        </div>
      </div>

      {/* Tournament List */}
      <div className="space-y-1">
        {(searchMode === "tournaments" ? filteredTournaments : tournamentsWithMatchingMembers).map((tournament) => (
          <div key={tournament._id} className="space-y-1">
            <div
              onClick={() =>
                setSelectedTournament(
                  selectedTournament === tournament._id ? null : tournament._id
                )
              }
              className={cn(
                "flex items-center p-2 sm:p-3 rounded-lg transition-colors cursor-pointer",
                selectedTournament === tournament._id
                  ? "bg-indigo-900/50"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                {selectedTournament === tournament._id ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <span className="font-medium text-white text-sm sm:text-base truncate">
                  {tournament.tournamentName}
                </span>
              </div>
            </div>

            {/* Team Items */}
            {selectedTournament === tournament._id &&
              teams[tournament._id]?.filter(team => {
                if (searchMode === "members" && searchQuery) {
                  return teamsWithMatchingMembers.some(t => t._id === team._id);
                }
                return true;
              }).map((team) => (
                <div
                  key={team._id}
                  onClick={() => onTeamSelect(team._id)}
                  className={cn(
                    "flex items-center justify-between p-2 sm:p-3 rounded-lg ml-4 sm:ml-6 cursor-pointer",
                    selectedTeam === team._id
                      ? "bg-blue-600"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 bg-white/10 flex-shrink-0">
                      {team.teamPhoto?.url ? (
                        <img src={team.teamPhoto.url} alt={team.teamName} className="object-cover" />
                      ) : (
                        <span className="text-xs sm:text-sm">{team.teamName?.[0] || ""}</span>
                      )}
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-white text-sm sm:text-base truncate">
                        {team.teamName}
                      </span>
                      {searchMode === "members" && searchQuery && team.teamMembers && (
                        <div className="text-xs text-gray-400">
                          {team.teamMembers
                            .filter(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(member => member.name)
                            .concat(
                              team.substitutePlayers
                                ?.filter(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(member => `${member.name} (Sub)`) || []
                            )
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500 hover:bg-white/5 ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialog({
                        isOpen: true,
                        id: team._id,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        ))}
      </div>

     
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(isOpen) =>
          setDeleteDialog({ isOpen, id: null })
        }
      >
        <AlertDialogContent className="bg-gray-900 border-white/10 w-[95vw] max-w-md mx-auto">
        <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Team
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-white border-white/10 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteDialog.id) {
                  handleDeleteTeam(deleteDialog.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
