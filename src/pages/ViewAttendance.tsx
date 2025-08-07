import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Search, 
  Calendar,
  ArrowLeft,
  Users,
  Clock,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../context/AttendanceContext';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ViewAttendance: React.FC = () => {
  const { state } = useAttendance();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Filter attendance records
  const filteredRecords = useMemo(() => {
    return state.attendanceRecords.filter(record => {
      const matchesSearch = record.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.personId.includes(searchTerm);
      const matchesDate = !dateFilter || record.date === dateFilter;
      const matchesStatus = !statusFilter || record.status === statusFilter;
      
      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [state.attendanceRecords, searchTerm, dateFilter, statusFilter]);

  // Generate analytics data
  const analyticsData = useMemo(() => {
    const statusCounts = filteredRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dailyAttendance = filteredRecords.reduce((acc, record) => {
      const date = record.date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      statusData: Object.entries(statusCounts).map(([status, count]) => ({
        name: status,
        value: count,
        color: status === 'Present' ? '#22c55e' : 
               status === 'Late' ? '#f59e0b' : 
               status === 'MCR' ? '#ef4444' : '#6b7280'
      })),
      dailyData: Object.entries(dailyAttendance)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7) // Last 7 days
        .map(([date, count]) => ({
          date: format(parseISO(date), 'MMM dd'),
          attendance: count
        }))
    };
  }, [filteredRecords]);

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Date', 'Clock IN Time', 'Clock OUT Time', 'Duration', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        record.personId,
        record.personName,
        record.date,
        record.clockInTime || '-',
        record.clockOutTime || '-',
        record.duration || '-',
        record.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">View Attendance</h1>
          <p className="text-gray-600 mt-2">Analyze and manage attendance records</p>
        </div>
        <div className="flex space-x-4">
          <button onClick={exportToCSV} className="btn-success">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <Link to="/" className="btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRecords.length}</p>
            </div>
            <FileText className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present</p>
              <p className="text-2xl font-bold text-success-600">
                {filteredRecords.filter(r => r.status === 'Present').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-success-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Late</p>
              <p className="text-2xl font-bold text-warning-600">
                {filteredRecords.filter(r => r.status === 'Late').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-warning-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-danger-600">
                {filteredRecords.filter(r => r.status === 'Absent').length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-danger-600" />
          </div>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Attendance Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="attendance" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analyticsData.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field"
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="MCR">MCR</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Attendance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Attendance Records</h2>
          <span className="text-sm text-gray-600">
            Showing {filteredRecords.length} of {state.attendanceRecords.length} records
          </span>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.personName}
                        </div>
                        <div className="text-sm text-gray-500">ID: {record.personId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.clockInTime || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.clockOutTime || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.duration || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-indicator ${
                        record.status === 'Present' ? 'status-success' :
                        record.status === 'Late' ? 'status-warning' : 'status-danger'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No attendance records found</p>
            <p className="text-sm text-gray-400 mt-2">
              Try adjusting your search criteria or add some attendance records
            </p>
          </div>
        )}
      </motion.div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedRecord(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Attendance Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-lg font-semibold text-gray-900">{selectedRecord.personName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="text-gray-900">{selectedRecord.personId}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="text-gray-900">{selectedRecord.date}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clock In</label>
                  <p className="text-gray-900">{selectedRecord.clockInTime || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clock Out</label>
                  <p className="text-gray-900">{selectedRecord.clockOutTime || '-'}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <p className="text-gray-900">{selectedRecord.duration || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`status-indicator ${
                  selectedRecord.status === 'Present' ? 'status-success' :
                  selectedRecord.status === 'Late' ? 'status-warning' : 'status-danger'
                }`}>
                  {selectedRecord.status}
                </span>
              </div>
              
              {selectedRecord.confidence && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recognition Confidence</label>
                  <p className="text-gray-900">{selectedRecord.confidence}%</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setSelectedRecord(null)}
              className="btn-primary w-full mt-6"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ViewAttendance;