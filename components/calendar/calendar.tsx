"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import axios from "axios";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  setHours,
  setMinutes,
} from "date-fns";
import { useDrop } from "react-dnd";
import { cn } from "@/lib/utils";
import { TimePickerModal } from "./time-picker-modal";
import { MatchScoringModal } from "./match-scoring-modal";
import { EditMatchModal } from "./edit-match-modal";
import { MatchDetailsModal } from "./match-details-modal";
import { useToast } from "@/hooks/use-toast";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface MatchEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  round: number;
  matchType?: 'quarterfinal' | 'semifinal' | 'final';
  roundType?: string;
  status: "scheduled" | "in_progress" | "completed";
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
}

interface CalendarProps {
  events: MatchEvent[];
  isEditing: boolean;
  onMatchScheduled: (match: any, date: Date) => void;
  onMatchUpdated?: () => void;
}

export function Calendar({
  events,
  isEditing,
  onMatchScheduled,
  onMatchUpdated,
}: CalendarProps) {
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledMatches, setScheduledMatches] = useState<MatchEvent[]>([]);
  const [timePickerState, setTimePickerState] = useState({
    isOpen: false,
    match: null as any,
    date: null as Date | null,
  });

  const [scoringState, setScoringState] = useState({
    isOpen: false,
    match: null as any,
  });

  const [editState, setEditState] = useState({
    isOpen: false,
    match: null as any,
  });

  const [detailsState, setDetailsState] = useState({
    isOpen: false,
    match: null as MatchEvent | null,
  });

  // We don't need to fetch scheduled matches anymore as they're passed via props
  // But we'll keep the state for internal use
  useEffect(() => {
    // Initialize scheduledMatches with an empty array
    setScheduledMatches([]);
  }, []);

  const handleScoreSubmit = async (scores: {
    homeScore: number;
    awayScore: number;
    homePins: number;
    awayPins: number;
    status: "completed";
  }) => {
    if (scoringState.match) {
      try {
        const response = await axios.put(`/api/update-match-score/${scoringState.match.id}`, scores);
        
        if (response.data.success) {
          setScheduledMatches((prev) =>
            prev.map((match) =>
              match.id === scoringState.match.id
                ? {
                    ...match,
                    status: "completed",
                  }
                : match
            )
          );

          toast({
            title: "Success",
            description: "Match score updated successfully",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update match score",
          variant: "destructive",
        });
      }
    }
  };

  const handleEventClick = (event: MatchEvent) => {
    if (isEditing) {
      // If in editing mode, open the edit modal for any match
      const matchData = {
        id: event.id,
        homeTeam: event.homeTeam.name,
        awayTeam: event.awayTeam.name,
        homeTeamId: event.homeTeam.id,
        awayTeamId: event.awayTeam.id,
        start: event.start,
        end: event.end,
        status: event.status,
        matchType: event.matchType
      };

      setEditState({
        isOpen: true,
        match: matchData,
      });
    } else {
      // First, show the match details modal for any match
      setDetailsState({
        isOpen: true,
        match: event,
      });
      
      // If the match is not completed and not a special match type, also allow scoring
      if (event.status !== "completed") {
        if (event.matchType === 'quarterfinal' || 
            event.matchType === 'semifinal' || 
            event.matchType === 'final') {
          toast({
            title: "Score Update Restricted",
            description: "Please update the score in the tournament bracket section",
            variant: 'destructive'
          });
          return;
        }

        const matchData = {
          id: event.id,
          homeTeam: event.homeTeam.name,
          awayTeam: event.awayTeam.name,
          homeTeamPhoto: event.homeTeam.photo,
          awayTeamPhoto: event.awayTeam.photo,
          start: event.start,
          status: event.status,
          matchType: event.matchType
        };

        setScoringState({
          isOpen: true,
          match: matchData,
        });
      }
    }
  };

  const [{ isOver }, drop] = useDrop({
    accept: "match",
    hover: (item, monitor) => {
      const calendar = calendarRef.current;
      if (!calendar) return;

      const clientOffset = monitor.getClientOffset();
      if (clientOffset) {
        const cells = calendar.querySelectorAll(".rbc-day-bg");
        cells.forEach((cell) => {
          cell.classList.remove("bg-white/10");
          const rect = cell.getBoundingClientRect();
          if (
            clientOffset.x >= rect.left &&
            clientOffset.x <= rect.right &&
            clientOffset.y >= rect.top &&
            clientOffset.y <= rect.bottom
          ) {
            cell.classList.add("bg-white/10");
          }
        });
      }
    },
    drop: (item: any, monitor) => {
      const calendar = calendarRef.current;
      if (!calendar || !isEditing) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const cells = calendar.querySelectorAll(".rbc-day-bg");
      let droppedDate: Date | null = null;

      cells.forEach((cell) => {
        const rect = cell.getBoundingClientRect();
        if (
          clientOffset.x >= rect.left &&
          clientOffset.x <= rect.right &&
          clientOffset.y >= rect.top &&
          clientOffset.y <= rect.bottom
        ) {
          const dateAttr = cell.getAttribute("data-date");
          if (dateAttr) {
            droppedDate = new Date(dateAttr);
          }
        }
        cell.classList.remove("bg-white/10");
      });

      if (droppedDate) {
        setTimePickerState({
          isOpen: true,
          match: item,
          date: droppedDate,
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleTimeSelected = (hours: number, minutes: number) => {
    if (timePickerState.date && timePickerState.match) {
      const scheduledDate = setMinutes(
        setHours(timePickerState.date, hours),
        minutes
      );
      onMatchScheduled(timePickerState.match, scheduledDate);
      setTimePickerState({ isOpen: false, match: null, date: null });
    }
  };

  return (
    <>
      <div
        ref={(node) => {
          drop(node);
          if (node) {
            calendarRef.current = node;
          }
        }}
        className={cn(
          "h-[calc(100vh-10rem)] bg-white/5 rounded-lg   p-4",
          isEditing && "cursor-copy",
          isOver && "ring-2 ring-blue-500/50"
        )}
      >
        <style jsx global>{`
          /* Fixed height for month rows and contained events */
          .calendar-dark .rbc-month-view {
            height: 100%;
          }
          .calendar-dark .rbc-month-row {
            min-height: 120px;
            max-height: 120px;
            overflow: hidden;
          }
          .calendar-dark .rbc-row-content {
            max-height: 100%;
            overflow: hidden;
          }
          .calendar-dark .rbc-event {
            position: relative;
            cursor: pointer;
            margin-bottom: 1px;
          }
          
          /* Prevent events from overflowing */
          .calendar-dark .rbc-event-content {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          /* Custom scrollable container for each day */
          .calendar-dark .rbc-day-bg {
            position: relative;
          }
          
          /* Add a custom class to day cells */
          .calendar-dark .rbc-day-bg::after {
            content: "";
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
          }
          
          /* Style for the "more" indicator */
          .calendar-dark .rbc-show-more {
            background-color: transparent;
            color: #3b82f6;
            font-weight: bold;
            padding: 2px 5px;
            text-align: center;
            cursor: pointer;
          }
          
          /* Limit the number of visible events */
          .calendar-dark .rbc-month-view .rbc-month-row {
            overflow: hidden;
          }
          
          /* Make sure events don't overflow */
          .calendar-dark .rbc-event {
            overflow: hidden;
            max-height: 22px;
          }
          
          /* Ensure the day cells have proper sizing */
          .calendar-dark .rbc-date-cell {
            padding-right: 5px;
            text-align: right;
          }
          
          /* Improve the appearance of the calendar */
          .calendar-dark .rbc-today {
            background-color: rgba(59, 130, 246, 0.1);
          }
        `}</style>
        
        <BigCalendar
          localizer={localizer}
          events={events}  // Use only the events from props
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day"]}
          defaultView="month"
          date={currentDate}
          onNavigate={date => setCurrentDate(date)}
          selectable={isEditing}
          className="calendar-dark"
          tooltipAccessor={(event: MatchEvent) => event.title}
          onSelectEvent={handleEventClick}
          popup={true}
          components={{
            dateCellWrapper: (props: any) => {
              const { children, value } = props;
              return React.cloneElement(children, {
                "data-date": value.toISOString(),
              });
            },
            event: (props: any) => (
              <div title={props.event.title}>
                <div className="text-xs">{props.event.title}</div>
              </div>
            ),
          }}
          eventPropGetter={(event: MatchEvent) => {
            const statusClass = event.status.toLowerCase();
            return {
              className: `rbc-event ${statusClass}`,
            };
          }}
        />
      </div>

      <TimePickerModal
        open={timePickerState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTimePickerState({ isOpen: false, match: null, date: null });
          }
        }}
        onTimeSelected={handleTimeSelected}
        match={timePickerState.match}
        date={timePickerState.date}
      />

      <MatchScoringModal
        open={scoringState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setScoringState({ isOpen: false, match: null });
          }
        }}
        match={scoringState.match}
        onScoreSubmit={handleScoreSubmit}
      />

      <EditMatchModal
        open={editState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditState({ isOpen: false, match: null });
          }
        }}
        match={editState.match}
        onMatchUpdated={() => {
          // Refresh the scheduled matches after an update
          const fetchScheduledMatches = async () => {
            try {
              const response = await axios.get("/api/get-all-scheduled-matches");
              if (response.data.success) {
                const formattedMatches = response.data.data.map((match: any) => ({
                  id: match._id,
                  title: `${format(new Date(match.scheduledDate), 'h:mm a')} - ${match.homeTeamId.teamName} vs ${match.awayTeamId.teamName}`,
                  start: new Date(match.scheduledDate),
                  end: new Date(match.endDate),
                  round: match.round,
                  matchType: match.matchType,
                  roundType: match.roundType,
                  status: match.status,
                  homeTeam: {
                    id: match.homeTeamId._id,
                    name: match.homeTeamId.teamName,
                    photo: match.homeTeamId.teamPhoto,
                  },
                  awayTeam: {
                    id: match.awayTeamId._id,
                    name: match.awayTeamId.teamName,
                    photo: match.awayTeamId.teamPhoto,
                  },
                }));
                setScheduledMatches(formattedMatches);
                
                // Call the parent's onMatchUpdated callback if provided
                if (onMatchUpdated) {
                  onMatchUpdated();
                }
              }
            } catch (error) {
              console.error("Error fetching matches:", error);
            }
          };
          fetchScheduledMatches();
        }}
      />

      <MatchDetailsModal
        open={detailsState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsState({ isOpen: false, match: null });
          }
        }}
        matchId={detailsState.match?.id || null}
        matchDate={detailsState.match?.start || null}
        homeTeam={detailsState.match?.homeTeam || null}
        awayTeam={detailsState.match?.awayTeam || null}
        status={detailsState.match?.status || "scheduled"}
        isScored={detailsState.match?.status === "completed"}
      />
    </>
  );
}
