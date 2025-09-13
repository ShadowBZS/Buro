import React from 'react';
import { openDB, IDBPDatabase } from 'idb';
import { Room, Employee, AccessRight, PendingChange } from '../types';
import { useNetworkStatus } from '../hooks/use-network-status';
import { addToast } from '@heroui/react';

// Database configuration
const DB_NAME = 'KeyManagementDB';
const DB_VERSION = 1;
const STORES = {
  ROOMS: 'rooms',
  EMPLOYEES: 'employees',
  ACCESS_RIGHTS: 'accessRights',
  PENDING_CHANGES: 'pendingChanges'
};

// Mock data for initial setup
import { mockRooms, mockEmployees } from '../data/mock-data';

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

const DataContext = React.createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = React.useState<IDBPDatabase | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [pendingChangesCount, setPendingChangesCount] = React.useState(0);
  const { isOnline } = useNetworkStatus();

  // Initialize the database
  React.useEffect(() => {
    const initDb = async () => {
      try {
        const database = await openDB(DB_NAME, DB_VERSION, {
          upgrade(db) {
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.ROOMS)) {
              const roomStore = db.createObjectStore(STORES.ROOMS, { keyPath: 'id', autoIncrement: true });
              roomStore.createIndex('building', 'building', { unique: false });
              roomStore.createIndex('floor', 'floor', { unique: false });
              roomStore.createIndex('number', 'number', { unique: false });
            }
            
            if (!db.objectStoreNames.contains(STORES.EMPLOYEES)) {
              const employeeStore = db.createObjectStore(STORES.EMPLOYEES, { keyPath: 'id', autoIncrement: true });
              employeeStore.createIndex('lastName', 'lastName', { unique: false });
              employeeStore.createIndex('employeeId', 'employeeId', { unique: true });
              employeeStore.createIndex('fullName', ['lastName', 'firstName', 'middleName'], { unique: false });
            }
            
            if (!db.objectStoreNames.contains(STORES.ACCESS_RIGHTS)) {
              const accessStore = db.createObjectStore(STORES.ACCESS_RIGHTS, { keyPath: 'id', autoIncrement: true });
              accessStore.createIndex('employeeId', 'employeeId', { unique: false });
              accessStore.createIndex('roomId', 'roomId', { unique: false });
              accessStore.createIndex('unique_access', ['employeeId', 'roomId'], { unique: true });
            }
            
            if (!db.objectStoreNames.contains(STORES.PENDING_CHANGES)) {
              const pendingStore = db.createObjectStore(STORES.PENDING_CHANGES, { keyPath: 'id' });
              pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
              pendingStore.createIndex('operation', 'operation', { unique: false });
              pendingStore.createIndex('entityType', 'entityType', { unique: false });
            }
          }
        });

        setDb(database);
        
        // Check if we need to seed initial data
        const rooms = await database.getAll(STORES.ROOMS);
        if (rooms.length === 0) {
          await seedInitialData(database);
        }
        
        // Get pending changes count
        const pendingChanges = await database.getAll(STORES.PENDING_CHANGES);
        setPendingChangesCount(pendingChanges.length);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        addToast({
          title: 'Ошибка',
          description: 'Не удалось инициализировать базу данных',
          color: 'danger'
        });
      }
    };

    initDb();
    
    return () => {
      if (db) {
        db.close();
      }
    };
  }, []);

  // Seed initial data for demo purposes
  const seedInitialData = async (database: IDBPDatabase) => {
    try {
      // Import rooms
      const tx1 = database.transaction(STORES.ROOMS, 'readwrite');
      for (const room of mockRooms) {
        await tx1.store.add(room);
      }
      await tx1.done;
      
      // Import employees
      const tx2 = database.transaction(STORES.EMPLOYEES, 'readwrite');
      for (const employee of mockEmployees) {
        await tx2.store.add(employee);
      }
      await tx2.done;
      
      // Create access rights
      const tx3 = database.transaction(STORES.ACCESS_RIGHTS, 'readwrite');
      let accessId = 1;
      
      for (const employee of mockEmployees) {
        for (const roomId of employee.accessRooms) {
          await tx3.store.add({
            id: accessId++,
            employeeId: employee.id,
            roomId
          });
        }
      }
      await tx3.done;
      
      console.log('Initial data seeded successfully');
    } catch (error) {
      console.error('Error seeding initial data:', error);
    }
  };

  // Add a pending change to be synced later
  const addPendingChange = async (change: Omit<PendingChange, 'id' | 'timestamp'>) => {
    if (!db) return;
    
    const pendingChange: PendingChange = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...change
    };
    
    await db.add(STORES.PENDING_CHANGES, pendingChange);
    
    // Update pending changes count
    const pendingChanges = await db.getAll(STORES.PENDING_CHANGES);
    setPendingChangesCount(pendingChanges.length);
  };

  // Room operations
  const getRooms = async (buildingId?: number): Promise<Room[]> => {
    if (!db) return [];
    
    try {
      if (buildingId) {
        return await db.getAllFromIndex(STORES.ROOMS, 'building', buildingId);
      } else {
        return await db.getAll(STORES.ROOMS);
      }
    } catch (error) {
      console.error('Error getting rooms:', error);
      return [];
    }
  };

  const getRoomById = async (roomId: number): Promise<Room | null> => {
    if (!db) return null;
    
    try {
      return await db.get(STORES.ROOMS, roomId);
    } catch (error) {
      console.error('Error getting room by ID:', error);
      return null;
    }
  };

  const createRoom = async (room: Omit<Room, 'id'>): Promise<Room> => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const id = await db.add(STORES.ROOMS, room);
      const createdRoom = { id: id as number, ...room };
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'create',
        entityType: 'room',
        data: createdRoom
      });
      
      return createdRoom;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  };

  const updateRoom = async (room: Room): Promise<boolean> => {
    if (!db) return false;
    
    try {
      await db.put(STORES.ROOMS, room);
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'update',
        entityType: 'room',
        data: room
      });
      
      return true;
    } catch (error) {
      console.error('Error updating room:', error);
      return false;
    }
  };

  const deleteRoom = async (roomId: number): Promise<boolean> => {
    if (!db) return false;
    
    try {
      // Get the room before deleting (for sync purposes)
      const room = await db.get(STORES.ROOMS, roomId);
      
      // Delete the room
      await db.delete(STORES.ROOMS, roomId);
      
      // Delete associated access rights
      const accessRights = await db.getAllFromIndex(STORES.ACCESS_RIGHTS, 'roomId', roomId);
      const tx = db.transaction(STORES.ACCESS_RIGHTS, 'readwrite');
      for (const access of accessRights) {
        await tx.store.delete(access.id!);
      }
      await tx.done;
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'delete',
        entityType: 'room',
        data: { id: roomId, room }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      return false;
    }
  };

  // Employee operations
  const getEmployees = async (searchQuery?: string): Promise<Employee[]> => {
    if (!db) return [];
    
    try {
      const employees = await db.getAll(STORES.EMPLOYEES);
      
      // Filter by search query if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return employees.filter(employee => 
          `${employee.lastName} ${employee.firstName} ${employee.middleName}`.toLowerCase().includes(query) ||
          employee.employeeId.toLowerCase().includes(query)
        );
      }
      
      return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  };

  const getEmployeeById = async (employeeId: number): Promise<Employee | null> => {
    if (!db) return null;
    
    try {
      return await db.get(STORES.EMPLOYEES, employeeId);
    } catch (error) {
      console.error('Error getting employee by ID:', error);
      return null;
    }
  };

  const createEmployee = async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const employeeWithAccessRooms = {
        ...employee,
        accessRooms: employee.accessRooms || []
      };
      
      const id = await db.add(STORES.EMPLOYEES, employeeWithAccessRooms);
      const createdEmployee = { id: id as number, ...employeeWithAccessRooms };
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'create',
        entityType: 'employee',
        data: createdEmployee
      });
      
      return createdEmployee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (employee: Employee): Promise<boolean> => {
    if (!db) return false;
    
    try {
      await db.put(STORES.EMPLOYEES, employee);
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'update',
        entityType: 'employee',
        data: employee
      });
      
      return true;
    } catch (error) {
      console.error('Error updating employee:', error);
      return false;
    }
  };

  const deleteEmployee = async (employeeId: number): Promise<boolean> => {
    if (!db) return false;
    
    try {
      // Get the employee before deleting (for sync purposes)
      const employee = await db.get(STORES.EMPLOYEES, employeeId);
      
      // Delete the employee
      await db.delete(STORES.EMPLOYEES, employeeId);
      
      // Delete associated access rights
      const accessRights = await db.getAllFromIndex(STORES.ACCESS_RIGHTS, 'employeeId', employeeId);
      const tx = db.transaction(STORES.ACCESS_RIGHTS, 'readwrite');
      for (const access of accessRights) {
        await tx.store.delete(access.id!);
      }
      await tx.done;
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'delete',
        entityType: 'employee',
        data: { id: employeeId, employee }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  };

  // Access rights operations
  const getAccessRights = async (roomId?: number, employeeId?: number): Promise<AccessRight[]> => {
    if (!db) return [];
    
    try {
      if (roomId && employeeId) {
        // This is a simplified approach - in a real app, you'd use a compound index
        const allRights = await db.getAll(STORES.ACCESS_RIGHTS);
        return allRights.filter(right => right.roomId === roomId && right.employeeId === employeeId);
      } else if (roomId) {
        return await db.getAllFromIndex(STORES.ACCESS_RIGHTS, 'roomId', roomId);
      } else if (employeeId) {
        return await db.getAllFromIndex(STORES.ACCESS_RIGHTS, 'employeeId', employeeId);
      } else {
        return await db.getAll(STORES.ACCESS_RIGHTS);
      }
    } catch (error) {
      console.error('Error getting access rights:', error);
      return [];
    }
  };

  const grantAccess = async (employeeId: number, roomId: number): Promise<boolean> => {
    if (!db) return false;
    
    try {
      // Check if access already exists
      const existingAccess = await getAccessRights(roomId, employeeId);
      if (existingAccess.length > 0) {
        return true; // Access already granted
      }
      
      // Add access right
      const accessRight: Omit<AccessRight, 'id'> = {
        employeeId,
        roomId
      };
      
      const accessId = await db.add(STORES.ACCESS_RIGHTS, accessRight);
      
      // Update employee's accessRooms array
      const employee = await getEmployeeById(employeeId);
      if (employee) {
        if (!employee.accessRooms.includes(roomId)) {
          employee.accessRooms.push(roomId);
          await updateEmployee(employee);
        }
      }
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'grant',
        entityType: 'access',
        data: { id: accessId, employeeId, roomId }
      });
      
      return true;
    } catch (error) {
      console.error('Error granting access:', error);
      return false;
    }
  };

  const revokeAccess = async (employeeId: number, roomId: number): Promise<boolean> => {
    if (!db) return false;
    
    try {
      // Find the access right
      const accessRights = await getAccessRights(roomId, employeeId);
      if (accessRights.length === 0) {
        return true; // No access to revoke
      }
      
      // Delete the access right
      for (const access of accessRights) {
        await db.delete(STORES.ACCESS_RIGHTS, access.id!);
      }
      
      // Update employee's accessRooms array
      const employee = await getEmployeeById(employeeId);
      if (employee) {
        employee.accessRooms = employee.accessRooms.filter(id => id !== roomId);
        await db.put(STORES.EMPLOYEES, employee);
      }
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'revoke',
        entityType: 'access',
        data: { employeeId, roomId }
      });
      
      return true;
    } catch (error) {
      console.error('Error revoking access:', error);
      return false;
    }
  };

  // Bulk operations
  const bulkImportRooms = async (rooms: Omit<Room, 'id'>[]): Promise<number> => {
    if (!db) return 0;
    
    try {
      const tx = db.transaction(STORES.ROOMS, 'readwrite');
      let count = 0;
      
      for (const room of rooms) {
        await tx.store.add(room);
        count++;
      }
      
      await tx.done;
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'bulk',
        entityType: 'room',
        data: { rooms }
      });
      
      return count;
    } catch (error) {
      console.error('Error bulk importing rooms:', error);
      return 0;
    }
  };

  const bulkImportEmployees = async (employees: Omit<Employee, 'id'>[]): Promise<number> => {
    if (!db) return 0;
    
    try {
      const tx = db.transaction(STORES.EMPLOYEES, 'readwrite');
      let count = 0;
      
      for (const employee of employees) {
        await tx.store.add({
          ...employee,
          accessRooms: employee.accessRooms || []
        });
        count++;
      }
      
      await tx.done;
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'bulk',
        entityType: 'employee',
        data: { employees }
      });
      
      return count;
    } catch (error) {
      console.error('Error bulk importing employees:', error);
      return 0;
    }
  };

  const bulkImportAccessRights = async (accessRights: AccessRight[]): Promise<number> => {
    if (!db) return 0;
    
    try {
      const tx = db.transaction(STORES.ACCESS_RIGHTS, 'readwrite');
      let count = 0;
      
      for (const access of accessRights) {
        await tx.store.add(access);
        count++;
      }
      
      await tx.done;
      
      // Add pending change for sync
      await addPendingChange({
        operation: 'bulk',
        entityType: 'access',
        data: { accessRights }
      });
      
      return count;
    } catch (error) {
      console.error('Error bulk importing access rights:', error);
      return 0;
    }
  };

  // Sync data with server (mock implementation)
  const syncData = async () => {
    if (isSyncing || !isInitialized) return;
    
    setIsSyncing(true);
    
    try {
      // In a real app, this would sync with a server
      // For now, we'll just clear pending changes to simulate a successful sync
      if (db) {
        await db.clear(STORES.PENDING_CHANGES);
        setPendingChangesCount(0);
      }
      
      addToast({
        title: 'Синхронизация завершена',
        description: 'Данные успешно синхронизированы с сервером.',
        color: 'success'
      });
    } catch (error) {
      console.error('Sync error:', error);
      
      addToast({
        title: 'Ошибка синхронизации',
        description: 'Произошла ошибка при синхронизации данных с сервером.',
        color: 'danger'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    isInitialized,
    isOnline,
    isSyncing,
    pendingChangesCount,
    
    syncData,
    
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    
    getAccessRights,
    grantAccess,
    revokeAccess,
    
    bulkImportRooms,
    bulkImportEmployees,
    bulkImportAccessRights
  }), [
    db,
    isInitialized,
    isOnline,
    isSyncing,
    pendingChangesCount
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => React.useContext(DataContext);
