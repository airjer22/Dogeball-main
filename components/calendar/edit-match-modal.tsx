"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

interface EditMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: any;
  onMatchUpdated: () => void;
}

export function EditMatchModal({
  open,
  onOpenChange,
  match,
  onMatchUpdated,
}: EditMatchModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    match ? new Date(match.start) : undefined
  );
  const [selectedHour, setSelectedHour] = useState(
    match ? new Date(match.start).getHours().toString() : "9"
  );
  const [selectedMinute, setSelectedMinute] = useState(
    match ? new Date(match.start).getMinutes().toString().padStart(2, "0") : "00"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (!match || !selectedDate) return;

    setIsSubmitting(true);
    try {
      // Create a new date with the selected date and time
      const updatedDate = new Date(selectedDate);
      updatedDate.setHours(parseInt(selectedHour), parseInt(selectedMinute));

      const response = await fetch(`/api/update-scheduled-match/${match.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledDate: updatedDate.toISOString(),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Match has been rescheduled",
        });
        onMatchUpdated();
        onOpenChange(false);
      } else {
        throw new Error(data.message || "Failed to update match");
      }
    } catch (error) {
      console.error("Error updating match:", error);
      toast({
        title: "Error",
        description: "Failed to update match schedule",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Match Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Match</p>
            <p className="font-medium">
              {match.homeTeam?.name || match.homeTeam} vs {match.awayTeam?.name || match.awayTeam}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-400">Current Schedule</p>
            <p className="font-medium">
              {format(new Date(match.start), "MMMM d, yyyy")} at{" "}
              {format(new Date(match.start), "h:mm a")}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-400">Select New Date</p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border border-white/10 bg-white/5 w-full"
              classNames={{
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex w-full",
                head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center",
                row: "flex w-full mt-2",
                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-white/5 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 flex-1",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-white/10 rounded-md flex items-center justify-center",
                day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                day_today: "bg-white/10 text-white",
                day_outside: "text-gray-500 opacity-50",
                day_disabled: "text-gray-500 opacity-50",
                day_range_middle: "aria-selected:bg-white/5 aria-selected:text-white",
                day_hidden: "invisible",
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Hour</label>
              <Select
                value={selectedHour}
                onValueChange={setSelectedHour}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem
                      key={i}
                      value={i.toString()}
                      className="text-white hover:bg-white/5"
                    >
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Minute</label>
              <Select
                value={selectedMinute}
                onValueChange={setSelectedMinute}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {["00", "15", "30", "45"].map((minute) => (
                    <SelectItem
                      key={minute}
                      value={minute}
                      className="text-white hover:bg-white/5"
                    >
                      :{minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-gray-800 text-white hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selectedDate || isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Schedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
