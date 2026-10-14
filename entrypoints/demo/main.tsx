import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { App } from '../../src/ui/App';
import { ReportPage } from '../../src/ui/ReportPage';
import '../../src/ui/style.css';
function Demo() {
  const [job, setJob] = useState<string>();
  return job ? <><button className="button quiet" onClick={() => setJob(undefined)}>Tarama ekranına dön</button><ReportPage suppliedJobId={job}/></> : <App onReport={setJob}/>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
