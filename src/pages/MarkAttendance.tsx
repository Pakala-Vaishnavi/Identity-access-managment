import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Play, 
  Square, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  Eye,
  Save,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';
import { format } from 'date-fns';

const MarkAttendance: React.FC = () => {
  const { state, dispatch } = useAttendance();
  const [isRecording, setIsRecording] = useState(false);
  const [lectureDuration, setLectureDuration] = useState('');
  const [showDurationModal, setShowDurationModal] = useState(true);
  const [detectedPerson, setDetectedPerson] = useState<any>(null);
  const [confidence, setConfidence] = useState(0);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate face detection (in real app, this would use actual face recognition)
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        // Simulate random person detection
        const persons = state.persons;
        if (persons.length > 0 && Math.random() > 0.3) {
          const randomPerson = persons[Math.floor(Math.random() * persons.length)];
          setDetectedPerson(randomPerson);
          setConfidence(Math.floor(Math.random() * 30) + 70); // 70-100%
          setBlinkDetected(Math.random() > 0.7); // Random blink detection
        } else {
          setDetectedPerson(null);
          setConfidence(0);
          setBlinkDetected(false);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isRecording, state.persons]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 720, height: 540 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setDetectedPerson(null);
  };

  const handleStartSession = () => {
    if (!lectureDuration) {
      alert('Please enter lecture duration');
      return;
    }
    dispatch({ type: 'START_ATTENDANCE_SESSION', payload: { lectureDuration } });
    setShowDurationModal(false);
    startCamera();
  };

  const handleClockIn = () => {
    if (!detectedPerson) return;
    
    const record = {
      id: Date.now().toString(),
      personId: detectedPerson.id,
      personName: detectedPerson.name,
      date: format(new Date(), 'yyyy-MM-dd'),
      clockInTime: format(new Date(), 'HH:mm:ss'),
      status: 'Present' as const,
      confidence
    };

    dispatch({ type: 'ADD_ATTENDANCE_RECORD', payload: record });
    alert(`${detectedPerson.name} clocked in successfully!`);
  };

  const handleClockOut = () => {
    if (!detectedPerson) return;
    
    // Find existing record for today
    const existingRecord = state.attendanceRecords.find(
      record => record.personId === detectedPerson.id && 
      record.date === format(new Date(), 'yyyy-MM-dd')
    );

    if (existingRecord) {
      const clockOutTime = format(new Date(), 'HH:mm:ss');
      const updates = {
        clockOutTime,
        duration: calculateDuration(existingRecord.clockInTime!, clockOutTime)
      };
      
      dispatch({ 
        type: 'UPDATE_ATTENDANCE_RECORD', 
        payload: { id: existingRecord.id, updates } 
      });
      alert(`${detectedPerson.name} clocked out successfully!`);
    } else {
      alert('No clock-in record found for today');
    }
  };

  const calculateDuration = (clockIn: string, clockOut: string): string => {
    const [inHours, inMinutes, inSeconds] = clockIn.split(':').map(Number);
    const [outHours, outMinutes, outSeconds] = clockOut.split(':').map(Number);
    
    const inTime = inHours * 3600 + inMinutes * 60 + inSeconds;
    const outTime = outHours * 3600 + outMinutes * 60 + outSeconds;
    
    const duration = outTime - inTime;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSaveAttendance = () => {
    dispatch({ type: 'END_ATTENDANCE_SESSION' });
    stopCamera();
    alert('Attendance saved successfully!');
  };

  if (showDurationModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-xl p-8 max-w-md w-full mx-4"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Set Lecture Duration</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (HH:MM:SS)
            </label>
            <input
              type="text"
              placeholder="01:30:00"
              value={lectureDuration}
              onChange={(e) => setLectureDuration(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex space-x-4">
            <Link to="/" className="btn-secondary flex-1 text-center">
              Cancel
            </Link>
            <button onClick={handleStartSession} className="btn-primary flex-1">
              Start Session
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-600 mt-2">Face recognition attendance system</p>
        </div>
        <Link to="/" className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Camera Feed */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Live Camera Feed
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success-500 rounded-full pulse-dot"></div>
                <span className="text-sm text-success-600 font-medium">Live</span>
              </div>
            </div>

            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-96 object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              
              {/* Detection Overlay */}
              {detectedPerson && (
                <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
                  <p className="font-semibold">{detectedPerson.name}</p>
                  <p className="text-sm">Confidence: {confidence}%</p>
                </div>
              )}

              {/* Blink Status */}
              <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">
                    {blinkDetected ? 'Blink Detected' : 'Eyes Open'}
                  </span>
                </div>
              </div>
            </div>

            {/* Camera Controls */}
            <div className="flex justify-center space-x-4 mt-6">
              {!isRecording ? (
                <button onClick={startCamera} className="btn-success">
                  <Play className="w-4 h-4 mr-2" />
                  Start Camera
                </button>
              ) : (
                <button onClick={stopCamera} className="btn-danger">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Camera
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Current Time */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Time</h3>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {format(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-gray-600 mt-1">
                {format(currentTime, 'yyyy-MM-dd')}
              </p>
            </div>
          </div>

          {/* Detected Person */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recognized Person</h3>
            {detectedPerson ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-primary-600" />
                </div>
                <p className="font-semibold text-gray-900">{detectedPerson.name}</p>
                <p className="text-sm text-gray-600">ID: {detectedPerson.id}</p>
                <p className="text-sm text-gray-600">Confidence: {confidence}%</p>
                {detectedPerson.department && (
                  <p className="text-sm text-gray-600">{detectedPerson.department}</p>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No person detected</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleClockIn}
                disabled={!detectedPerson}
                className="btn-success w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clock className="w-4 h-4 mr-2" />
                Clock In
              </button>
              
              <button
                onClick={handleClockOut}
                disabled={!detectedPerson}
                className="btn-warning w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clock className="w-4 h-4 mr-2" />
                Clock Out
              </button>
              
              <button
                onClick={handleSaveAttendance}
                className="btn-primary w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Attendance
              </button>
            </div>
          </div>

          {/* Session Statistics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Clock-ins:</span>
                <span className="font-semibold">{state.statistics.totalClockIns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Clock-outs:</span>
                <span className="font-semibold">{state.statistics.totalClockOuts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Present Today:</span>
                <span className="font-semibold">{state.statistics.presentToday}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MarkAttendance;