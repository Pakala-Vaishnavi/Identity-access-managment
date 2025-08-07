import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Users, 
  Brain, 
  BarChart3, 
  Clock, 
  UserCheck, 
  TrendingUp,
  Calendar,
  Activity,
  Database,
  Shield
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { state } = useAttendance();

  const quickActions = [
    {
      title: 'Mark Attendance',
      description: 'Start face recognition for attendance tracking',
      icon: Camera,
      path: '/mark-attendance',
      color: 'bg-primary-500',
      hoverColor: 'hover:bg-primary-600',
    },
    {
      title: 'Add Person',
      description: 'Register a new person in the system',
      icon: Users,
      path: '/add-person',
      color: 'bg-success-500',
      hoverColor: 'hover:bg-success-600',
    },
    {
      title: 'Train Images',
      description: 'Train the AI model with captured images',
      icon: Brain,
      path: '/train-images',
      color: 'bg-warning-500',
      hoverColor: 'hover:bg-warning-600',
    },
    {
      title: 'View Attendance',
      description: 'View and analyze attendance reports',
      icon: BarChart3,
      path: '/view-attendance',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
  ];

  const stats = [
    {
      title: 'Total Persons',
      value: state.statistics.totalPersons,
      icon: Users,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      title: 'Present Today',
      value: state.statistics.presentToday,
      icon: UserCheck,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
    },
    {
      title: 'Clock-ins Today',
      value: state.statistics.totalClockIns,
      icon: Clock,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
    },
    {
      title: 'Active Sessions',
      value: state.currentSession.isActive ? 1 : 0,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const recentAttendance = state.attendanceRecords
    .slice(-5)
    .reverse();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Smart Attendance
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Advanced face recognition system for intelligent office access management
        </p>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="card hover:scale-105 transform transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Link
                to={action.path}
                className="block group"
              >
                <div className="card hover:scale-105 transform transition-all duration-200 group-hover:shadow-2xl">
                  <div className={`w-12 h-12 ${action.color} ${action.hoverColor} rounded-lg flex items-center justify-center mb-4 transition-colors duration-200`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {action.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Attendance */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Attendance</h2>
            <Link
              to="/view-attendance"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          {recentAttendance.length > 0 ? (
            <div className="space-y-4">
              {recentAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{record.personName}</p>
                      <p className="text-sm text-gray-500">{record.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`status-indicator ${
                      record.status === 'Present' ? 'status-success' :
                      record.status === 'Late' ? 'status-warning' : 'status-danger'
                    }`}>
                      {record.status}
                    </span>
                    {record.clockInTime && (
                      <p className="text-sm text-gray-500 mt-1">{record.clockInTime}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No attendance records yet</p>
            </div>
          )}
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-success-500 rounded-full pulse-dot"></div>
                <span className="font-medium text-gray-900">Face Recognition</span>
              </div>
              <span className="text-success-600 font-medium">Online</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-success-500 rounded-full pulse-dot"></div>
                <span className="font-medium text-gray-900">Camera System</span>
              </div>
              <span className="text-success-600 font-medium">Active</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-gray-900">Database</span>
              </div>
              <span className="text-primary-600 font-medium">Connected</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-warning-600" />
                <span className="font-medium text-gray-900">Security</span>
              </div>
              <span className="text-warning-600 font-medium">Protected</span>
            </div>
          </div>

          {/* Current Session Info */}
          {state.currentSession.isActive && (
            <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h3 className="font-semibold text-primary-900 mb-2">Active Session</h3>
              <p className="text-sm text-primary-700">
                Duration: {state.currentSession.lectureDuration}
              </p>
              <p className="text-sm text-primary-700">
                Started: {state.currentSession.startTime && format(state.currentSession.startTime, 'HH:mm:ss')}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;