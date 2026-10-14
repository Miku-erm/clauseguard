import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsPage } from '../../src/ui/SettingsPage';
import '../../src/ui/style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><SettingsPage/></React.StrictMode>);
