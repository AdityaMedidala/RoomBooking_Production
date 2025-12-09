import { useState, useEffect, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw, Loader2, Mail, Plus, ArrowLeft, Calendar, X, Clock, Users,
  MapPin, History, Search, Square, Triangle, Circle, CheckCircle, XCircle,
  Edit, Trash2, Building, AlertTriangle, FileText, Fingerprint, Gauge, Save, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getAllBookings, createBooking, deleteBookingAdmin, sendRescheduleEmail,
  adminLogin, getAllRooms, createRoom, updateRoom, deleteRoom,
} from "@/lib/admin-api";
import { useNavigate } from "react-router-dom";

const formatUtcToLocal = (utcTimestampString) => {
    if (!utcTimestampString) return '';
    try {
        const date = new Date(utcTimestampString);
        const options = {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: true
        };
        return date.toLocaleString(undefined, options);
    } catch (error) {
        console.error("Error formatting date:", error);
        return utcTimestampString;
    }
};

const formatDateTime = (isoString, options) =>
  isoString ? new Date(isoString).toLocaleString("en-US", { timeZone: "Asia/Kolkata", ...options }) : "N/A";
const formatDate = (dateStr) => formatDateTime(dateStr, { month: "short", day: "numeric", year: "numeric" });
const formatTime = (dateStr) => formatDateTime(dateStr, { hour: "2-digit", minute: "2-digit", hour12: true });

const StatusBadge = ({ status }) => {
  const config = {
    cancelled: { icon: XCircle, text: "Cancelled", className: "bg-red-500/20 text-red-300 border-red-500/30" },
    confirmed: { icon: CheckCircle, text: "Confirmed", className: "bg-green-500/20 text-green-300 border-green-500/30" },
    pending: { icon: Clock, text: "Pending", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  }[status] || { icon: CheckCircle, text: "Confirmed", className: "bg-green-500/20 text-green-300 border-green-500/30" };
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${config.className}`}>
      <Icon className="h-3 w-3" />
      <span>{config.text}</span>
    </div>
  );
};

const DetailItem = ({ icon: Icon, children, className = "" }) => (
  <div className={`flex items-center gap-2 text-slate-300 ${className}`}>
    <Icon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
    <span className="font-medium text-sm">{children}</span>
  </div>
);

const LabeledInput = ({ label, id, children, required }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-green-300 font-semibold text-sm">
      {label} {required && <span className="text-red-400">*</span>}
    </Label>
    {children}
  </div>
);

const LoadingButton = ({ isLoading, children, ...props }) => (
  <Button {...props} disabled={isLoading || props.disabled}>
    {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : children}
  </Button>
);

const HistoryPanel = ({ bookings, isOpen, onOpenChange }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const sortedBookings = useMemo(
    () =>
      bookings
        .filter(b =>
          Object.values({ subject: b.subject, email: b.organizer_email, room: b.room_name })
            .some(val => val?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [bookings, searchTerm]
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 bg-slate-950/80 backdrop-blur-xl border-l border-slate-700 text-white shadow-2xl">
        <SheetHeader className="p-5 pb-3 border-b border-slate-800">
          <SheetTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="h-5 w-5 text-blue-400" /> Booking Archive
          </SheetTitle>
          <SheetDescription className="text-slate-400 font-medium text-xs">Browse all bookings.</SheetDescription>
        </SheetHeader>
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by subject, email, or room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 w-full bg-black/50 border border-slate-700 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-5 space-y-3 custom-scrollbar">
          {sortedBookings.length > 0 ? (
            sortedBookings.map((b) => (
              <div key={b.id || b.event_id || b.booking_id} className="bg-black/30 border border-slate-800 rounded-lg p-3 hover:border-blue-700 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h3 className={`font-semibold text-base ${b.status === 'cancelled' ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{b.subject}</h3>
                  <StatusBadge status={b.status || 'confirmed'} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <DetailItem icon={MapPin}>{b.room_name}</DetailItem>
                  <DetailItem icon={Users}>{b.organizer_email}</DetailItem>
                  <DetailItem icon={Clock} className="md:col-span-2">
                    {formatDate(b.start_datetime)} &bull; {formatTime(b.start_datetime)} - {formatTime(b.end_datetime)}
                  </DetailItem>
                </div>
                <div className="border-t border-slate-800 pt-2 mt-3 text-xs text-slate-500 font-mono flex flex-col gap-1">
                  <div className="flex items-center gap-1.5"><Fingerprint className="h-3 w-3" /><span>ID: {b.id || b.event_id || b.booking_id}</span></div>
                  <div className="flex items-center gap-1.5"><FileText className="h-3 w-3" /><span>Created: {formatUtcToLocal(b.created_at)}</span></div>
                  {b.status === 'cancelled' && (
                    <div className="flex items-center gap-1.5 text-red-500/90"><XCircle className="h-3 w-3" /><span>Cancelled: {formatUtcToLocal(b.cancelled_at || b.updated_at)}</span></div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <Alert variant="default" className="bg-slate-900 border-slate-700">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
              <AlertDescription className="text-sm">{searchTerm ? 'No bookings match your search.' : 'No historical bookings found.'}</AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// --- Room Management ---
const RoomManagement = ({ rooms, onBack, onSave, onDelete, isLoading }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNewLocation, setIsNewLocation] = useState(false);

  const uniqueLocations = useMemo(() => {
    return [...new Set(rooms.map(r => r.location).filter(Boolean))];
  }, [rooms]);

  const handleSelectRoom = (room) => {
    setCurrentRoom({ ...room, features: Array.isArray(room.features) ? room.features.join(", ") : room.features || "" });
    setImageFile(null);
    setIsNewLocation(false);
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setCurrentRoom({ id: null, name: "", capacity: "", features: "", image: null, location: "" });
    setImageFile(null);
    setIsNewLocation(false);
    setIsEditing(true);
  };

  const handleSubmit = async (e, action, id, ...args) => {
    e.preventDefault();
    const setLoading = action === onSave ? setIsSaving : setIsDeleting;
    setLoading(true);
    try {
      await action(id, ...args);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    const formData = new FormData();
    formData.append('name', currentRoom.name);
    formData.append('capacity', currentRoom.capacity);
    formData.append('features', currentRoom.features);
    formData.append('location', currentRoom.location); 

    if (imageFile) {
        formData.append('image', imageFile);
    }

    handleSubmit(e, onSave, currentRoom.id, formData);
  };
  
  const roomsByLocation = useMemo(() => {
    return rooms.reduce((acc, room) => {
      const location = room.location || "Uncategorized";
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(room);
      return acc;
    }, {});
  }, [rooms]);

  if (isEditing) {
    return (
      <div className="space-y-6 p-2">
        <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" className="text-green-400"><ArrowLeft className="h-4 w-4 mr-2" />Back to List</Button>
        <form onSubmit={handleFormSubmit} className="space-y-5">
            <LabeledInput label="Location" required>
               {!isNewLocation ? (
                 <select 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={uniqueLocations.includes(currentRoom.location) ? currentRoom.location : "new"}
                    onChange={(e) => {
                        if (e.target.value === "new") {
                            setIsNewLocation(true);
                            setCurrentRoom({ ...currentRoom, location: "" });
                        } else {
                            setCurrentRoom({ ...currentRoom, location: e.target.value });
                        }
                    }}
                 >
                    <option value="" disabled>Select Location</option>
                    {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    <option value="new" className="text-blue-300 font-bold">+ Create New Location</option>
                 </select>
               ) : (
                 <div className="flex gap-2">
                   <Input 
                      value={currentRoom.location} 
                      onChange={(e) => setCurrentRoom({ ...currentRoom, location: e.target.value })} 
                      required 
                      placeholder="e.g., Main Office, Building B" 
                      autoFocus
                   />
                   <Button variant="ghost" size="icon" onClick={() => setIsNewLocation(false)} title="Cancel">
                      <X className="h-4 w-4" />
                   </Button>
                 </div>
               )}
            </LabeledInput>
            <LabeledInput label="Room Name" required><Input value={currentRoom.name} onChange={(e) => setCurrentRoom({ ...currentRoom, name: e.target.value })} required /></LabeledInput>
            <LabeledInput label="Capacity" required><Input type="number" value={currentRoom.capacity} onChange={(e) => setCurrentRoom({ ...currentRoom, capacity: e.target.value })} required min="1" /></LabeledInput>
            <LabeledInput label="Features (comma-separated)"><Input value={currentRoom.features} onChange={(e) => setCurrentRoom({ ...currentRoom, features: e.target.value })} placeholder="e.g., Whiteboard, Projector" /></LabeledInput>
            <LabeledInput label="Room Image">
              <Input type="file" onChange={(e) => setImageFile(e.target.files[0])} />
              {(imageFile || currentRoom.image) && (
                <img src={imageFile ? URL.createObjectURL(imageFile) : currentRoom.image} alt="Room Preview" className="mt-3 h-24 w-auto object-cover rounded-lg" />
              )}
            </LabeledInput>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center pt-3 gap-4">
            <LoadingButton type="submit" isLoading={isSaving} className="bg-gradient-to-r from-green-600 to-emerald-700 w-full sm:w-auto"><Save className="h-5 w-5 mr-2" />{currentRoom.id ? "Update" : "Create"} Room</LoadingButton>
            {currentRoom.id && (
              <LoadingButton type="button" variant="destructive" isLoading={isDeleting} onClick={(e) => handleSubmit(e, onDelete, currentRoom.id)} className="w-full sm:w-auto"><Trash2 className="h-4 w-4 mr-2" />Delete</LoadingButton>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between pb-2">
        <Button onClick={onBack} variant="ghost" className="text-blue-400"><ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard</Button>
        <Button onClick={handleCreateNew} size="sm" className="bg-gradient-to-r from-green-600 to-emerald-700"><Plus className="h-4 w-4 mr-2" />ADD NEW ROOM</Button>
      </div>
      <div className="space-y-6 custom-scrollbar max-h-[70vh] overflow-y-auto pr-2">
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></div>
         : Object.keys(roomsByLocation).length > 0 ? Object.entries(roomsByLocation).map(([location, locationRooms]) => (
            <div key={location}>
              <h3 className="text-lg font-bold text-purple-300 border-b-2 border-purple-800/50 pb-2 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5"/> {location}
              </h3>
              <div className="space-y-3">
                {locationRooms.map(room => (
                    <div key={room.id} className="bg-gradient-to-r from-slate-900/60 to-purple-900/20 border border-purple-700/30 rounded-xl p-4 flex justify-between items-center">
                    <div>
                        <p className="font-bold text-purple-200 text-lg">{room.name}</p>
                        <p className="text-sm text-purple-300 mt-1">Capacity: {room.capacity}</p>
                        {room.features && <p className="text-xs text-white italic mt-1">{Array.isArray(room.features) ? room.features.join(", ") : room.features}</p>}
                    </div>
                    <Button onClick={() => handleSelectRoom(room)} size="icon" variant="ghost" className="text-green-400"><Edit className="h-5 w-5" /></Button>
                    </div>
                ))}
              </div>
            </div>
          ))
         : <Alert variant="default" className="bg-blue-900/20 border-blue-500/30 text-blue-300"><AlertTriangle className="h-5 w-5" /><AlertDescription>No rooms configured.</AlertDescription></Alert>}
      </div>
    </div>
  );
};


// --- Main Admin Panel Component ---
const AdminPanel = () => {
  const [data, setData] = useState({ bookings: [], rooms: [] });
  const [loading, setLoading] = useState({ all: true, booking: false, email: false, delete: false, login: false, rooms: false });
  const [error, setError] = useState(null);
  const [sideboxView, setSideboxView] = useState("list");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const initialNewBooking = { room_id: "", room_name: "", subject: "", organizer_email: "", start_datetime: "", end_datetime: "", meeting_type: "in-person" };
  const [newBooking, setNewBooking] = useState(initialNewBooking);
  const [emailForm, setEmailForm] = useState({ subject: "", message: "" });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(!!localStorage.getItem("admin_token"));
  const [adminLoginData, setAdminLoginData] = useState({ email: "admin@admin.com", password: "" });

  const playstationShapes = useMemo(() => [
    { icon: X, color: "text-blue-500", size: "w-8 h-8", class: "top-1/4 left-1/6 animate-float-1", delay: "0s" },
    { icon: Circle, color: "text-red-500", size: "w-10 h-10", class: "bottom-1/3 right-1/5 animate-float-2", delay: "0.5s" },
    { icon: Triangle, color: "text-green-500", size: "w-6 h-6", class: "top-2/3 left-1/4 animate-float-3", delay: "1s" },
    { icon: Square, color: "text-pink-500", size: "w-7 h-7", class: "top-1/2 right-1/3 animate-float-4", delay: "1.5s" },
  ], []);

 const handleApiCall = useCallback(async (apiAction, loadingKey, successTitle) => {
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setError(null);
    try {
      const result = await apiAction();
      toast({ title: successTitle, variant: "success", className: "bg-green-800 text-white" });
      return result;
    } catch (err) {
      toast({ title: "Operation Failed", description: err.message, variant: "destructive", className: "bg-red-800 text-white" });
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, [toast]);
  
  const fetchAllData = useCallback(async () => {
    setLoading(prev => ({ ...prev, all: true }));
    try {
      const [bookingsData, roomsData] = await Promise.all([getAllBookings(), getAllRooms()]);
      setData({
        bookings: bookingsData?.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)) || [],
        rooms: roomsData || [],
      });
    } catch (err) {
      setError(err.message || "Failed to load data.");
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, all: false }));
    }
  }, [toast]);

  useEffect(() => { if (isAdminAuthenticated) fetchAllData(); }, [isAdminAuthenticated, fetchAllData]);

  const calendarEvents = useMemo(() => {
    return data.bookings
      .filter(b => b.status !== "cancelled")
      .map(b => {
        const room = data.rooms.find(r => String(r.id) === String(b.room_id));
        const location = room ? room.location : "Location not found";
        
        const primaryId = b.id || b.event_id || b.booking_id;

        return {
          id: String(primaryId), 
          title: b.subject,
          start: b.start_datetime,
          end: b.end_datetime,
          extendedProps: { ...b, location, realId: primaryId }, 
          className: "fc-event-style",
        };
      });
  }, [data.bookings, data.rooms]);

  const upcomingBookings = useMemo(() => data.bookings.filter(b => b.status !== "cancelled" && new Date(b.start_datetime) > new Date()), [data.bookings]);

  const handleEventClick = (clickInfo) => {
    const eventId = clickInfo.event.id; 
    const bookingData = clickInfo.event.extendedProps;
    
    const completeBooking = { ...bookingData, id: eventId };

    setSelectedBooking(completeBooking);

    setEmailForm({
      subject: `Regarding your booking: ${completeBooking.subject}`,
      message: `Dear ${completeBooking.organizer_email.split("@")[0]},\n\nWe need to discuss your booking for "${completeBooking.subject}" in room ${completeBooking.room_name} (${completeBooking.location}) scheduled for ${formatDateTime(completeBooking.start_datetime)}.\n\nBest regards,\nAdmin Team`,
    });
    setSideboxView("email");
  };

  const handleCreateBooking = async () => {
    const bookingPayload = { 
        ...newBooking, 
        start_datetime: new Date(newBooking.start_datetime).toISOString(),
        end_datetime: new Date(newBooking.end_datetime).toISOString(),
        total_participants: 1 
    };

    const apiAction = () => createBooking(bookingPayload);
    await handleApiCall(apiAction, "booking", "Booking Created");
    
    const emailData = {
        organizerEmail: newBooking.organizer_email,
        subject: `Booking Confirmed: ${newBooking.subject}`,
        message: `Your booking for "${newBooking.subject}" in ${newBooking.room_name} is confirmed.\n\nTime: ${formatDateTime(bookingPayload.start_datetime)} - ${formatTime(bookingPayload.end_datetime)}`
    };
    sendRescheduleEmail(emailData).catch(e => console.error("Auto email failed", e));
    
    setNewBooking(initialNewBooking);
    setTimeout(() => {
        fetchAllData();
        setSideboxView("list");
    }, 500);
  };
  
  const handleDeleteBooking = async (id) => {
    if (!id || id === 'undefined') {
        toast({ title: "System Error", description: "Cannot delete: Booking ID is missing.", variant: "destructive" });
        return;
    }

    const bookingToDelete = data.bookings.find(b => (b.id || b.event_id || b.booking_id) === id);

    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const apiAction = () => deleteBookingAdmin(id);
    await handleApiCall(apiAction, "delete", "Booking Cancelled");

    if (bookingToDelete) {
        const emailData = {
            bookingId: id,
            organizerEmail: bookingToDelete.organizer_email,
            subject: `Booking Cancelled: ${bookingToDelete.subject}`,
            message: `Your booking "${bookingToDelete.subject}" scheduled for ${formatDateTime(bookingToDelete.start_datetime)} has been cancelled by the admin.`
        };
        sendRescheduleEmail(emailData).catch(e => console.error("Auto cancel email failed", e));
    }

    fetchAllData();
    setSideboxView("list");
    setSelectedBooking(null);
  };
  
  const handleSendEmail = () => {
    if (!selectedBooking?.id) {
        toast({ title: "Error", description: "No booking selected", variant: "destructive" });
        return;
    }
    const emailData = { bookingId: selectedBooking.id, organizerEmail: selectedBooking.organizer_email, ...emailForm };
    const apiAction = () => sendRescheduleEmail(emailData);
    handleApiCall(apiAction, "email", "Email Sent");
  };

  const handleRoomSave = (roomId, formData) => {
    const apiAction = roomId ? () => updateRoom(roomId, formData) : () => createRoom(formData);
    const loadingKey = "rooms";
    const successMessage = roomId ? "Room Updated" : "Room Created";

    handleApiCall(apiAction, loadingKey, successMessage).then(fetchAllData);
};
const handleRoomDelete = (roomId) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    const apiAction = () => deleteRoom(roomId);
    handleApiCall(apiAction, "rooms", "Room Deleted").then(fetchAllData);
};
  
const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    const apiAction = () => adminLogin(adminLoginData);
    try {
      const result = await handleApiCall(apiAction, "login", "Login Successful");
      if (result.success) {
        localStorage.setItem("admin_token", result.token);
        setIsAdminAuthenticated(true);
      } else {
        toast({ title: "Login Failed", description: result.message || "Invalid credentials.", variant: "destructive" });
      }
    } catch (err) {}
  };
  
  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAdminAuthenticated(false);
    navigate("/");
  };
  
  const renderFloatingShapes = () => playstationShapes.map((s, i) => {
    const Icon = s.icon;
    return <div key={i} className={`absolute ${s.class} ${s.size} ${s.color} opacity-10`} style={{ animationDelay: s.delay }}><Icon /></div>;
  });

  const renderEventContent = (eventInfo) => {
    const { room_name, location } = eventInfo.event.extendedProps;
    return (
      <div className="p-1.5 text-xs text-white overflow-hidden h-full flex flex-col">
        <p className="font-bold truncate">{eventInfo.event.title}</p>
        <div className="flex-grow" /> 
        <div className="space-y-1 mt-1">
            <div className="flex items-center gap-1.5 opacity-90">
                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate font-medium">{room_name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-90">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate font-medium">{location || 'N/A'}</span>
            </div>
        </div>
      </div>
    );
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0">{renderFloatingShapes()}</div>
        <style>{`@keyframes float-1{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}} @keyframes float-2{0%,100%{transform:translateX(0)}50%{transform:translateX(18px)}} .animate-float-1{animation:float-1 5s ease-in-out infinite} .animate-float-2{animation:float-2 6s ease-in-out infinite}`}</style>
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-3xl border-2 border-blue-700/40 z-10 p-2">
          <CardHeader className="text-center pb-8 pt-6">
            <div className="mx-auto mb-6 p-5 bg-gradient-to-br from-blue-700 to-purple-800 rounded-full w-fit"><Calendar className="h-12 w-12" /></div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">ADMIN PORTAL</CardTitle>
            <CardDescription className="text-blue-300 font-medium text-lg mt-2">Secure system access</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLoginSubmit} className="space-y-6">
              <Input id="email" type="email" value={adminLoginData.email} onChange={(e) => setAdminLoginData({ ...adminLoginData, email: e.target.value })} required placeholder="admin@example.com" />
              <Input id="password" type="password" value={adminLoginData.password} onChange={(e) => setAdminLoginData({ ...adminLoginData, password: e.target.value })} required placeholder="••••••••" />
              <LoadingButton type="submit" isLoading={loading.login} className="w-full h-12 sm:h-14 text-lg sm:text-xl">AUTHENTICATE</LoadingButton>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center text-white font-sans" style={{ backgroundImage: "url('/blue-wave-playstation.jpg')" }}>
      <div className="relative z-10 bg-black/75 backdrop-blur-md min-h-screen">
        <style>{`
          :root { --fc-border-color: rgba(59, 130, 246, 0.4); --fc-daygrid-day-bg-color: transparent; }
          .fc { color: #e2e8f0; } .fc .fc-toolbar-title { color: #fff; font-size: 2rem; font-weight: 800; }
          .fc .fc-button { background: linear-gradient(135deg, #1e3a8a, #3b82f6); border: 1px solid #60a5fa; border-radius: 8px; }
          .fc .fc-button:hover { background: linear-gradient(135deg, #254ac9, #4c91ff); }
          .fc-event-style { background: linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(168, 85, 247, 0.5)) !important; border: 2px solid rgba(59, 130, 246, 0.9) !important; color: #e0f2fe !important; display: block; overflow: hidden;}
          .fc-day-today { background: rgba(59, 130, 246, 0.15) !important; }
          .custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); border-radius: 10px; }

          /* NEW: CSS for custom event rendering */
          .fc-event-main { padding: 0 !important; }
          .fc-event-style .fc-event-main { height: 100%; }

          .fc-daygrid-body, .fc-timegrid-body {
              border-top: 1px solid var(--fc-border-color);
          }
          .fc-daygrid-day, .fc-timegrid-cols .fc-day {
              border-bottom: 1px solid var(--fc-border-color);
              border-right: 1px solid var(--fc-border-color);
          }
          .fc-daygrid-day:last-child, .fc-timegrid-cols .fc-day:last-child {
              border-right: none;
          }
          .fc-col-header-cell {
              background-color: rgba(0, 0, 0, 0.4);
              border-bottom: 1px solid var(--fc-border-color);
          }
          .fc-col-header-cell-cushion, .fc-daygrid-day-number {
              color: #a0aec0;
              font-weight: 600;
              padding: 6px 4px;
          }
          .fc-daygrid-day-number {
              font-size: 0.85rem;
              opacity: 0.9;
          }
          .fc-event {
              margin-bottom: 2px;
              border-radius: 4px;
              font-size: 0.8em;
              line-height: 1.2;
              white-space: normal;
          }
          .fc-timegrid-slot {
              height: 2.8em;
              border-bottom: 1px dashed rgba(59, 130, 246, 0.2);
          }
          .fc-timegrid-slot-label {
              font-size: 0.8em;
              color: #94a3b8;
          }

          @media (max-width: 767px) {
              .fc .fc-toolbar.fc-header-toolbar {
                  flex-direction: column;
                  align-items: center;
                  gap: 10px;
                  padding-bottom: 10px;
              }
              .fc .fc-toolbar-title {
                  font-size: 1.5rem;
                  text-align: center;
                  width: 100%;
                  margin-bottom: 5px;
              }
              .fc .fc-button-group {
                  display: flex;
                  flex-wrap: wrap;
                  justify-content: center;
                  width: 100%;
              }
              .fc .fc-button {
                  padding: 8px 10px;
                  font-size: 0.8rem;
                  margin: 2px;
              }
              .fc-daygrid-day-number {
                  font-size: 0.7rem;
                  padding: 2px;
              }
              .fc-col-header-cell-cushion {
                  font-size: 0.75rem;
                  padding: 2px;
              }
              .fc-event {
                  font-size: 0.65em;
                  margin-bottom: 1px;
              }
              .fc-timegrid-slot {
                  height: 1.8em;
              }
              .fc-timegrid-slot-label {
                  font-size: 0.65em;
              }
              .fc-daygrid-day, .fc-timegrid-cols .fc-day {
                padding: 1px;
              }
          }

          @media (min-width: 768px) and (max-width: 1023px) {
            .fc .fc-toolbar-title {
              font-size: 1.8rem;
            }
            .fc .fc-button {
              font-size: 0.9rem;
            }
            .fc-daygrid-day-number, .fc-col-header-cell-cushion {
              font-size: 0.8rem;
            }
          }
        `}</style>
        <HistoryPanel bookings={data.bookings} isOpen={isHistoryOpen} onOpenChange={setIsHistoryOpen} />

        <header className="bg-black/80 backdrop-blur-sm border-b-2 border-blue-700/40 sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-400" />ADMIN DASHBOARD
            </h1>
            <div className="flex items-center gap-4">
              <Button onClick={fetchAllData} variant="ghost" size="icon" disabled={loading.all} title="Refresh Data">{loading.all ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}</Button>
              <Button onClick={() => setIsHistoryOpen(true)} variant="ghost" size="icon" title="View History"><History className="h-6 w-6" /></Button>
              <Button onClick={handleAdminLogout} variant="ghost" className="text-red-400">
                <X className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">LOGOUT</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 xl:col-span-9">
              <Card className="bg-black/60 backdrop-blur-3xl border-2 border-blue-700/40 p-1 sm:p-2">
                <CardContent className="p-6">
                  {loading.all ? <div className="flex justify-center items-center h-[75vh]"><Loader2 className="h-16 w-16 animate-spin" /></div>
                   : error ? <Alert variant="destructive" className="h-[75vh]"><AlertTriangle className="h-12 w-12" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                   :<FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    views={{
                        timeGridWeek: { type: 'timeGridWeek', duration: { days: 7 }, buttonText: 'Week' },
                        timeGridDay: { type: 'timeGridDay', duration: { days: 1 }, buttonText: 'Day' },
                        dayGridMonth: { type: 'dayGridMonth', buttonText: 'Month' }
                    }}
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    eventContent={renderEventContent}
                    height="75vh"
                    slotMinTime="08:00:00"
                    dayHeaderContent={(arg) => {
                        return window.innerWidth < 768 ? arg.text.substring(0, 3) : arg.text;
                    }}
                    />}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 xl:col-span-3">
              <Card className="bg-black/60 backdrop-blur-3xl border-2 border-purple-700/40 h-full flex flex-col p-2 sm:p-0">
                {sideboxView === "list" && (
                  <>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-slate-100"><Gauge/>DASHBOARD</CardTitle></CardHeader>
                    <CardContent className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 p-2 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={() => setSideboxView("create")} size="lg" className="flex-1"><Plus />NEW BOOKING</Button>
                        <Button onClick={() => setSideboxView("rooms")} size="lg" variant="secondary" className="flex-1"><Building />MANAGE ROOMS</Button>
                      </div>
                       <h3 className="font-bold text-blue-200 text-xl border-b border-blue-800/50 pb-2">Upcoming ({upcomingBookings.length})</h3>
                       {loading.all ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        : upcomingBookings.map(b => (
                          <div key={b.id || b.event_id || b.booking_id} onClick={() => handleEventClick({ event: { id: (b.id || b.event_id || b.booking_id), extendedProps: b }})} className="text-white bg-gradient-to-br from-gray-950/85 to-indigo-950/75 border border-blue-800/60 rounded-xl p-4 cursor-pointer">
                             <h3 className="font-bold text-blue-200">{b.subject}</h3>
                             <p><MapPin className="inline h-4 w-4" /> {b.room_name}</p>
                             <p><Clock className="inline h-4 w-4" /> {formatDateTime(b.start_datetime)} - {formatTime(b.end_datetime)}</p>
                          </div>
                       ))}
                    </CardContent>
                  </>
                )}
                {sideboxView === "rooms" && <CardContent className="flex-1"><RoomManagement rooms={data.rooms} onBack={() => setSideboxView("list")} onSave={handleRoomSave} onDelete={handleRoomDelete} isLoading={loading.rooms} /></CardContent>}
                {sideboxView === "create" && (
                  <>
                  <CardHeader><Button onClick={() => setSideboxView("list")} variant="ghost" size="icon" className="text-white"><ArrowLeft /></Button><CardTitle className="text-slate-100">NEW BOOKING</CardTitle></CardHeader>
                    <CardContent className="space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                      <select
                        value={newBooking.room_id}
                        onChange={(e) => {
                          const selectedRoomId = e.target.value;
                          const selectedRoom = data.rooms.find(r => r.id.toString() === selectedRoomId);
                          setNewBooking({
                            ...newBooking,
                            room_id: selectedRoomId,
                            room_name: selectedRoom ? selectedRoom.name : "",
                          });
                        }}
                        className="w-full p-2 bg-white border border-slate-700 rounded-lg text-sm text-slate-900"
                        required
                      >
                        <option value="" className="text-gray-500">Choose a Room</option>
                        {Object.entries(
                          data.rooms.reduce((acc, room) => {
                            const location = room.location || "Uncategorized";
                            acc[location] = [...(acc[location] || []), room];
                            return acc;
                          }, {})
                        ).map(([location, locationRooms]) => (
                          <optgroup key={location} label={location} className="text-slate-900 bg-slate-200 font-bold">
                            {locationRooms.map(r => (
                              <option key={r.id} value={r.id} className="text-slate-900 bg-white font-normal">
                                {r.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <Input className="text-slate-900 placeholder:text-slate-400" value={newBooking.subject} onChange={(e) => setNewBooking({...newBooking, subject: e.target.value})} placeholder="Subject" required />
                      <Input className="text-slate-900 placeholder:text-slate-400" type="email" value={newBooking.organizer_email} onChange={(e) => setNewBooking({...newBooking, organizer_email: e.target.value})} placeholder="Organizer Email" required />
                      <Input className="text-slate-900 placeholder:text-slate-400" type="datetime-local" value={newBooking.start_datetime} onChange={(e) => setNewBooking({...newBooking, start_datetime: e.target.value})} placeholder="Start Time" required />
                      <Input className="text-slate-900 placeholder:text-slate-400" type="datetime-local" value={newBooking.end_datetime} onChange={(e) => setNewBooking({...newBooking, end_datetime: e.target.value})}placeholder="End Time" required />
                      <LoadingButton onClick={handleCreateBooking} isLoading={loading.booking} className="w-full h-14">CREATE BOOKING</LoadingButton>
                    </CardContent>
                  </>
                )}
                {sideboxView === "email" && selectedBooking && (
                  <>
                  <CardHeader><Button onClick={() => setSideboxView("list")} className="text-white"><ArrowLeft/></Button><CardTitle className="text-slate-100">COMMUNICATE</CardTitle></CardHeader>
                     <CardContent className="space-y-5 flex-1">
                      <div className="p-4 rounded-xl border text-white">
                           <h3>{selectedBooking.subject}</h3>
                           <p><MapPin/> {selectedBooking.room_name} ({selectedBooking.location})</p>
                           <p><Clock/> {formatDateTime(selectedBooking.start_datetime)}</p>
                           <p><Mail/> {selectedBooking.organizer_email}</p>
                        </div>
                        <Input className="text-gray-900 placeholder:text-slate-400" value={emailForm.subject} onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})} required />
                        <Textarea className="text-gray-900 placeholder:text-slate-400" value={emailForm.message} onChange={(e) => setEmailForm({...emailForm, message: e.target.value})} rows={7} required />
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                          <LoadingButton onClick={handleSendEmail} isLoading={loading.email} className="w-full sm:w-auto"><Mail/>SEND</LoadingButton>
                          <LoadingButton variant="destructive" onClick={() => handleDeleteBooking(selectedBooking.id)} isLoading={loading.delete} className="w-full sm:w-auto"><Trash2/>CANCEL BOOKING</LoadingButton>
                        </div>
                     </CardContent>
                  </>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;