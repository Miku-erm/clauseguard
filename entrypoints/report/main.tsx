import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReportPage } from '../../src/ui/ReportPage';
import '../../src/ui/style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ReportPage/></React.StrictMode>);
