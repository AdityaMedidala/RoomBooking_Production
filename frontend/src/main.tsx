import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx loading...');

const root = document.getElementById("root");
console.log('Root element found:', !!root);

if (!root) {
  throw new Error("Root element not found. Make sure your HTML has a div with id='root'");
}

createRoot(root).render(<App />);
