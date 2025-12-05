// src/components/ManageBooking.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  X,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Edit,
  Calendar,
  Clock,
  MapPin,
  Square,
  Triangle,
  Circle,
} from "lucide-react";

import { fetchBookingsByEmail, cancelBooking } from "@/lib/store";
import { BookingSlot, Room } from "@/types/room";

// Props for ManageBooking component
interface ManageBookingProps {
  onClose: () => void;
  onReschedule: (booking: BookingSlot, organizerEmail: string) => void;
  allRooms: Room[];
}

const LoadingSpinner = ({
  text,
  size = "default",
}: {
  text?: string;
  size?: "sm" | "default";
}) => (
  <div className="flex flex-col items-center justify-center gap-4 py-8">
    <Loader2
      className={`animate-spin text-blue-400 ${
        size === "sm" ? "h-6 w-6" : "h-10 w-10"
      }`}
    />
    {text && <span className="text-lg font-medium text-blue-200">{text}</span>}
  </div>
);

export const ManageBooking = ({
  onClose,
  onReschedule,
}: ManageBookingProps) => {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [step, setStep] = useState<"input" | "loading" | "results" | "error">("input");
  const [error, setError] = useState("");
  const [cancellationStatus, setCancellationStatus] = useState<{
    [key: string]: "loading" | "success" | "error";
  }>({});
  const [cancellationError, setCancellationError] = useState("");

  // State for reschedule confirmation modal
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  const [rescheduleCandidate, setRescheduleCandidate] = useState<BookingSlot | null>(null);
  const [rescheduleProcessing, setRescheduleProcessing] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  const handleFindBookings = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      setStep("error");
      return;
    }
    setStep("loading");
    setError("");
    
    try {
      const response = await fetchBookingsByEmail(email);

      // Handle Response Structure (Array vs Object)
      const rawData = Array.isArray(response) ? response : (response?.data || []);

      if (!Array.isArray(rawData)) {
        console.error("Invalid API Response:", response);
        throw new Error("Received invalid data from server.");
      }

      // --- Data Adapter (Flat DB -> Nested Frontend) ---
      // Uses 'as any' casting to bypass strict BookingSlot type checks for 'location'
      const adaptedBookings: BookingSlot[] = rawData.map((b: any) => ({
        id: b.id || b.event_id || b.booking_id,
        room_id: b.room_id || "0", // FIXED: Added room_id (defaulting to "0" if missing)
        subject: b.subject,
        start: b.start || { dateTime: b.start_datetime || b.startDate },
        end: b.end || { dateTime: b.end_datetime || b.endDate },
        // We include location even if type ignores it, accessed via casting later
        location: b.location || { displayName: b.room_name || 'Unknown Location' },
        organizer: b.organizer || { emailAddress: { address: b.organizer_email || email, name: 'Organizer' } },
        isAllDay: b.is_all_day || false
      } as unknown as BookingSlot));

      const futureBookings = adaptedBookings.filter((b) => {
        if (!b.end?.dateTime) return false;
        return new Date(b.end.dateTime) > new Date();
      });

      setBookings(futureBookings);
      
      if (futureBookings.length === 0) {
        setError("No upcoming bookings were found for this email address.");
        setStep("error");
      } else {
        setStep("results");
      }
    } catch (err: any) {
      console.error("Find Bookings Error:", err);
      setError(err.message || "An error occurred while fetching your bookings.");
      setStep("error");
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancellationError("");
    setCancellationStatus((prev) => ({ ...prev, [bookingId]: "loading" }));
    try {
      await cancelBooking(bookingId, email); 
      setCancellationStatus((prev) => ({ ...prev, [bookingId]: "success" }));
      setTimeout(() => {
        const remainingBookings = bookings.filter((b) => b.id !== bookingId);
        setBookings(remainingBookings);
        if (remainingBookings.length === 0) {
          setError("All your bookings have been managed. You can close this window now.");
          setStep("error");
        }
      }, 1500);
    } catch (err: any) {
      setCancellationStatus((prev) => ({ ...prev, [bookingId]: "error" }));
      setCancellationError(err.message || "Failed to cancel the booking.");
    }
  };

  const confirmRescheduleAndRedirect = async () => {
    if (!rescheduleCandidate?.id) {
        setRescheduleError("Invalid booking data for reschedule.");
        return;
    }

    setRescheduleProcessing(true);
    setRescheduleError("");

    try {
        const organizerEmail = rescheduleCandidate.organizer?.emailAddress?.address || email;
        await cancelBooking(rescheduleCandidate.id, organizerEmail);
        
        onReschedule(rescheduleCandidate, organizerEmail);
        onClose(); 

        setBookings((prev) => prev.filter(b => b.id !== rescheduleCandidate!.id));

    } catch (err: any) {
        setRescheduleError(err.message || "Failed to cancel original booking.");
    } finally {
        setRescheduleProcessing(false);
        setShowRescheduleConfirm(false); 
        setRescheduleCandidate(null); 
    }
  };

  // --- UI Elements ---
  const playstationShapes = [
    { icon: <X className="w-full h-full" />, color: 'text-blue-400', size: 'w-8 h-8', class: 'top-1/4 left-1/6 animate-float-1', delay: '0s' },
    { icon: <Circle className="w-full h-full" />, color: 'text-red-400', size: 'w-10 h-10', class: 'bottom-1/3 right-1/5 animate-float-2', delay: '0.5s' },
    { icon: <Triangle className="w-full h-full" />, color: 'text-green-400', size: 'w-6 h-6', class: 'top-2/3 left-1/4 animate-float-3', delay: '1s' },
    { icon: <Square className="w-full h-full" />, color: 'text-pink-400', size: 'w-7 h-7', class: 'top-1/2 right-1/3 animate-float-4', delay: '1.5s'}
  ];

  const renderBookingCard = (booking: BookingSlot) => {
    const bookingId = booking.id!;
    const status = cancellationStatus[bookingId];
    const isProcessing = status === "loading";
    const isSuccess = status === "success";

    const startStr = booking.start?.dateTime ? new Date(booking.start.dateTime) : new Date();
    const endStr = booking.end?.dateTime ? new Date(booking.end.dateTime) : new Date();
    
    // FIXED: Use (booking as any) to access 'location' if not in type
    const locationName = (booking as any).location?.displayName || 'Unknown Location';

    return (
      <div
        key={bookingId}
        className="bg-black/40 backdrop-blur-md border border-blue-500/30 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-lg transition-all duration-300"
      >
        {isSuccess && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 rounded-lg animate-fade-in z-10">
            <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
            <p className="font-semibold text-lg text-green-300">Booking Cancelled</p>
          </div>
        )}
        <h4 className="font-bold text-lg text-white">{booking.subject || "Untitled Meeting"}</h4>
        <div className="text-sm text-blue-200 space-y-2 border-t border-blue-500/20 pt-3">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="font-medium">{locationName}</span>
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="font-medium">
              {startStr.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="font-medium">
              {startStr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endStr.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
        </div>
        <div className="flex gap-3 pt-3 border-t border-blue-500/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCancelBooking(bookingId)}
            disabled={isProcessing}
            className="flex-1 h-10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 rounded-lg transition-all font-semibold"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-2" />Cancel</>}
          </Button>
          <Button
            size="sm"
            onClick={() => { setRescheduleCandidate(booking); setShowRescheduleConfirm(true); }}
            disabled={isProcessing}
            className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-300"
          >
            <Edit className="h-4 w-4 mr-2" />Reschedule
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <style>
        {`
          .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
          @keyframes fade-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .gaming-card { background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(59, 130, 246, 0.3); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
          .gaming-gradient-border { background: linear-gradient(45deg, #8b5cf6, #3b82f6, #ec4899); border-radius: 20px; padding: 2px; }
          .gaming-gradient-border > div { background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95)); }
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
          <div key={index} className={`absolute ${shape.class} ${shape.size} ${shape.color} opacity-10`} style={{ animationDelay: shape.delay, filter: 'drop-shadow(0 0 8px currentColor)' }}>
            {shape.icon}
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="gaming-gradient-border rounded-2xl">
          <Card className="w-full gaming-card shadow-2xl shadow-purple-500/20 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-purple-500/30 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Manage Bookings
                  </CardTitle>
                  <CardDescription className="text-purple-200">
                    Cancel or reschedule an existing booking.
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white hover:bg-red-500/80 rounded-full transition-all" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 min-h-[250px] flex flex-col justify-center">
              {step === "input" && (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleFindBookings(); }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="email-manage" className="font-semibold text-lg text-white mb-3 block">
                      Enter your organizer email
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="email-manage"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        className="flex-1 h-12 bg-black/60 border-2 border-purple-500/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 rounded-xl"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg transition-all duration-300">
                    <Search className="h-5 w-5 mr-2" />
                    Find My Bookings
                  </Button>
                </form>
              )}
              {step === "loading" && (
                <LoadingSpinner text="Searching for your bookings..." />
              )}
              {step === "error" && (
                <div className="text-center space-y-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
                  <p className="text-lg font-semibold text-white">An Error Occurred</p>
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                  <Button
                    variant="outline"
                    onClick={() => { setStep("input"); setError(""); }}
                    className="h-10 text-white hover:bg-slate-700/50 border-slate-600"
                  >
                    Try Again
                  </Button>
                </div>
              )}
              {step === "results" && (
                <div className="space-y-4">
                  {cancellationError && (
                    <Alert variant="destructive" className="border-red-500/50 bg-red-900/20 text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{cancellationError}</AlertDescription>
                    </Alert>
                  )}
                  {rescheduleError && ( 
                    <Alert variant="destructive" className="border-red-500/50 bg-red-900/20 text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{rescheduleError}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-sm text-center text-gray-300">
                    Found {bookings.length} upcoming booking(s) for{" "}
                    <strong className="text-blue-300">{email}</strong>.
                  </p>
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                    {bookings.map(renderBookingCard)}
                  </div>
                   <Button
                    variant="link"
                    onClick={() => { setStep("input"); setBookings([]); setEmail(""); }}
                    className="w-full text-blue-400 hover:text-blue-300"
                  >
                    Search with a different email
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Confirmation Modal */}
      {showRescheduleConfirm && rescheduleCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md gaming-card shadow-2xl shadow-purple-500/20 rounded-2xl animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between border-b border-yellow-500/30 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    Confirm Reschedule
                  </CardTitle>
                  <CardDescription className="text-yellow-200">
                    This will cancel your original booking.
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white hover:bg-red-500/80 rounded-full transition-all" onClick={() => setShowRescheduleConfirm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 text-center max-h-[60vh] overflow-y-auto">
              <p className="text-white text-lg">
                Are you sure you want to cancel your booking for:
              </p>
              <p className="font-semibold text-blue-300 text-xl">
                "{rescheduleCandidate.subject}"
              </p>
              
              {/* FIXED: Safe access to nested properties using type assertion */}
              <p className="text-gray-300">
                at <span className="font-medium text-purple-300">{(rescheduleCandidate as any).location?.displayName}</span>
              </p>
              <p className="text-gray-300">
                on <span className="font-medium text-purple-300">{new Date(rescheduleCandidate.start.dateTime).toLocaleDateString()}</span>
              </p>
              <p className="text-red-300 text-sm font-semibold">
                This original booking will be permanently cancelled. You will then be redirected to re-book.
              </p>
              {rescheduleError && (
                <Alert variant="destructive" className="border-red-500/50 bg-red-900/20 text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{rescheduleError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 p-4 sm:p-6 pt-0">
              <Button
                variant="ghost"
                onClick={() => setShowRescheduleConfirm(false)}
                disabled={rescheduleProcessing}
                className="h-10 text-gray-400 hover:bg-gray-700/50 border border-gray-600 rounded-lg transition-all font-semibold"
              >
                Go Back
              </Button>
              <Button
                onClick={confirmRescheduleAndRedirect}
                disabled={rescheduleProcessing}
                className="w-full sm:w-auto h-10 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-lg shadow-lg transition-all duration-300"
              >
                {rescheduleProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Confirm & Cancel Original
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};