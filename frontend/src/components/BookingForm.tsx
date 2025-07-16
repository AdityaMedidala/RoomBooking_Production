import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Loader2,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  Mail,
  UserPlus,
  Calendar as CalendarIcon,
  MapPin,
  Sparkles,
  Zap,
  Square,
  Triangle,
  Circle,
} from "lucide-react";

// Import API functions
import {
  sendOTP,
  addBooking,
  fetchBookedSlots,
  verifyOTP,
  updateBooking
} from "@/lib/store";

// Import types
import { Room, BookingSlot } from "@/types/room";

// --- Helper Components ---

const LoadingSpinner = ({
  size = "default",
  text = "",
}: {
  size?: "sm" | "default" | "lg";
  text?: string;
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };
  return (
    <div className="flex items-center justify-center gap-2">
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-blue-400`} />
      {text && <span className="text-sm text-gray-300">{text}</span>}
    </div>
  );
};

const LoadingButton = ({
  isLoading,
  children,
  ...props
}: {
  isLoading: boolean;
  children: React.ReactNode;
  [key: string]: any;
}) => (
  <Button disabled={isLoading} {...props}>
    {isLoading ? <LoadingSpinner size="sm" /> : children}
  </Button>
);

const CurrentDateTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-black/40 backdrop-blur-md border border-blue-500/30 p-4 rounded-xl mb-6 shadow-lg">
      <div className="flex items-center gap-3 text-gray-200">
        <div className="p-2 bg-blue-500/20 rounded-full text-blue-400 border border-blue-400/30">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-lg text-white">Current Date & Time</p>
          <p className="text-gray-300 font-medium">
            {currentTime.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-gray-400 font-mono">{currentTime.toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

// --- Core Logic Helpers ---

// Adjusted to return a Date object representing the LOCAL selected date and time
const getDateTimeLocal = (date: Date, time: string): Date => {
  const [hours, minutes] = time.split(":").map(Number);
  const localDateTime = new Date(date);
  localDateTime.setHours(hours, minutes, 0, 0);
  return localDateTime;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Define new props for BookingForm to handle rescheduling
interface BookingFormProps {
  room: Room;
  onClose: () => void;
  bookingToReschedule?: BookingSlot;
}

export const BookingForm = ({
  room,
  onClose,
  bookingToReschedule
}: BookingFormProps) => {
  // Form state
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(
    bookingToReschedule ? new Date(bookingToReschedule.start.dateTime) : new Date()
  );
  
  // Initialize startTime and endTime from bookingToReschedule using its local time equivalent
  const initialStartTime = useMemo(() => {
    if (bookingToReschedule) {
      const d = new Date(bookingToReschedule.start.dateTime);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    return "";
  }, [bookingToReschedule]);

  const initialEndTime = useMemo(() => {
    if (bookingToReschedule) {
      const d = new Date(bookingToReschedule.end.dateTime);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    return "";
  }, [bookingToReschedule]);

  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);

  const [meetingSubject, setMeetingSubject] = useState(
    bookingToReschedule?.subject || ""
  );
  const [meetingDescription, setMeetingDescription] = useState(
    (bookingToReschedule as any)?.description || "" 
  );
  const [totalParticipants, setTotalParticipants] = useState(
    bookingToReschedule?.totalParticipants?.toString() || ""
  );
  const [internalParticipants, setInternalParticipants] = useState(
    bookingToReschedule?.internalParticipants?.toString() || ""
  );
  const [externalParticipants, setExternalParticipants] = useState(
    bookingToReschedule?.externalParticipants?.toString() || ""
  );
  const [meetingType, setMeetingType] = useState<"offline" | "online" | "hybrid">(
    (bookingToReschedule?.meeting_type as "offline" | "online" | "hybrid") || "offline"
  );
  const [email, setEmail] = useState(
    bookingToReschedule?.organizer?.emailAddress?.address || ""
  );
  const [otp, setOtp] = useState("");
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>(() => {
    if (bookingToReschedule?.attendee_emails) {
      try {
        const parsed = JSON.parse(bookingToReschedule.attendee_emails);
        return Array.isArray(parsed) ? parsed : [""];
      } catch (e) {
        console.error("Failed to parse attendee_emails:", e);
        return [""];
      }
    }
    return [""];
  });

  // Status state
  const [isEmailVerified, setIsEmailVerified] = useState(!!bookingToReschedule);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<BookingSlot[]>([]);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  // Loading and Error state
  const [loading, setLoading] = useState({
    availability: false,
    otp: false,
    verifyOtp: false,
    booking: false,
  });
  const [errors, setErrors] = useState({
    capacity: "",
    participants: "",
    availability: "",
    general: "",
    email: "",
    subject: "",
    otp: "",
  });

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m of [0, 30]) {
        slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);

  const toast = useCallback(({
    title,
    description,
    variant,
  }: {
    title: string;
    description: string;
    variant?: string;
  }) => {
    console.log(`Toast (${variant || "default"}): ${title} - ${description}`);
    alert(`${title}: ${description}`);
  }, []);

  useEffect(() => {
    if (bookingToReschedule) {
      if (bookingToReschedule.organizer?.emailAddress?.address) {
        setEmail(bookingToReschedule.organizer.emailAddress.address);
        setIsEmailVerified(true); 
      }
    }
  }, [bookingToReschedule]);

  // Fetch booked slots for the selected date
  useEffect(() => {
    const fetchAndSetBookedSlots = async () => {
      const currentRoomId = bookingToReschedule?.room_id || room?.id;

      if (!date || !currentRoomId) {
        setBookedSlots([]);
        return;
      }
      setLoading((prev) => ({ ...prev, availability: true }));
      setErrors((prev) => ({ ...prev, availability: "" }));
      try {
        // Send date as YYYY-MM-DD string, to be interpreted as LOCAL day start/end on backend
        // Create the YYYY-MM-DD string from the local date parts to avoid timezone conversion errors.
const year = date.getFullYear();
const month = (date.getMonth() + 1).toString().padStart(2, '0');
const day = date.getDate().toString().padStart(2, '0');
const localDateString = `${year}-${month}-${day}`;
        const fetchedBookings = await fetchBookedSlots(currentRoomId, localDateString);
        
        // Filter out the current bookingToReschedule if it exists,
        // so it doesn't appear as a conflict with itself during rescheduling
        const filteredBookings = fetchedBookings.filter(
            b => b.id !== bookingToReschedule?.id
        );
        setBookedSlots(filteredBookings);
      } catch (error: any) {
        setErrors((prev) => ({ ...prev, availability: error.message || "Failed to load room availability." }));
        setBookedSlots([]);
      } finally {
        setLoading((prev) => ({ ...prev, availability: false }));
      }
    };
    fetchAndSetBookedSlots();
  }, [date, room?.id, bookingToReschedule?.room_id, bookingToReschedule?.id]);

  useEffect(() => {
    if (otpResendTimer > 0) {
      const timerId = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [otpResendTimer]);

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    setStartTime("");
    setEndTime("");
  };

  const validateParticipants = useCallback(() => {
    if (!room?.capacity) return false;
    const totalNum = parseInt(totalParticipants) || 0;
    const internalNum = parseInt(internalParticipants) || 0;
    const externalNum = parseInt(externalParticipants) || 0;
    let hasError = false;

    setErrors((prev) => ({ ...prev, participants: "", capacity: "" }));
    if (totalNum > room.capacity) {
      setErrors((prev) => ({ ...prev, capacity: `Maximum capacity is ${room.capacity}.` }));
      hasError = true;
    }
    if (totalNum < 1) {
      setErrors((prev) => ({ ...prev, participants: "Total participants must be at least 1." }));
      hasError = true;
    }
    if (totalParticipants && (internalParticipants || externalParticipants) && internalNum + externalNum !== totalNum) {
      setErrors((prev) => ({ ...prev, participants: "Internal and external counts must sum to the total." }));
      hasError = true;
    }
    return !hasError;
  }, [room?.capacity, totalParticipants, internalParticipants, externalParticipants]);

  const handleProceedToStep3 = () => {
    if (!meetingSubject.trim()) {
      setErrors((prev) => ({ ...prev, subject: "Subject is required." }));
      return;
    } else {
      setErrors((prev) => ({ ...prev, subject: "" }));
    }

    if (!date || !startTime || !endTime) {
        setErrors((prev) => ({ ...prev, availability: "Please select a date and time range." }));
        return;
    } else {
        setErrors((prev) => ({ ...prev, availability: "" }));
    }

    if (!validateParticipants()) {
      toast({
        title: "Check Participants",
        description: "Please ensure participant numbers are correct and within capacity.",
        variant: "destructive",
      });
      return;
    }
    setStep(3);
  };

  const handleAttendeeChange = (index: number, value: string) => {
    const newEmails = [...attendeeEmails];
    newEmails[index] = value;
    setAttendeeEmails(newEmails);
  };

  const addAttendeeField = () => setAttendeeEmails([...attendeeEmails, ""]);
  const removeAttendeeField = (index: number) => {
    if (attendeeEmails.length > 1) {
      setAttendeeEmails(attendeeEmails.filter((_, i) => i !== index));
    }
  };

  const bookingsForSelectedDate = useMemo(() => {
    if (!date || !Array.isArray(bookedSlots)) return [];
    // Normalize selected date to its start of day (local time) for comparison
    const selectedDateStartOfDayLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

    return bookedSlots.filter((slot) => {
      if (!slot?.start?.dateTime) return false;
      
      const slotStartDate = new Date(slot.start.dateTime);
      // Normalize slot booking start date to its start of day (local time)
      const slotStartDateStartOfDayLocal = new Date(slotStartDate.getFullYear(), slotStartDate.getMonth(), slotStartDate.getDate(), 0, 0, 0, 0);

      // Compare only the date parts (year, month, day)
      return slotStartDateStartOfDayLocal.getTime() === selectedDateStartOfDayLocal.getTime();
    });
  }, [date, bookedSlots]);


  const isSlotUnavailable = useCallback(
    (time: string) => {
      // time: this is the potential start time of a slot (e.g., "09:00", "09:30")
      const currentSlotMinutes = timeToMinutes(time);

      // If no start or end time is selected by the user, we just check if the current slot is taken
      if (!startTime || !endTime) {
          return bookingsForSelectedDate.some((booking) => {
              const bookingStartMinutes = timeToMinutes(new Date(booking.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).slice(0, 5));
              const bookingEndMinutes = timeToMinutes(new Date(booking.end.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).slice(0, 5));
              return currentSlotMinutes >= bookingStartMinutes && currentSlotMinutes < bookingEndMinutes;
          });
      }

      // If user has selected a range, check if this `time` slot (being considered as a potential start for user)
      // would create an overlap with any existing bookings.
      const selectedStartMinutes = timeToMinutes(startTime);
      const selectedEndMinutes = timeToMinutes(endTime);

      return bookingsForSelectedDate.some((booking) => {
          const bookingStartMinutes = timeToMinutes(new Date(booking.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).slice(0, 5));
          const bookingEndMinutes = timeToMinutes(new Date(booking.end.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).slice(0, 5));

          // Check if any part of the *user's currently selected range* (from selectedStartMinutes to selectedEndMinutes)
          // overlaps with any part of *this existing booking* (from bookingStartMinutes to bookingEndMinutes).
          const isOverlap = 
              (selectedStartMinutes < bookingEndMinutes && selectedEndMinutes > bookingStartMinutes);
          
          return isOverlap;
      });
    },
    [bookingsForSelectedDate, startTime, endTime]
  );

  const availableEndTimes = useMemo(() => {
    if (!startTime) return [];
    const startMinutes = timeToMinutes(startTime);
    const potentialEndTimes: string[] = [];

    for (let i = startMinutes + 30; i <= timeToMinutes("23:59"); i += 30) {
        const potentialEndMinutes = i;
        let isConflict = false;

        // Check if the proposed new booking (from startTime to potentialEndMinutes)
        // conflicts with any existing booking.
        for (const booking of bookingsForSelectedDate) {
            const bookingStartMinutes = timeToMinutes(new Date(booking.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).slice(0, 5));
            const bookingEndMinutes = timeToMinutes(new Date(booking.end.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).slice(0, 5));
            
            // Check for overlap: [startMinutes, potentialEndMinutes) vs [bookingStartMinutes, bookingEndMinutes)
            if (startMinutes < bookingEndMinutes && potentialEndMinutes > bookingStartMinutes) {
                isConflict = true;
                break;
            }
        }

        if (!isConflict) {
            const hours = Math.floor(potentialEndMinutes / 60);
            const minutes = potentialEndMinutes % 60;
            potentialEndTimes.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        }
    }
    return potentialEndTimes;
}, [startTime, bookingsForSelectedDate]);


  const getCurrentDayUsage = useMemo(
    () => ({
      bookings: bookingsForSelectedDate.length,
      totalPeople: bookingsForSelectedDate.reduce((sum, booking) => sum + (booking.totalParticipants || 0), 0),
    }),
    [bookingsForSelectedDate]
  );

  const handleSendOTP = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
      return;
    }
    setErrors((prev) => ({ ...prev, email: "", otp: "" }));
    setLoading((prev) => ({ ...prev, otp: true }));
    try {
      await sendOTP(email);
      setShowOTPInput(true);
      setOtpResendTimer(30);
      toast({ title: "OTP Sent", description: `A verification code has been sent to ${email}` });
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, email: error.message || "Failed to send OTP." }));
    } finally {
      setLoading((prev) => ({ ...prev, otp: false }));
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: "OTP must be 6 digits." }));
      return;
    }
    setErrors((prev) => ({ ...prev, otp: "" }));
    setLoading((prev) => ({ ...prev, verifyOtp: true }));
    try {
      const result = await verifyOTP(email, otp);
      if ((result as any).verified) {
        setIsEmailVerified(true);
        toast({ title: "Success", description: "Email verified successfully!" });
      } else {
        throw new Error("Invalid OTP provided.");
      }
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, otp: error.message || "Invalid OTP." }));
    } finally {
      setLoading((prev) => ({ ...prev, verifyOtp: false }));
    }
  };

  const handleConfirmBooking = async () => {
    if (!isEmailVerified && !bookingToReschedule) {
      toast({ title: "Verification Required", description: "Please verify your email before booking.", variant: "destructive" });
      return;
    }
    setLoading((prev) => ({ ...prev, booking: true }));
    try {
      // Get the selected date and time in the user's local timezone
      const startDateTimeLocal = getDateTimeLocal(date!, startTime);
      const endDateTimeLocal = getDateTimeLocal(date!, endTime);

      // Convert them to UTC ISO strings for sending to the backend
      const commonBookingData = {
        subject: meetingSubject,
        description: meetingDescription,
        start_datetime: startDateTimeLocal.toISOString(), // Send as UTC ISO
        end_datetime: endDateTimeLocal.toISOString(),     // Send as UTC ISO
        organizer_email: email,
        total_participants: parseInt(totalParticipants),
        internal_participants: parseInt(internalParticipants) || 0,
        external_participants: parseInt(externalParticipants) || 0,
        meeting_type: meetingType,
        attendee_emails: JSON.stringify(attendeeEmails.filter((e) => e.trim())),
        room_id: bookingToReschedule?.room_id || room.id,
        room_name: bookingToReschedule?.location?.displayName || room.name,
      };

      if (bookingToReschedule) {
        const updatePayload = {
            ...commonBookingData,
            eventId: bookingToReschedule.id 
        };
        console.log("🐛 Reschedule Payload:", updatePayload); 
        await updateBooking(updatePayload);
        toast({ title: "Booking Rescheduled!", description: `Your booking for ${room.name} has been updated.` });
      } else {
        await addBooking(commonBookingData);
        toast({ title: "Booking Confirmed!", description: `Room ${room.name} is booked successfully.` });
      }
      onClose();
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred.";
      setErrors((prev) => ({ ...prev, general: errorMessage }));
      toast({ title: "Operation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading((prev) => ({ ...prev, booking: false }));
    }
  };

  const playstationShapes = [
    { icon: <X className="w-full h-full" />, color: 'text-blue-400', size: 'w-8 h-8', class: 'top-1/4 left-1/6 animate-float-1', delay: '0s' },
    { icon: <Circle className="w-full h-full" />, color: 'text-red-400', size: 'w-10 h-10', class: 'bottom-1/3 right-1/5 animate-float-2', delay: '0.5s' },
    { icon: <Triangle className="w-full h-full" />, color: 'text-green-400', size: 'w-6 h-6', class: 'top-2/3 left-1/4 animate-float-3', delay: '1s' },
    { icon: <Square className="w-full h-full" />, color: 'text-pink-400', size: 'w-7 h-7', class: 'top-1/2 right-1/3 animate-float-4', delay: '1.5s' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <style>
        {`
          /* Animations and base styles */
          .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
          @keyframes fade-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
          @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

          /* Themed styles */
          .gaming-card { background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(59, 130, 246, 0.3); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
          .gaming-gradient-border { background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899); border-radius: 20px; padding: 2px; }
          .gaming-gradient-border > div { background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95)); }

          /* Floating shapes animations */
          @keyframes float-1 { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(180deg); } }
          @keyframes float-2 { 0%, 100% { transform: translateX(0px) rotate(0deg); } 50% { transform: translateX(8px) rotate(90deg); } }
          @keyframes float-3 { 0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); } 50% { transform: translateY(-8px) translateX(5px) rotate(270deg); } }
          @keyframes float-4 { 0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); } 50% { transform: translateY(-12px) scale(1.05) rotate(45deg); } }
          .animate-float-1 { animation: float-1 4s ease-in-out infinite; }
          .animate-float-2 { animation: float-2 5s ease-in-out infinite; }
          .animate-float-3 { animation: float-3 4.5s ease-in-out infinite; }
          .animate-float-4 { animation: float-4 3.5s ease-in-out infinite; }
        `}
      </style>

      <div className="absolute inset-0 pointer-events-none">
        {playstationShapes.map((shape, index) => (
          <div
            key={index}
            className={`absolute ${shape.class} ${shape.size} ${shape.color} opacity-10`}
            style={{ animationDelay: shape.delay, filter: 'drop-shadow(0 0 8px currentColor)' }}
          >
            {shape.icon}
          </div>
        ))}
      </div>

      {/* Main container for sizing and flex behavior */}
      <div className="relative w-full max-w-2xl max-h-[95vh] animate-fade-in flex flex-col">
        <div className="gaming-gradient-border rounded-2xl flex-1 flex flex-col min-h-0">
          {/* Card now also a flex container to manage its direct children */}
          <Card className="w-full h-full gaming-card shadow-2xl shadow-blue-500/20 flex flex-col overflow-hidden rounded-2xl flex-1">
            {/* Header: fixed height, does not grow or shrink */}
            <CardHeader className="flex-shrink-0 z-10 border-b border-blue-500/30 pb-6">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-9 w-9 text-gray-400 hover:text-white hover:bg-red-500/80 rounded-full transition-all duration-300 border border-red-400/30"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-start justify-between gap-4 pr-14">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-lg flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight text-left mb-2">
                      {bookingToReschedule ? `Reschedule ${bookingToReschedule.location?.displayName}` : `Book ${room.name}`}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Users className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <span>Capacity:</span>
                      <span className="font-semibold text-blue-400">{room.capacity}</span>
                      <span>people</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                  <div className="flex items-center justify-between">
                    {[1, 2, 3].map((stepNumber) => (
                      <div key={stepNumber} className="flex items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2 ${step >= stepNumber ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-blue-400 shadow-lg shadow-blue-500/50' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                          {step > stepNumber ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                        </div>
                        {stepNumber < 3 && <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${step > stepNumber ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-gray-600'}`} />}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span className="flex-1 text-center">Date & Time</span>
                    <span className="flex-1 text-center">Meeting Details</span>
                    <span className="flex-1 text-center">Confirmation</span>
                  </div>
              </div>
            </CardHeader>
            
            {/* Content Area: grows and shrinks, and becomes scrollable */}
            <div className="flex-1 overflow-y-auto">
                <CardContent className="p-6 space-y-6">
                <CurrentDateTime />
                {errors.general && (
                    <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm">
                    <AlertTriangle className="h-4 w-4" /><AlertDescription className="text-red-300">{errors.general}</AlertDescription>
                    </Alert>
                )}
                {step === 1 && (
                    <div className="space-y-6 animate-slide-up">
                    {/* Step 1 Content */}
                    <div className="bg-black/40 backdrop-blur-md border border-blue-500/30 p-6 rounded-xl shadow-lg">
                        <Label className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><CalendarIcon className="h-5 w-5 text-blue-400" />Select Date</Label>
                        <Calendar mode="single" selected={date} onSelect={handleDateChange} className="rounded-lg border border-blue-500/30 shadow-lg bg-black/60 backdrop-blur-md text-white" disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}/>
                        {loading.availability && (<div className="flex items-center gap-2 text-sm text-blue-400 mt-4 bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg backdrop-blur-sm"><Loader2 className="h-4 w-4 animate-spin" /><span className="font-medium">Checking availability...</span></div>)}
                        {date && !loading.availability && (<div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg backdrop-blur-sm"><div className="flex items-center gap-2 text-sm mb-2"><Info className="h-4 w-4 text-blue-400" /><span className="font-semibold text-blue-300">Selected Date Usage:</span></div><div className="text-sm text-blue-300 font-medium">{getCurrentDayUsage.bookings} bookings scheduled {getCurrentDayUsage.totalPeople > 0 && `• ${getCurrentDayUsage.totalPeople} total participants`}</div></div>)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/40 backdrop-blur-md border border-orange-500/30 p-3 sm:p-4 rounded-xl shadow-lg">
                        <Label className="text-sm font-semibold text-white flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-orange-400" />Start Time</Label>
                        <select value={startTime} onChange={(e) => { setStartTime(e.target.value); setEndTime(""); }} className="w-full p-3 border border-orange-500/30 rounded-lg bg-black/60 backdrop-blur-md text-white font-medium focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all" disabled={loading.availability}>
                            <option value="" className="bg-gray-800">Select time</option>
                            {timeSlots.map((slot) => { const unavailable = isSlotUnavailable(slot); return (<option key={slot} value={slot} disabled={unavailable} className="bg-gray-800">{slot}{unavailable ? " (Booked)" : ""}</option>); })}
                        </select>
                        </div>
                        <div className="bg-black/40 backdrop-blur-md border border-purple-500/30 p-4 rounded-xl shadow-lg">
                        <Label className="text-sm font-semibold text-white flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-purple-400" />End Time</Label>
                        <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-3 border border-purple-500/30 rounded-lg bg-black/60 backdrop-blur-md text-white font-medium focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all" disabled={!startTime || loading.availability}>
                            <option value="" className="bg-gray-800">Select time</option>
                            {availableEndTimes.map((slot) => (<option key={slot} value={slot} className="bg-gray-800">{slot}</option>))}
                        </select>
                        </div>
                    </div>
                    {errors.availability && <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-red-300">{errors.availability}</AlertDescription></Alert>}
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-6 animate-slide-up">
                    {/* Step 2 Content */}
                    <div className="bg-black/40 backdrop-blur-md border border-green-500/30 p-6 rounded-xl shadow-lg">
                        <Label className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Info className="h-5 w-5 text-green-400" />Meeting Information</Label>
                        <div className="space-y-4">
                        <div><Label className="text-sm font-medium text-gray-300 mb-2 block">Subject *</Label><Input value={meetingSubject} onChange={(e) => setMeetingSubject(e.target.value)} placeholder="Enter meeting subject" className="bg-black/60 border-green-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-400/50 focus:border-green-400" />{errors.subject && (<p className="text-red-400 text-sm mt-1">{errors.subject}</p>)}</div>
                        <div><Label className="text-sm font-medium text-gray-300 mb-2 block">Description</Label><textarea value={meetingDescription} onChange={(e) => setMeetingDescription(e.target.value)} placeholder="Enter meeting description (optional)" rows={3} className="w-full bg-black/60 border border-green-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-400/50 focus:border-green-400 rounded-lg p-3 resize-none" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label className="text-sm font-medium text-gray-300 mb-2 block">Meeting Type</Label><select value={meetingType} onChange={(e) => setMeetingType(e.target.value as "offline" | "online")} className="w-full p-3 border border-green-500/30 rounded-lg bg-black/60 text-white focus:ring-2 focus:ring-green-400/50 focus:border-green-400"><option value="offline" className="bg-gray-800">Offline</option><option value="online" className="bg-gray-800">Online</option></select></div>
                            <div><Label className="text-sm font-medium text-gray-300 mb-2 block">Total Participants *</Label><Input type="number" value={totalParticipants} onChange={(e) => setTotalParticipants(e.target.value)} placeholder="Total number" min="1" max={room.capacity} className="bg-black/60 border-green-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-400/50 focus:border-green-400" /></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label className="text-sm font-medium text-gray-300 mb-2 block">Internal Participants</Label><Input type="number" value={internalParticipants} onChange={(e) => setInternalParticipants(e.target.value)} placeholder="Internal count" min="0" className="bg-black/60 border-blue-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400" /></div>
                            <div><Label className="text-sm font-medium text-gray-300 mb-2 block">External Participants</Label><Input type="number" value={externalParticipants} onChange={(e) => setExternalParticipants(e.target.value)} placeholder="External count" min="0" className="bg-black/60 border-purple-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400" /></div>
                        </div>
                        {(errors.capacity || errors.participants) && (<Alert variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm"><AlertTriangle className="h-4 w-4" /><AlertDescription className="text-red-300">{errors.capacity || errors.participants}</AlertDescription></Alert>)}
                        </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-yellow-500/30 p-6 rounded-xl shadow-lg">
                        <Label className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><UserPlus className="h-5 w-5 text-yellow-400" />Attendee Emails</Label>
                        {attendeeEmails.map((email, index) => (<div key={index} className="flex gap-2 mb-3"><Input type="email" value={email} onChange={(e) => handleAttendeeChange(index, e.target.value)} placeholder={`Attendee ${index + 1} email`} className="flex-1 bg-black/60 border-yellow-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400" />{attendeeEmails.length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => removeAttendeeField(index)} className="text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/30"><X className="h-4 w-4" /></Button>)}</div>))}
                        <Button type="button" variant="ghost" onClick={addAttendeeField} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 border border-yellow-500/30 w-full"><UserPlus className="h-4 w-4 mr-2" />Add Another Attendee</Button>
                    </div>
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-6 animate-slide-up">
                    {/* Step 3 Content */}
                    <div className="bg-black/40 backdrop-blur-md border border-pink-500/30 p-6 rounded-xl shadow-lg">
                        <Label className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><Mail className="h-5 w-5 text-pink-400" />Email Verification</Label>
                        <div className="space-y-4">
                        <div><Label className="text-sm font-medium text-gray-300 mb-2 block">Organizer Email *</Label><div className="flex gap-2"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" disabled={isEmailVerified} className="flex-1 bg-black/60 border-pink-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400" />{!isEmailVerified && (<LoadingButton isLoading={loading.otp} onClick={handleSendOTP} disabled={!email || otpResendTimer > 0} className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300">{otpResendTimer > 0 ? `${otpResendTimer}s` : "Send OTP"}</LoadingButton>)}</div>{errors.email && (<p className="text-red-400 text-sm mt-1">{errors.email}</p>)}</div>
                        {showOTPInput && !isEmailVerified && (<div><Label className="text-sm font-medium text-gray-300 mb-2 block">Enter OTP</Label><div className="flex gap-2"><Input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} className="flex-1 bg-black/60 border-pink-500/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400" /><LoadingButton isLoading={loading.verifyOtp} onClick={handleVerifyOTP} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300">Verify</LoadingButton></div>{errors.otp && (<p className="text-red-400 text-sm mt-1">{errors.otp}</p>)}</div>)}
                        {isEmailVerified && (<div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/30 p-3 rounded-lg backdrop-blur-sm"><CheckCircle className="h-5 w-5" /><span className="font-medium">Email verified successfully!</span></div>)}
                        </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-blue-500/30 p-6 rounded-xl shadow-lg">
                        <Label className="text-lg font-semibold text-white flex items-center gap-2 mb-4"><CheckCircle className="h-5 w-5 text-blue-400" />Booking Summary</Label>
                        <div className="space-y-4 text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                            <div><span className="text-gray-400">Room:</span><span className="text-white font-medium float-right">{room.name}</span></div>
                            <div><span className="text-gray-400">Total Participants:</span><span className="text-white font-medium float-right">{totalParticipants}</span></div>
                            <div><span className="text-gray-400">Date:</span><span className="text-white font-medium float-right">{date?.toLocaleDateString()}</span></div>
                            <div><span className="text-gray-400">Internal:</span><span className="text-white font-medium float-right">{internalParticipants || 0}</span></div>
                            <div><span className="text-gray-400">Time:</span><span className="text-white font-medium float-right">{startTime} - {endTime}</span></div>
                            <div><span className="text-gray-400">External:</span><span className="text-white font-medium float-right">{externalParticipants || 0}</span></div>
                            <div><span className="text-gray-400">Subject:</span><span className="text-white font-medium float-right truncate">{meetingSubject}</span></div>
                            <div><span className="text-gray-400">Meeting Type:</span><span className="text-white font-medium capitalize float-right">{meetingType}</span></div>
                        </div>
                        {meetingDescription && (<div className="pt-2 border-t border-gray-600/50"><span className="text-gray-400">Description:</span><p className="text-white/90 text-sm mt-1">{meetingDescription}</p></div>)}
                        {attendeeEmails.filter(e => e.trim()).length > 0 && (<div className="pt-2 border-t border-gray-600/50"><span className="text-gray-400">Attendees:</span><div className="mt-2 flex flex-wrap gap-2">{attendeeEmails.filter(e => e.trim()).map((email, index) => (<Badge key={index} variant="secondary" className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">{email}</Badge>))}</div></div>)}
                        </div>
                    </div>
                    </div>
                )}
                </CardContent>
            </div>
            
            {/* Footer: Stays fixed at the bottom, does not grow or shrink */}
             <CardFooter className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center p-4 sm:p-6 border-t border-blue-500/30 gap-3">
              <Button onClick={() => setStep((prev) => prev - 1)} variant="ghost" className={`text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-600 ${step === 1 ? 'invisible' : 'visible'}`}>← Back</Button>
              {step === 1 && (<Button onClick={() => setStep(2)} disabled={!date || !startTime || !endTime || loading.availability} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-8 py-2 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">Next: Meeting Details<Sparkles className="ml-2 h-4 w-4" /></Button>)}
              {step === 2 && (<Button onClick={handleProceedToStep3} className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold px-8 py-2 rounded-lg shadow-lg transition-all duration-300">Next: Confirmation<Zap className="ml-2 h-4 w-4" /></Button>)}
              {step === 3 && (<LoadingButton isLoading={loading.booking} onClick={handleConfirmBooking} disabled={!isEmailVerified && !bookingToReschedule} className="bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white font-semibold px-8 py-2 rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50">{loading.booking ? "Booking..." : "Confirm Booking"}<CheckCircle className="ml-2 h-4 w-4" /></LoadingButton>)}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
