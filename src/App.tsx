import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import MarkAttendance from './pages/MarkAttendance';
import AddPerson from './pages/AddPerson';
import TrainImages from './pages/TrainImages';
import ViewAttendance from './pages/ViewAttendance';
import { AttendanceProvider } from './context/AttendanceContext';

function App() {
  return (
    <AttendanceProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <Header />
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4 py-8"
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/mark-attendance" element={<MarkAttendance />} />
              <Route path="/add-person" element={<AddPerson />} />
              <Route path="/train-images" element={<TrainImages />} />
              <Route path="/view-attendance" element={<ViewAttendance />} />
            </Routes>
          </motion.main>
        </div>
      </Router>
    </AttendanceProvider>
  );
}

export default App;