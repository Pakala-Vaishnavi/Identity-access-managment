import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  User, 
  Save, 
  ArrowLeft, 
  Play, 
  Square,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';

const AddPerson: React.FC = () => {
  const { dispatch } = useAttendance();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    department: ''
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const totalImages = 101; // Same as Python version

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.id.trim()) {
      newErrors.id = 'ID is required';
    } else if (!/^\d+$/.test(formData.id)) {
      newErrors.id = 'ID must be numeric';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      newErrors.name = 'Name must contain only letters';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setShowCamera(false);
    setIsCapturing(false);
  };

  const startCapturing = () => {
    if (!validateForm()) {
      alert('Please fill in all required fields correctly');
      return;
    }

    setIsCapturing(true);
    setCapturedImages(0);

    // Simulate image capture every 100ms (like the Python version)
    intervalRef.current = setInterval(() => {
      setCapturedImages(prev => {
        const newCount = prev + 1;
        
        // Simulate face detection and image saving
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            // Draw face detection rectangle (simulated)
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2;
            ctx.strokeRect(
              video.videoWidth * 0.3,
              video.videoHeight * 0.2,
              video.videoWidth * 0.4,
              video.videoHeight * 0.6
            );
          }
        }

        if (newCount >= totalImages) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsCapturing(false);
          handleSavePerson();
        }
        
        return newCount;
      });
    }, 100);
  };

  const handleSavePerson = () => {
    const newPerson = {
      id: formData.id,
      name: formData.name,
      email: formData.email || undefined,
      department: formData.department || undefined,
      imageCount: totalImages,
      isActive: true,
      createdAt: new Date()
    };

    dispatch({ type: 'ADD_PERSON', payload: newPerson });
    
    alert(`Images saved for ID: ${formData.id}, Name: ${formData.name}`);
    stopCamera();
    navigate('/');
  };

  const progressPercentage = (capturedImages / totalImages) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Person</h1>
          <p className="text-gray-600 mt-2">Register a new person in the system</p>
        </div>
        <Link to="/" className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Person Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className={`input-field ${errors.id ? 'border-red-500' : ''}`}
                placeholder="Enter numeric ID"
              />
              {errors.id && (
                <p className="text-red-500 text-sm mt-1">{errors.id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="input-field"
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR">Human Resources</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>

          {!showCamera && (
            <button
              onClick={startCamera}
              className="btn-primary w-full mt-6"
            >
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </button>
          )}
        </motion.div>

        {/* Camera Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Image Capture</h2>
          
          {showCamera ? (
            <div className="space-y-4">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                />
                
                {isCapturing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="loading-spinner mx-auto mb-4"></div>
                      <p className="text-lg font-semibold">Capturing Images...</p>
                      <p className="text-sm">{capturedImages} / {totalImages}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress: {Math.round(progressPercentage)}%</span>
                <span>{capturedImages} / {totalImages} images</span>
              </div>

              {/* Camera Controls */}
              <div className="flex space-x-4">
                {!isCapturing ? (
                  <>
                    <button
                      onClick={startCapturing}
                      className="btn-success flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="btn-secondary flex-1"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Camera
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                      }
                      setIsCapturing(false);
                    }}
                    className="btn-danger w-full"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Capture
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Camera not started</p>
              <p className="text-sm text-gray-400 mt-2">
                Please fill in the form and start the camera to begin image capture
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Look directly into the camera</li>
              <li>• Keep your face centered in the frame</li>
              <li>• Avoid moving during capture</li>
              <li>• Ensure good lighting conditions</li>
              <li>• {totalImages} images will be captured automatically</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AddPerson;