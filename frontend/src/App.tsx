// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import AdminPanel from './components/AdminPanel';
import { Toaster } from "@/components/ui/toaster"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={<AdminPanel />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster /> 
    </Router>
  );
}

export default App;