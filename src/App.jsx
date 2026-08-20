import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import NewTrip from './pages/NewTrip.jsx';
import JoinTrip from './pages/JoinTrip.jsx';
import TripDashboard from './pages/TripDashboard.jsx';
import GlobalStyles from './components/ui/GlobalStyles.jsx';
import { PALETTE } from './lib/palette';

export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: PALETTE.cream,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: PALETTE.ink,
      }}
    >
      <GlobalStyles />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewTrip />} />
          <Route path="/join/:tripId" element={<JoinTrip />} />
          <Route path="/trip/:tripId" element={<TripDashboard />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
