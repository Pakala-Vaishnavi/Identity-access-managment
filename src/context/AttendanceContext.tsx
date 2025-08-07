import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface Person {
  id: string;
  name: string;
  email?: string;
  department?: string;
  imageCount?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  personName: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  duration?: string;
  status: 'Present' | 'Absent' | 'Late' | 'MCR';
  confidence?: number;
}

export interface TrainingSession {
  id: string;
  personId: string;
  personName: string;
  imagesCaptured: number;
  totalImages: number;
  status: 'in-progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
}

interface AttendanceState {
  persons: Person[];
  attendanceRecords: AttendanceRecord[];
  trainingSessions: TrainingSession[];
  currentSession: {
    isActive: boolean;
    lectureDuration?: string;
    startTime?: Date;
  };
  statistics: {
    totalPersons: number;
    presentToday: number;
    totalClockIns: number;
    totalClockOuts: number;
  };
}

type AttendanceAction =
  | { type: 'ADD_PERSON'; payload: Person }
  | { type: 'UPDATE_PERSON'; payload: { id: string; updates: Partial<Person> } }
  | { type: 'DELETE_PERSON'; payload: string }
  | { type: 'ADD_ATTENDANCE_RECORD'; payload: AttendanceRecord }
  | { type: 'UPDATE_ATTENDANCE_RECORD'; payload: { id: string; updates: Partial<AttendanceRecord> } }
  | { type: 'START_TRAINING_SESSION'; payload: TrainingSession }
  | { type: 'UPDATE_TRAINING_SESSION'; payload: { id: string; updates: Partial<TrainingSession> } }
  | { type: 'START_ATTENDANCE_SESSION'; payload: { lectureDuration: string } }
  | { type: 'END_ATTENDANCE_SESSION' }
  | { type: 'UPDATE_STATISTICS' };

const initialState: AttendanceState = {
  persons: [
    {
      id: '1',
      name: 'Abhinav',
      email: 'abhinav@example.com',
      department: 'Engineering',
      imageCount: 101,
      isActive: true,
      createdAt: new Date('2023-01-01'),
    },
    {
      id: '2',
      name: 'Venkat',
      email: 'venkat@example.com',
      department: 'Engineering',
      imageCount: 101,
      isActive: true,
      createdAt: new Date('2023-01-02'),
    },
    {
      id: '3',
      name: 'Ashritha',
      email: 'ashritha@example.com',
      department: 'Design',
      imageCount: 101,
      isActive: true,
      createdAt: new Date('2023-01-03'),
    },
  ],
  attendanceRecords: [],
  trainingSessions: [],
  currentSession: {
    isActive: false,
  },
  statistics: {
    totalPersons: 3,
    presentToday: 0,
    totalClockIns: 0,
    totalClockOuts: 0,
  },
};

function attendanceReducer(state: AttendanceState, action: AttendanceAction): AttendanceState {
  switch (action.type) {
    case 'ADD_PERSON':
      return {
        ...state,
        persons: [...state.persons, action.payload],
        statistics: {
          ...state.statistics,
          totalPersons: state.statistics.totalPersons + 1,
        },
      };

    case 'UPDATE_PERSON':
      return {
        ...state,
        persons: state.persons.map(person =>
          person.id === action.payload.id
            ? { ...person, ...action.payload.updates }
            : person
        ),
      };

    case 'DELETE_PERSON':
      return {
        ...state,
        persons: state.persons.filter(person => person.id !== action.payload),
        statistics: {
          ...state.statistics,
          totalPersons: state.statistics.totalPersons - 1,
        },
      };

    case 'ADD_ATTENDANCE_RECORD':
      const newRecord = action.payload;
      const isClockIn = newRecord.clockInTime && !newRecord.clockOutTime;
      const isClockOut = newRecord.clockOutTime;
      
      return {
        ...state,
        attendanceRecords: [...state.attendanceRecords, newRecord],
        statistics: {
          ...state.statistics,
          totalClockIns: isClockIn ? state.statistics.totalClockIns + 1 : state.statistics.totalClockIns,
          totalClockOuts: isClockOut ? state.statistics.totalClockOuts + 1 : state.statistics.totalClockOuts,
          presentToday: newRecord.status === 'Present' ? state.statistics.presentToday + 1 : state.statistics.presentToday,
        },
      };

    case 'UPDATE_ATTENDANCE_RECORD':
      return {
        ...state,
        attendanceRecords: state.attendanceRecords.map(record =>
          record.id === action.payload.id
            ? { ...record, ...action.payload.updates }
            : record
        ),
      };

    case 'START_TRAINING_SESSION':
      return {
        ...state,
        trainingSessions: [...state.trainingSessions, action.payload],
      };

    case 'UPDATE_TRAINING_SESSION':
      return {
        ...state,
        trainingSessions: state.trainingSessions.map(session =>
          session.id === action.payload.id
            ? { ...session, ...action.payload.updates }
            : session
        ),
      };

    case 'START_ATTENDANCE_SESSION':
      return {
        ...state,
        currentSession: {
          isActive: true,
          lectureDuration: action.payload.lectureDuration,
          startTime: new Date(),
        },
      };

    case 'END_ATTENDANCE_SESSION':
      return {
        ...state,
        currentSession: {
          isActive: false,
        },
      };

    default:
      return state;
  }
}

const AttendanceContext = createContext<{
  state: AttendanceState;
  dispatch: React.Dispatch<AttendanceAction>;
} | null>(null);

export const AttendanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(attendanceReducer, initialState);

  return (
    <AttendanceContext.Provider value={{ state, dispatch }}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};