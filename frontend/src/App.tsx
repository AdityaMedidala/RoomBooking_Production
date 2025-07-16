// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import AdminPanel from './components/AdminPanel';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster component

function App() {
  return (
    <Router>
      <Routes>
        {/* Route for your main page, which shows the room list */}
        <Route path="/" element={<Index />} />

        {/* Route for the admin page, now using AdminPanel */}
        <Route path="/admin" element={<AdminPanel />} />

        {/* Route for handling any pages that don't exist */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster /> {/* Add the Toaster component here */}
    </Router>
  );
}

export default App;