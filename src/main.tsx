import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Force light theme only - remove any dark mode classes
document.documentElement.classList.remove('dark');
document.body.classList.remove('dark');

// Prevent dark mode from being applied
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'class') {
      const element = mutation.target as HTMLElement;
      if (element.classList.contains('dark')) {
        element.classList.remove('dark');
      }
    }
  });
});

observer.observe(document.documentElement, { attributes: true });
observer.observe(document.body, { attributes: true });

// Override system preference detection
if (window.matchMedia) {
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  // Force light theme regardless of system preference
  localStorage.setItem('theme', 'light');
}

createRoot(document.getElementById("root")!).render(<App />);
