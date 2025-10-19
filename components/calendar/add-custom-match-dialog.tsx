"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface Team {
  _id: string;
  teamName: string;
  tournamentId: string;
}

interface AddCustomMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  onMatchAdded: () => void;
}

export function AddCustomMatchDialog({
  isOpen,
  onClose,
  tournamentId,
  onMatchAdded
}: AddCustomMatchDialogProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch teams when dialog opens
  useEffect(() => {
    if (isOpen && tournamentId) {
      fetchTeams();
    }
  }, [isOpen, tournamentId]);

  const fetchTeams = async () => {
    try {
      const response = await axios.post("/api/get-teams", {
        tournamentId
      });
      
      if (response.data.success) {
        setTeams(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!homeTeamId || !awayTeamId) {
      toast({
        title: "Error",
        description: "Please select both home and away teams",
        variant: "destructive"
      });
      return;
    }

    if (homeTeamId === awayTeamId) {
      toast({
        title: "Error",
        description: "Home and away teams must be different",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create end date (1 hour after start)
      const endDateTime = new Date(scheduledDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);

      const response = await axios.post("/api/create-custom-match", {
        homeTeamId,
        awayTeamId,
        tournamentId,
        scheduledDate: scheduledDateTime.toISOString(),
        endDate: endDateTime.toISOString()
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Custom match created successfully"
        });
        
        // Reset form
        setHomeTeamId("");
        setAwayTeamId("");
        setSelectedDate(undefined);
        setSelectedTime("12:00");
        
        // Notify parent and close
        onMatchAdded();
        onClose();
      }
    } catch (error) {
      console.error("Error creating custom match:", error);
      toast({
        title: "Error",
        description: "Failed to create custom match",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setHomeTeamId("");
    setAwayTeamId("");
    setSelectedDate(undefined);
    setSelectedTime("12:00");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Add Custom Match</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Home Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="homeTeam" className="text-white">Home Team</Label>
            <Select value={homeTeamId} onValueChange={setHomeTeamId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select home team" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {teams
                  .filter(team => team._id !== awayTeamId)
                  .map((team) => (
                    <SelectItem
                      key={team._id}
                      value={team._id}
                      className="text-white hover:bg-white/5"
                    >
                      {team.teamName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Away Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="awayTeam" className="text-white">Away Team</Label>
            <Select value={awayTeamId} onValueChange={setAwayTeamId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select away team" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {teams
                  .filter(team => team._id !== homeTeamId)
                  .map((team) => (
                    <SelectItem
                      key={team._id}
                      value={team._id}
                      className="text-white hover:bg-white/5"
                    >
                      {team.teamName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="text-white">Match Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10",
                    !selectedDate && "text-gray-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="bg-gray-900 text-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time" className="text-white">Match Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="time"
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Creating..." : "Add Match"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
