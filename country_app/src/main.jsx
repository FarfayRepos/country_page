// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './config/http'; // instala el envío del token en axios y fetch
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
