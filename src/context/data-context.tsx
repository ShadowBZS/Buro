import React from 'react';
import { useDataService } from '../hooks/use-data-service';
import { Room, Employee, AccessRight } from '../types';

// Define the context type
interface DataContextType {
  // Status
  isInitialized: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingChangesCount: number;
  
  // Actions
  syncData: () => Promise<void>;
  
  // Room operations
  getRooms: (buildingId?: number) => Promise<Room[]>;
  getRoomById: (roomId: number) => Promise<Room | null>;
  createRoom: (room: Omit<Room, 'id'>) => Promise<Room>;
  updateRoom: (room: Room) => Promise<boolean>;
  deleteRoom: (roomId: number) => Promise<boolean>;
  
  // Employee operations
  getEmployees: (searchQuery?: string) => Promise<Employee[]>;
  getEmployeeById: (employeeId: number) => Promise<Employee | null>;
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<Employee>;
  updateEmployee: (employee: Employee) => Promise<boolean>;
  deleteEmployee: (employeeId: number) => Promise<boolean>;
  
  // Access rights operations
  getAccessRights: (roomId?: number, employeeId?: number) => Promise<AccessRight[]>;
  grantAccess: (employeeId: number, roomId: number) => Promise<boolean>;
  revokeAccess: (employeeId: number, roomId: number) => Promise<boolean>;
  
  // Bulk operations
  bulkImportRooms: (rooms: Omit<Room, 'id'>[]) => Promise<number>;
  bulkImportEmployees: (employees: Omit<Employee, 'id'>[]) => Promise<number>;
  bulkImportAccessRights: (accessRights: AccessRight[]) => Promise<number>;
}

// Create the context with default values
const DataContext = React.createContext<DataContextType>({
  isInitialized: false,
  isOnline: false,
  isSyncing: false,
  pendingChangesCount: 0,
  
  syncData: async () => {},
  
  getRooms: async () => [],
  getRoomById: async () => null,
  createRoom: async () => ({ id: 0, number: '', building: 1, floor: 1 }),
  updateRoom: async () => false,
  deleteRoom: async () => false,
  
  getEmployees: async () => [],
  getEmployeeById: async () => null,
  createEmployee: async () => ({ id: 0, lastName: '', firstName: '', middleName: '', employeeId: '', accessRooms: [] }),
  updateEmployee: async () => false,
  deleteEmployee: async () => false,
  
  getAccessRights: async () => [],
  grantAccess: async () => false,
  revokeAccess: async () => false,
  
  bulkImportRooms: async () => 0,
  bulkImportEmployees: async () => 0,
  bulkImportAccessRights: async () => 0
});

// Create the provider component
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dataService = useDataService();
  
  return React.createElement(
    DataContext.Provider,
    { value: dataService },
    children
  );
};

// Create a hook to use the context
export const useData = () => React.useContext(DataContext);
