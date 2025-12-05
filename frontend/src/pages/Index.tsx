// pages/Index.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { RoomCard } from '@/components/RoomCard';
import { BookingForm } from '@/components/BookingForm';
import { ManageBooking } from '@/components/ManageBooking';
import { getRooms, cancelBooking, fetchBookedSlots } from '@/lib/store';
import { Room, BookingSlot } from '@/types/room';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Loader2, Calendar as CalendarIcon, KeyRound, Search, Clock, FilterX, X, Circle, Triangle, Square, Zap, Building } from 'lucide-react';

const Index = () => {
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showManageBooking, setShowManageBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filters, setFilters] = useState({
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      roomName: '',
      location: 'All Locations',
  });

  const navigate = useNavigate();

  const handleAdminLogin = () => {
    const password = prompt("Enter Admin Password:");
    if (password === '1234') {
        localStorage.setItem('admin_token', 'simulated_admin_token');
        navigate('/admin');
    } else if (password) {
        alert('Incorrect password.');
    }
  };

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRooms();
      const sortedData = Array.isArray(data) ? data.sort((a, b) => a.name.localeCompare(b.name)) : [];
      setAllRooms(sortedData);
      setFilteredRooms(sortedData);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setAllRooms([]);
      setFilteredRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    const handleFocus = () => {
      if (localStorage.getItem('rooms_updated') === 'true') {
        console.log('Room data has changed, refetching...');
        fetchInitialData();
        localStorage.removeItem('rooms_updated');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchInitialData]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = async () => {
      setIsFiltering(true);

      const checkDateTime = (filters.date && filters.startTime) ? new Date(`${filters.date}T${filters.startTime}:00`) : null;

      try {
        let roomsToFilter = allRooms;

        if (filters.location && filters.location !== 'All Locations') {
            roomsToFilter = roomsToFilter.filter(room => room.location === filters.location);
        }

        if (filters.roomName) {
            roomsToFilter = roomsToFilter.filter(room =>
                room.name && room.name.toLowerCase().includes(filters.roomName.toLowerCase())
            );
        }

        if (checkDateTime) {
            const availabilityPromises = roomsToFilter.map(async (room) => {
                const bookedSlots = await fetchBookedSlots(room.id.toString(), filters.date);
                const isBooked = bookedSlots.some(slot => {
                    const start = new Date(slot.start.dateTime);
                    const end = new Date(slot.end.dateTime);
                    return checkDateTime >= start && checkDateTime < end;
                });
                return isBooked ? null : room;
            });
            roomsToFilter = (await Promise.all(availabilityPromises)).filter(Boolean) as Room[];
        }

        setFilteredRooms(roomsToFilter);
      } catch (error) {
        console.error("Error applying filters:", error);
        alert("Could not apply filters. Please try again.");
      } finally {
        setIsFiltering(false);
      }
  };

  const handleClearFilter = () => {
      setFilteredRooms(allRooms);
      setFilters({
          date: new Date().toISOString().split('T')[0],
          startTime: '',
          roomName: '',
          location: 'All Locations',
      });
  };

  const handleBookRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setShowForm(true);
  };

  const handleManageBookingClick = () => {
    setShowManageBooking(true);
  };

  const handleCloseForms = () => {
    setShowForm(false);
    setShowManageBooking(false);
    setSelectedRoom(null);
  };

  const handleReschedule = async (bookingToReschedule: BookingSlot, organizerEmail: string) => {
    const roomForReschedule = allRooms.find(r => r.id.toString() === bookingToReschedule.room_id?.toString());
    if (!roomForReschedule) {
        alert("Error: The original room could not be found.");
        return;
    }

    try {
        if(bookingToReschedule.id) {
           await cancelBooking(bookingToReschedule.id, organizerEmail);
           alert(`Your original booking for "${bookingToReschedule.subject}" is cancelled. Please select a new time slot.`);
        }
    } catch(err) {
        alert("Could not automatically cancel your original booking. Please do so manually.");
    }

    setShowManageBooking(false);
    setSelectedRoom(roomForReschedule);
    setShowForm(true);
  };

  const uniqueRoomNames = useMemo(() => {
    const roomsForDropdown = filters.location === 'All Locations'
        ? allRooms
        : allRooms.filter(r => r.location === filters.location);
    return Array.from(new Set(roomsForDropdown.map(room => room.name))).sort();
  }, [allRooms, filters.location]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set(allRooms.map(room => room.location).filter(Boolean));
    return ['All Locations', ...Array.from(locations).sort()];
  }, [allRooms]);

  const elegantShapes = [
    { icon: <X className="w-full h-full" />, color: 'text-blue-300/40', size: 'w-8 h-8', class: 'top-1/5 left-1/12 animate-drift-1', delay: '0s' },
    { icon: <Circle className="w-full h-full" />, color: 'text-red-300/35', size: 'w-12 h-12', class: 'bottom-1/4 right-1/12 animate-drift-2', delay: '2s' },
    { icon: <Triangle className="w-full h-full" />, color: 'text-green-300/40', size: 'w-6 h-6', class: 'top-1/2 left-1/8 animate-drift-3', delay: '4s' },
    { icon: <Square className="w-full h-full" />, color: 'text-pink-300/35', size: 'w-10 h-10', class: 'top-1/3 right-1/6 animate-drift-4', delay: '6s'},
    { icon: <Zap className="w-full h-full" />, color: 'text-yellow-300/30', size: 'w-7 h-7', class: 'top-1/4 left-1/3 animate-drift-2', delay: '1s' },
    { icon: <KeyRound className="w-full h-full" />, color: 'text-orange-300/25', size: 'w-5 h-5', class: 'bottom-1/5 left-1/6 animate-drift-3', delay: '3s' },
    { icon: <Clock className="w-full h-full" />, color: 'text-lime-300/35', size: 'w-8 h-8', class: 'top-1/8 right-1/5 animate-drift-4', delay: '5s' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden font-sans">
      <style>
        {`
          @keyframes drift-1 { 0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg) scale(1); } 33% { transform: translateY(-20px) translateX(10px) rotate(60deg) scale(1.1); } 66% { transform: translateY(-10px) translateX(-5px) rotate(120deg) scale(0.9); } }
          @keyframes drift-2 { 0%, 100% { transform: translateX(0px) translateY(0px) rotate(0deg) scale(1); } 25% { transform: translateX(15px) translateY(-10px) rotate(90deg) scale(1.05); } 75% { transform: translateX(-8px) translateY(12px) rotate(180deg) scale(0.95); } }
          @keyframes drift-3 { 0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg) scale(1); } 40% { transform: translateY(-15px) translateX(-8px) rotate(270deg) scale(1.15); } 80% { transform: translateY(8px) translateX(12px) rotate(180deg) scale(0.85); } }
          @keyframes drift-4 { 0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); } 50% { transform: translateY(-25px) scale(1.2) rotate(45deg); } }
          .animate-drift-1 { animation: drift-1 12s ease-in-out infinite; }
          .animate-drift-2 { animation: drift-2 15s ease-in-out infinite; }
          .animate-drift-3 { animation: drift-3 18s ease-in-out infinite; }
          .animate-drift-4 { animation: drift-4 14s ease-in-out infinite; }

          @keyframes ps-glow { 0%, 100% { filter: blur(0.5px) drop-shadow(0 0 8px currentColor); } 50% { filter: blur(1px) drop-shadow(0 0 15px currentColor); } }
          .animate-ps-glow { animation: ps-glow 4s ease-in-out infinite; }

          @keyframes title-glow { 0%, 100% { text-shadow: 0 0 10px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.3); } 50% { text-shadow: 0 0 15px rgba(99, 102, 241, 0.6), 0 0 25px rgba(99, 102, 241, 0.4); } }
          .animate-title-glow { animation: title-glow 3s ease-in-out infinite; }

          .elegant-button { background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(79, 70, 229, 0.9)); border: 1px solid rgba(99, 102, 241, 0.3); transition: all 0.3s ease; }
          .elegant-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.25); }

          .filter-box { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.1); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transition: all 0.4s ease; }
          .filter-box:hover { box-shadow: 0 15px 40px rgba(79, 70, 229, 0.15); border-color: rgba(79, 70, 229, 0.2); }

          .loading-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; background-color: rgba(79, 70, 229, 0.3); overflow: hidden; border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem; }
          .loading-bar::after { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 50%; background: linear-gradient(90deg, transparent, #a78bfa, transparent); animation: loading-anim 2s linear infinite; }
          @keyframes loading-anim { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }

          .elegant-card-hover { transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
          .elegant-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(99, 102, 241, 0.15); }
        `}
      </style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {elegantShapes.map((shape, index) => (
          <div key={index} className={`absolute ${shape.class} ${shape.size} ${shape.color} animate-ps-glow`} style={{ animationDelay: shape.delay }}>
            {shape.icon}
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-30 bg-slate-950/70 backdrop-blur-lg border-b border-slate-800">
        <div className="container mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-light tracking-wide animate-title-glow text-center sm:text-left flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="h-10 w-10 relative top-px" />
            <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Room Bookings</span>
          </h1>

          <div className="flex items-center gap-4">
            <Button onClick={handleManageBookingClick} className="elegant-button h-11 px-6 font-semibold rounded-lg shadow-lg">
              <CalendarIcon className="w-4 h-4 mr-2" /> Manage
            </Button>
            <Button onClick={handleAdminLogin} className="elegant-button h-11 px-6 font-semibold rounded-lg shadow-lg">
              <KeyRound className="w-4 h-4 mr-2" /> Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 pt-8">
          <div className="space-y-2 mb-4 max-w-sm">
              <Label htmlFor="location-main-filter" className="text-lg font-medium text-slate-200 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-400" /> Select a Location
              </Label>
              <select
                  id="location-main-filter"
                  name="location"
                  value={filters.location}
                  onChange={handleFilterChange}
                  className="bg-slate-800/50 border-slate-700 flex h-12 w-full rounded-lg px-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                  {uniqueLocations.map(loc => (<option key={loc} value={loc}>{loc}</option>))}
              </select>
          </div>
      </div>


      <main className="container mx-auto px-6 py-10 relative z-10">
        <div className="mb-12 relative filter-box p-8">
          {isFiltering && <div className="loading-bar"></div>}

          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.5rem]">
              <Circle className="w-20 h-20 text-blue-500/5 absolute -top-4 -right-6 animate-spin" style={{animationDuration: '20s'}} />
              <Triangle className="w-16 h-16 text-green-500/5 absolute bottom-4 left-6 animate-bounce" style={{animationDuration: '8s'}} />
              <Square className="w-12 h-12 text-pink-500/5 absolute top-1/2 -right-10 animate-pulse" style={{animationDuration: '6s'}} />
              <X className="w-14 h-14 text-indigo-500/5 absolute -bottom-8 right-1/3 animate-ping" style={{animationDuration: '10s'}} />
          </div>

          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Circle className="w-3 h-3 text-blue-400 animate-pulse" />
                <Triangle className="w-3 h-3 text-green-400 animate-pulse" style={{animationDelay: '0.3s'}} />
                <Square className="w-3 h-3 text-pink-400 animate-pulse" style={{animationDelay: '0.6s'}} />
                <X className="w-3 h-3 text-indigo-400 animate-pulse" style={{animationDelay: '0.9s'}} />
              </div>
              <h2 className="text-2xl font-light text-slate-100">
                Find Available Rooms
              </h2>
            </div>
            {!loading && !isFiltering && (
               <div className="bg-indigo-500/20 text-indigo-300 text-sm font-semibold px-4 py-2 rounded-full border border-indigo-500/30">
                 {filteredRooms.length} {filteredRooms.length === 1 ? 'Room' : 'Rooms'} Available
               </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end relative"> {/* Adjusted grid-cols to 4 as location is now separate */}
             {/* The location filter is removed from here */}
             <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-slate-400 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Date</Label>
                <Input id="date" name="date" type="date" value={filters.date} onChange={handleFilterChange} className="bg-slate-800/50 border-slate-700 h-11 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all"/>
             </div>
             <div className="space-y-2">
                <Label htmlFor="startTime" className="text-sm font-medium text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Start Time</Label>
                <Input id="startTime" name="startTime" type="time" value={filters.startTime} onChange={handleFilterChange} className="bg-slate-800/50 border-slate-700 h-11 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all"/>
             </div>
             <div className="space-y-2">
                <Label htmlFor="roomName" className="text-sm font-medium text-slate-400 flex items-center gap-2"><Square className="w-4 h-4" /> Room Name</Label>
                <select id="roomName" name="roomName" value={filters.roomName} onChange={handleFilterChange} className="bg-slate-800/50 border-slate-700 flex h-11 w-full rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                    <option value="">All Rooms</option>
                    {uniqueRoomNames.map(name => (<option key={name} value={name}>{name}</option>))}
                </select>
             </div>
             <div className="flex gap-3 md:col-span-2 lg:col-span-1">
                <Button onClick={handleApplyFilter} disabled={isFiltering} className="elegant-button flex-1 h-11 font-semibold rounded-lg shadow-lg">
                  {isFiltering ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Search className="w-4 h-4 mr-2"/>}
                  Search
                </Button>
                <Button onClick={handleClearFilter} variant="secondary" className="h-11 font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
                  <FilterX className="w-4 h-4" />
                </Button>
             </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin"/>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRooms.map((room) => (
                <div key={room.id} className="elegant-card-hover">
                   <RoomCard
                     room={room}
                     onClick={() => handleBookRoomClick(room)}
                   />
                </div>
              ))}
            </div>

            {filteredRooms.length === 0 && !loading && (
              <div className="text-center py-20 col-span-full">
                 <div className="inline-block p-12 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm">
                    <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-full border border-indigo-400/30">
                        <Search className="w-8 h-8 text-indigo-300" />
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-200 mb-2">No Rooms Found</h3>
                    <p className="text-slate-400 mb-6 max-w-sm">Your search criteria did not match any available rooms. Try a different time or reset the filters.</p>
                    <Button
                      onClick={handleClearFilter}
                      className="elegant-button h-11 px-6 font-semibold rounded-lg shadow-lg"
                    >
                        <FilterX className="w-4 h-4 mr-2" />
                        Reset Search
                    </Button>
                 </div>
              </div>
            )}
          </>
        )}
      </main>

      {(showForm || showManageBooking) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {showForm && selectedRoom && (
            <BookingForm room={selectedRoom} onClose={handleCloseForms} />
          )}
          {showManageBooking && (
            <ManageBooking onClose={handleCloseForms} onReschedule={handleReschedule} allRooms={allRooms} />
          )}
        </div>
      )}
    </div>
  );
};

export default Index;