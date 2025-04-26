"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleDelete = async () => {
    if (!match) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/delete-scheduled-match/${match.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Match has been deleted and returned to unscheduled matches",
        });
        onMatchUpdated();
        onOpenChange(false);
      } else {
        throw new Error(data.message || "Failed to delete match");
      }
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error",
        description: "Failed to delete match",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!match) return null;

  return (
    <>
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
            <div className="edit-match-calendar">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border border-white/10 bg-white/5"
              />
            </div>
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

          <DialogFooter className="flex justify-between w-full">
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              Delete Match
            </Button>
            <div className="flex gap-3">
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
          </DialogFooter>
        </div>
      </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Match</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Are you sure you want to delete this match? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-gray-800 text-white hover:bg-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
