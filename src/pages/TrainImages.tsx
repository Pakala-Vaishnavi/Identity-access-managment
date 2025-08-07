import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Database,
  Cpu,
  Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';

const TrainImages: React.FC = () => {
  const { state, dispatch } = useAttendance();
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'completed' | 'error'>('idle');
  const [currentPerson, setCurrentPerson] = useState('');

  const startTraining = async () => {
    setIsTraining(true);
    setTrainingStatus('training');
    setTrainingProgress(0);

    // Simulate training process
    const persons = state.persons.filter(p => p.isActive);
    const totalSteps = persons.length * 10; // 10 steps per person
    let currentStep = 0;

    for (const person of persons) {
      setCurrentPerson(person.name);
      
      // Simulate processing each person's images
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        currentStep++;
        setTrainingProgress((currentStep / totalSteps) * 100);
      }
    }

    // Final processing
    setCurrentPerson('Finalizing model...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsTraining(false);
    setTrainingStatus('completed');
    setCurrentPerson('');
    setTrainingProgress(100);
  };

  const resetTraining = () => {
    setTrainingStatus('idle');
    setTrainingProgress(0);
    setCurrentPerson('');
  };

  const activePersons = state.persons.filter(p => p.isActive);
  const totalImages = activePersons.reduce((sum, person) => sum + (person.imageCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Train Images</h1>
          <p className="text-gray-600 mt-2">Train the AI model with captured face images</p>
        </div>
        <Link to="/" className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Training Control */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Training Status Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Training Status</h2>
            
            <div className="text-center mb-6">
              {trainingStatus === 'idle' && (
                <div className="space-y-4">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto" />
                  <p className="text-gray-600">Ready to train the model</p>
                </div>
              )}
              
              {trainingStatus === 'training' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Brain className="w-16 h-16 text-primary-600 mx-auto animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="loading-spinner"></div>
                    </div>
                  </div>
                  <p className="text-primary-600 font-semibold">Training in progress...</p>
                  {currentPerson && (
                    <p className="text-sm text-gray-600">Processing: {currentPerson}</p>
                  )}
                </div>
              )}
              
              {trainingStatus === 'completed' && (
                <div className="space-y-4">
                  <CheckCircle className="w-16 h-16 text-success-600 mx-auto" />
                  <p className="text-success-600 font-semibold">Training completed successfully!</p>
                </div>
              )}
              
              {trainingStatus === 'error' && (
                <div className="space-y-4">
                  <AlertCircle className="w-16 h-16 text-danger-600 mx-auto" />
                  <p className="text-danger-600 font-semibold">Training failed</p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {(trainingStatus === 'training' || trainingStatus === 'completed') && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(trainingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${trainingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {trainingStatus === 'idle' && (
                <button
                  onClick={startTraining}
                  disabled={activePersons.length === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Training
                </button>
              )}
              
              {trainingStatus === 'training' && (
                <button
                  disabled
                  className="btn-primary w-full opacity-50 cursor-not-allowed"
                >
                  <div className="loading-spinner mr-2"></div>
                  Training...
                </button>
              )}
              
              {(trainingStatus === 'completed' || trainingStatus === 'error') && (
                <button
                  onClick={resetTraining}
                  className="btn-secondary w-full"
                >
                  Train Again
                </button>
              )}
            </div>
          </div>

          {/* Training Statistics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-primary-600" />
                  <span className="font-medium">Total Persons</span>
                </div>
                <span className="font-semibold">{activePersons.length}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="w-5 h-5 text-success-600" />
                  <span className="font-medium">Total Images</span>
                </div>
                <span className="font-semibold">{totalImages}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Cpu className="w-5 h-5 text-warning-600" />
                  <span className="font-medium">Model Status</span>
                </div>
                <span className={`font-semibold ${
                  trainingStatus === 'completed' ? 'text-success-600' : 'text-gray-600'
                }`}>
                  {trainingStatus === 'completed' ? 'Trained' : 'Not Trained'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Person List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Registered Persons</h2>
          
          {activePersons.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activePersons.map((person) => (
                <div
                  key={person.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    currentPerson === person.name
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{person.name}</h3>
                      <p className="text-sm text-gray-600">ID: {person.id}</p>
                      {person.department && (
                        <p className="text-sm text-gray-600">{person.department}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {person.imageCount || 0} images
                      </p>
                      <div className="flex items-center mt-1">
                        <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                        <span className="text-xs text-success-600">Ready</span>
                      </div>
                    </div>
                  </div>
                  
                  {currentPerson === person.name && (
                    <div className="mt-3 pt-3 border-t border-primary-200">
                      <div className="flex items-center text-primary-600">
                        <div className="loading-spinner mr-2"></div>
                        <span className="text-sm font-medium">Processing...</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No persons registered</p>
              <p className="text-sm text-gray-400 mt-2">
                Add persons first before training the model
              </p>
              <Link to="/add-person" className="btn-primary mt-4">
                Add Person
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Training Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">About Training Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Image Processing</h3>
            <p className="text-sm text-gray-600">
              The system processes all captured face images to extract facial features and patterns.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-success-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Model Training</h3>
            <p className="text-sm text-gray-600">
              Uses LBPH (Local Binary Pattern Histogram) algorithm to create a recognition model.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-warning-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Model Ready</h3>
            <p className="text-sm text-gray-600">
              Once trained, the model can accurately recognize faces during attendance marking.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrainImages;