import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Room } from "@/types/room";
import { 
  Loader2, CheckCircle, X, MapPin, Calendar as CalendarIcon, 
  Clock, User, Mail, ShieldCheck, Square, Triangle, Circle 
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { sendOTP, verifyOTP, addBooking, updateBooking, fetchBookedSlots } from "@/lib/store";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  room: Room;
  onClose: () => void;
  bookingToReschedule?: any; 
}

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30; 
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const BookingForm = ({ room, onClose, bookingToReschedule }: BookingFormProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [verified, setVerified] = useState(!!bookingToReschedule);
  
  const [bookedRanges, setBookedRanges] = useState<{start: number, end: number}[]>([]);
  
  const [form, setForm] = useState({
    subject: bookingToReschedule?.subject || "",
    email: bookingToReschedule?.organizer_email || "",
    date: bookingToReschedule 
      ? new Date(bookingToReschedule.start_datetime).toISOString().split('T')[0] 
      : new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    participants: bookingToReschedule?.total_participants || 1,
    otp: ""
  });

  // --- 1. Load Availability ---
  useEffect(() => {
    const loadAvailability = async () => {
      if (!form.date) return;
      try {
        const bookings = await fetchBookedSlots(room.id, form.date);
        
        const ranges = bookings
          .filter(b => b.id !== bookingToReschedule?.event_id) 
          .map(b => {
             const start = new Date(b.start.dateTime);
             const end = new Date(b.end.dateTime);
             return {
                start: start.getHours() * 60 + start.getMinutes(),
                end: end.getHours() * 60 + end.getMinutes()
             };
          });
        setBookedRanges(ranges);
      } catch (error) {
        console.error("Failed to load slots", error);
      }
    };
    loadAvailability();
  }, [form.date, room.id, bookingToReschedule]);

  // --- 2. Slot Logic ---
  
  const isSlotAvailable = (timeStart: string) => {
     const slotStartMins = timeToMinutes(timeStart);
     const slotEndMins = slotStartMins + 30;
     
     return !bookedRanges.some(range => range.start < slotEndMins && range.end > slotStartMins);
  };

  
  const validEndTimes = useMemo(() => {
    if (!form.startTime) return [];
    
    const startMins = timeToMinutes(form.startTime);
    const valid: string[] = [];
    
    for (let i = 1; i <= 8; i++) {
       const endMins = startMins + (i * 30);
       const chunkStart = endMins - 30; 
       
       const isBlocked = bookedRanges.some(r => r.start < endMins && r.end > chunkStart);
       
       if (isBlocked) break; 
       
       const h = Math.floor(endMins / 60);
       const m = endMins % 60;
       const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
       
       if (timeToMinutes(timeStr) > timeToMinutes("20:00")) break; 
       valid.push(timeStr);
    }
    return valid;
  }, [form.startTime, bookedRanges]);


  // --- 3. Handlers ---

  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    setLoading(true);
    try {
      await action();
      toast({ title: "Success", description: successMsg });
      return true;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
      return false;
    } finally { setLoading(false); }
  };

  const onSendOTP = () => handleAction(() => sendOTP(form.email), "OTP sent to your email.");
  
  const onVerifyOTP = async () => {
    if (await handleAction(() => verifyOTP(form.email, form.otp), "Email verified!")) {
      setVerified(true);
    }
  };

  const handleNextStep = () => {
      if(form.participants > room.capacity) {
          toast({ variant: "destructive", title: "Capacity Exceeded", description: `This room only holds ${room.capacity} people.` });
          return;
      }
      setStep(2);
  };

  const onSubmit = async () => {
    const payload = {
      roomId: room.id,
      roomName: room.name,
      location: room.location,
      subject: form.subject,
      organizerEmail: form.email,
      start: new Date(`${form.date}T${form.startTime}:00`),
      end: new Date(`${form.date}T${form.endTime}:00`),
      totalParticipants: Number(form.participants),
      attendees: []
    };

    let success;
    if (bookingToReschedule) {
       success = await handleAction(() => updateBooking(bookingToReschedule.event_id, payload), "Booking Rescheduled!");
    } else {
       success = await handleAction(() => addBooking(payload), "Booking Confirmed!");
    }

    if (success) {
      onClose();
      window.location.reload();
    }
  };

  // --- 4. Render Assets ---
  const playstationShapes = [
    { icon: <X className="w-full h-full" />, color: 'text-blue-400', size: 'w-8 h-8', class: 'top-1/4 left-1/6 animate-float-1', delay: '0s' },
    { icon: <Circle className="w-full h-full" />, color: 'text-red-400', size: 'w-10 h-10', class: 'bottom-1/3 right-1/5 animate-float-2', delay: '0.5s' },
    { icon: <Triangle className="w-full h-full" />, color: 'text-green-400', size: 'w-6 h-6', class: 'top-2/3 left-1/4 animate-float-3', delay: '1s' },
    { icon: <Square className="w-full h-full" />, color: 'text-pink-400', size: 'w-7 h-7', class: 'top-1/2 right-1/3 animate-float-4', delay: '1.5s' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <style>{`
        /* Gaming Card Styles */
        .gaming-card { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); }
        .gaming-gradient-border { background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899); padding: 2px; border-radius: 16px; }
        
        /* Slot States */
        .diagonal-stripe { 
            background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0, 0, 0, 0.5) 5px, rgba(0, 0, 0, 0.5) 10px); 
        }
        
        /* Animations */
        @keyframes float-1 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float-1 { animation: float-1 4s ease-in-out infinite; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); border-radius: 10px; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {playstationShapes.map((shape, i) => (
          <div key={i} className={`absolute ${shape.class} ${shape.size} ${shape.color} opacity-20`} style={{animationDelay: shape.delay}}>
            {shape.icon}
          </div>
        ))}
      </div>

      <div className="gaming-gradient-border w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 shadow-2xl shadow-blue-500/20">
        <div className="bg-slate-900 rounded-[14px] flex flex-col h-full overflow-hidden">
          
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <div>
               <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-2">
                 {bookingToReschedule ? 'Reschedule Booking' : `Book ${room.name}`}
               </h2>
               <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-blue-400"/> {room.location} • Step {step} of 2
               </p>
            </div>
            <Button variant="ghost" onClick={onClose} className="rounded-full h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                <X className="h-4 w-4"/>
            </Button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {step === 1 ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-slate-300 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-blue-400"/> Date</Label>
                      <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value, startTime: "", endTime: ""})} 
                        className="bg-slate-800 border-slate-700 text-white h-11 focus:border-blue-500 focus:ring-blue-500/20" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-300 flex items-center gap-2"><User className="w-4 h-4 text-purple-400"/> Subject</Label>
                      <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} 
                        className="bg-slate-800 border-slate-700 text-white h-11 focus:border-purple-500 focus:ring-purple-500/20" placeholder="Meeting Title" />
                   </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2"><User className="w-4 h-4 text-green-400"/> Participants</Label>
                    <div className="flex gap-4 items-center">
                        <Input type="number" min="1" max={room.capacity} value={form.participants} 
                            onChange={e => setForm({...form, participants: parseInt(e.target.value)})} 
                            className="bg-slate-800 border-slate-700 text-white h-11 focus:border-green-500 w-32" />
                        <span className="text-sm text-slate-500">Max Capacity: {room.capacity}</span>
                    </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <Label className="text-slate-300 flex items-center gap-2"><Clock className="w-4 h-4 text-pink-400"/> Select Start Time</Label>
                     <div className="flex gap-3 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-800 border border-slate-600 rounded"></div> Free</span>
                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-900 border border-slate-700 rounded diagonal-stripe opacity-50"></div> Booked</span>
                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-600 rounded shadow-lg shadow-blue-500/50"></div> Selected</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                     {TIME_SLOTS.slice(0, -1).map((time) => {
                       const available = isSlotAvailable(time);
                       const selected = form.startTime === time;
                       return (
                         <button
                           key={time}
                           disabled={!available}
                           onClick={() => setForm({...form, startTime: time, endTime: ""})}
                           className={cn(
                             "py-2 px-1 rounded-lg text-sm font-medium border transition-all duration-200 relative overflow-hidden",
                             !available 
                               ? "bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed diagonal-stripe opacity-60" 
                               : selected 
                                 ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105 z-10" 
                                 : "bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:bg-slate-700 hover:text-white"
                           )}
                         >
                           {time}
                         </button>
                       );
                     })}
                  </div>
                </div>

                {form.startTime && (
                   <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                      <Label className="text-slate-300">Select Duration (End Time)</Label>
                      <div className="flex flex-wrap gap-2">
                         {validEndTimes.map(time => (
                            <button
                              key={time}
                              onClick={() => setForm({...form, endTime: time})}
                              className={cn(
                                "py-2 px-4 rounded-lg text-sm font-medium border transition-all duration-200",
                                form.endTime === time 
                                  ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 transform scale-105" 
                                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-white"
                              )}
                            >
                               {time}
                            </button>
                         ))}
                         {validEndTimes.length === 0 && <span className="text-amber-500 text-sm flex items-center gap-2"><X className="w-4 h-4"/> No valid duration available from this start time.</span>}
                      </div>
                   </div>
                )}

                <div className="pt-4 flex justify-end border-t border-slate-800">
                  <Button 
                     className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 h-11 rounded-lg font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                     disabled={!form.startTime || !form.endTime || !form.subject || !form.participants}
                     onClick={handleNextStep}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex gap-5 items-center">
                   <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
                      <CalendarIcon className="h-7 w-7 text-blue-400"/>
                   </div>
                   <div>
                      <h4 className="text-white font-bold text-lg">{form.subject}</h4>
                      <div className="flex items-center gap-3 text-slate-400 text-sm mt-1">
                         <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {form.startTime} - {form.endTime}</span>
                         <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                         <span>{form.date}</span>
                         <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                         <span>{form.participants} People</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-5">
                   <div className="space-y-2">
                     <Label className="text-slate-300 flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400"/> Email Verification</Label>
                     <div className="flex gap-2">
                       <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} 
                         placeholder="colleague@company.com" className="bg-slate-800 border-slate-700 text-white h-11 focus:border-blue-500" disabled={verified}/>
                       {!verified && (
                          <Button onClick={() => handleAction(() => sendOTP(form.email), "OTP Sent")} disabled={loading || !form.email} 
                            className="bg-blue-600 hover:bg-blue-500 h-11 min-w-[100px] font-semibold">
                             {loading ? <Loader2 className="animate-spin"/> : "Send OTP"}
                          </Button>
                       )}
                     </div>
                   </div>

                   {!verified && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-slate-300 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-purple-400"/> Enter Code</Label>
                        <div className="flex gap-2">
                           <Input placeholder="000000" value={form.otp} onChange={e => setForm({...form, otp: e.target.value})} 
                             className="bg-slate-800 border-slate-700 text-white h-11 text-center font-mono text-xl tracking-[0.5em] focus:border-purple-500" maxLength={6}/>
                           <Button variant="secondary" onClick={async () => {
                              if(await handleAction(() => verifyOTP(form.email, form.otp), "Verified!")) setVerified(true);
                           }} disabled={loading || form.otp.length < 6} className="h-11 min-w-[100px] font-semibold hover:bg-slate-700">Verify</Button>
                        </div>
                     </div>
                   )}

                   {verified && (
                     <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-500/30 flex items-center gap-3 text-emerald-400 animate-in zoom-in-95 duration-300">
                        <div className="bg-emerald-500/20 p-2 rounded-full"><CheckCircle size={20} /></div>
                        <span className="font-medium">Identity Verified Successfully</span>
                     </div>
                   )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-slate-800">
                  <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 h-12 hover:bg-slate-800 hover:text-white" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white h-12 shadow-lg shadow-emerald-500/20 font-bold text-lg tracking-wide transition-all hover:scale-[1.02]" 
                    disabled={!verified || loading} onClick={onSubmit}>
                    {loading ? <Loader2 className="animate-spin mr-2"/> : "CONFIRM BOOKING"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};