import { Room, BookingSlot } from "@/types/room";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi, Monitor, Volume, Coffee, Building2, Clock, CalendarCheck } from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import { fetchBookedSlots } from "@/lib/store";

interface RoomCardProps {
  room: Room;
  onClick: (room: Room) => void;
}

const featureIcons: { [key: string]: ReactNode } = {
  "Wi-Fi": <Wifi className="h-4 w-4 inline-block mr-1 text-blue-400" />,
  "Projector": <Monitor className="h-4 w-4 inline-block mr-1 text-blue-400" />,
  "Audio System": <Volume className="h-4 w-4 inline-block mr-1 text-blue-400" />,
  "Coffee Machine": <Coffee className="h-4 w-4 inline-block mr-1 text-blue-400" />,
  "Video Conferencing": <Building2 className="h-4 w-4 inline-block mr-1 text-blue-400" />,
  "Whiteboard": <CalendarCheck className="h-4 w-4 inline-block mr-1 text-blue-400" />,
  "Dedicated Phone": <Clock className="h-4 w-4 inline-block mr-1 text-blue-400" />,
};

export const RoomCard = ({ room, onClick }: RoomCardProps) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });
  const [bookedTimeSlots, setBookedTimeSlots] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const generateTimeSlots = (start = 8, end = 18) => {
    const slots: string[] = [];
    for (let hour = start; hour < end; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      try {
        const slots: BookingSlot[] = await fetchBookedSlots(
          room.id,
          selectedDate
        );

        const occupiedSlots = new Set<string>();
        slots.forEach((slot) => {
          let currentInterval = new Date(slot.start.dateTime);
          const endOfSlot = new Date(slot.end.dateTime);

          currentInterval.setSeconds(0, 0);
          if (currentInterval.getMinutes() % 30 !== 0) {
            currentInterval.setMinutes(
              Math.floor(currentInterval.getMinutes() / 30) * 30
            );
          }

          while (currentInterval.getTime() < endOfSlot.getTime()) {
            const hour = currentInterval.getHours().toString().padStart(2, "0");
            const minutes = currentInterval
              .getMinutes()
              .toString()
              .padStart(2, "0");
            occupiedSlots.add(`${hour}:${minutes}`);

            currentInterval.setMinutes(currentInterval.getMinutes() + 30);
          }
        });
        setBookedTimeSlots(occupiedSlots);
      } catch (error) {
        console.error(
          `Failed to fetch booked slots for room ID ${room.id}:`,
          error
        );
        setBookedTimeSlots(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, room.id]);

  const dateInputId = `date-${room.id}`;
  const timeSlotSelectId = `time-slot-${room.id}`;

  return (
    <Card
      className={`
        group relative cursor-pointer overflow-hidden
        transform transition-all duration-500 ease-out
        hover:scale-105 hover:-translate-y-2
        bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90
        border-2 border-gray-700/50
        hover:border-blue-500/80 hover:shadow-2xl hover:shadow-blue-500/25
        rounded-xl backdrop-blur-sm
        ${isHovered ? 'animate-pulse-glow' : ''}
        flex flex-col h-full
      `} // Added flex flex-col h-full here
      onClick={() => onClick(room)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* PlayStation-style corner accents */}
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400 opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400 opacity-60 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="relative overflow-hidden rounded-t-xl p-0">
        {/* Image container with PlayStation-style overlay */}
        <div className="relative h-40 sm:h-52 overflow-hidden">
          <img
            src={room.image}
            alt={room.name}
            className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
          />

          {/* PlayStation-style gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-transparent to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Animated scan lines effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
            <div className="h-full w-full bg-gradient-to-b from-transparent via-blue-400/10 to-transparent animate-scan-lines" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6 relative z-10 flex flex-col flex-grow"> {/* Added flex flex-col flex-grow here */}
        <div className="space-y-3">
          <CardTitle className="text-lg sm:text-xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse group-hover:bg-blue-300"></span>
            {room.name}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-gray-300 group-hover:text-gray-200 flex items-center gap-2 transition-colors duration-300">
          <Users size={18} className="text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            <span>Capacity: {room.capacity} people</span>
          </CardDescription>
        </div>

        <div className="space-y-3">
          <label
            htmlFor={dateInputId}
            className="text-sm font-medium text-gray-300 group-hover:text-blue-300 transition-colors duration-300"
          >
            Select Date:
          </label>
          <input
            id={dateInputId}
            type="date"
            className="
              block w-full p-3 rounded-lg text-sm
              bg-gray-800/80 border-2 border-gray-600/50 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              hover:border-blue-400/70 hover:bg-gray-700/80
              transition-all duration-300 ease-out
              backdrop-blur-sm
            "
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <label
            htmlFor={timeSlotSelectId}
            className="text-sm font-medium text-gray-300 group-hover:text-blue-300 transition-colors duration-300"
          >
            Select Time Slot:
          </label>
          <select
            id={timeSlotSelectId}
            className="
              w-full p-3 rounded-lg text-sm
              bg-gray-800/80 border-2 border-gray-600/50 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              hover:border-blue-400/70 hover:bg-gray-700/80
              transition-all duration-300 ease-out
              backdrop-blur-sm
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            disabled={loading}
          >
            {timeSlots.map((slot) => (
              <option
                key={slot}
                value={slot}
                disabled={bookedTimeSlots.has(slot)}
                className="bg-gray-800 text-white py-2"
              >
                {slot}
                {bookedTimeSlots.has(slot) ? " (Unavailable)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 mt-auto"> {/* Added mt-auto here */}
          {room.features.map((feature, index) => (
            <Badge
              key={index}
              className="
                bg-gradient-to-r from-blue-900/80 to-blue-800/80
                text-blue-200 font-medium px-3 py-2 rounded-full
                flex items-center border border-blue-700/50
                hover:from-blue-800/90 hover:to-blue-700/90 hover:text-blue-100
                transition-all duration-300 ease-out
                transform hover:scale-105
                backdrop-blur-sm
              "
            >
              {featureIcons[feature]}
              {feature}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};