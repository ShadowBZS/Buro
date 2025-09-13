import React from 'react';
import { IndexedDBService } from '../services/indexed-db-service';
import { SyncService } from '../services/sync-service';
import { useNetworkStatus } from './use-network-status';
import { databaseConfig } from '../config/database-config';
import { Room, Employee, AccessRight } from '../types';
import { addToast } from '@heroui/react';

// Create singleton instances
const localDb = new IndexedDBService();
const syncService = new SyncService(databaseConfig);

/**
 * Hook to provide data access with offline support
 */
export const useDataService = () => {
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [pendingChangesCount, setPendingChangesCount] = React.useState<number>(0);
  const { isOnline, lastChange: networkStatusChanged } = useNetworkStatus();
  
  // Initialize services
  React.useEffect(() => {
    const initialize = async () => {
      try {
        await localDb.connect();
        await syncService.initialize();
        setIsInitialized(true);
        
        // Update pending changes count
        const count = await syncService.getPendingChangesCount();
        setPendingChangesCount(count);
        
        // Seed initial data if database is empty
        const rooms = await localDb.getRooms();
        if (rooms.length === 0) {
          console.log('Seeding initial data...');
          await seedInitialData();
        }
      } catch (error) {
        console.error('Failed to initialize data services:', error);
        // Even if initialization fails, we can still work with local data
        setIsInitialized(true);
        
        addToast({
          title: 'Предупреждение',
          description: 'Приложение работает в автономном режиме. Синхронизация будет выполнена при восстановлении подключения.',
          color: 'warning'
        });
      }
    };
    
    initialize();
  }, []);
  
  /**
   * Seed initial data for demo purposes
   */
  const seedInitialData = async () => {
    try {
      // Seed rooms
      const rooms = [
        { number: '101', building: 1, floor: 1 },
        { number: '102', building: 1, floor: 1 },
        { number: '103', building: 1, floor: 1 },
        { number: '201', building: 1, floor: 2 },
        { number: '202', building: 1, floor: 2 },
        { number: '301', building: 1, floor: 3 },
        { number: '302', building: 1, floor: 3 },
        { number: '101', building: 2, floor: 1 },
        { number: '102', building: 2, floor: 1 },
        { number: '201', building: 2, floor: 2 },
        { number: '202', building: 2, floor: 2 },
        { number: '301', building: 2, floor: 3 },
      ];
      
      // Seed employees
      const employees = [
        { 
          lastName: 'Иванов', 
          firstName: 'Иван', 
          middleName: 'Иванович', 
          employeeId: 'EMP001', 
          accessRooms: [] 
        },
        { 
          lastName: 'Петров', 
          firstName: 'Петр', 
          middleName: 'Петрович', 
          employeeId: 'EMP002', 
          accessRooms: [] 
        },
        { 
          lastName: 'Сидорова', 
          firstName: 'Мария', 
          middleName: 'Александровна', 
          employeeId: 'EMP003', 
          accessRooms: [] 
        },
        { 
          lastName: 'Кузнецов', 
          firstName: 'Алексей', 
          middleName: 'Дмитриевич', 
          employeeId: 'EMP004', 
          accessRooms: [] 
        },
        { 
          lastName: 'Смирнова', 
          firstName: 'Елена', 
          middleName: 'Сергеевна', 
          employeeId: 'EMP005', 
          accessRooms: [] 
        }
      ];
      
      // Import rooms and employees
      await localDb.bulkImportRooms(rooms);
      await localDb.bulkImportEmployees(employees);
      
      // Get the imported rooms and employees
      const importedRooms = await localDb.getRooms();
      const importedEmployees = await localDb.getEmployees();
      
      // Set up access rights
      const accessMapping = [
        { employeeIndex: 0, roomIndices: [0, 1, 3, 7] },
        { employeeIndex: 1, roomIndices: [0, 2, 4, 8] },
        { employeeIndex: 2, roomIndices: [1, 5, 9] },
        { employeeIndex: 3, roomIndices: [2, 6, 10] },
        { employeeIndex: 4, roomIndices: [0, 3, 6, 11] }
      ];
      
      // Grant access
      for (const mapping of accessMapping) {
        const employee = importedEmployees[mapping.employeeIndex];
        for (const roomIndex of mapping.roomIndices) {
          const room = importedRooms[roomIndex];
          if (employee && room) {
            await localDb.grantAccess(employee.id, room.id);
          }
        }
      }
      
      console.log('Initial data seeded successfully');
    } catch (error) {
      console.error('Error seeding initial data:', error);
    }
  };
  
  // Sync when network status changes to online
  React.useEffect(() => {
    if (isInitialized && isOnline) {
      // Add a small delay to ensure network is stable
      const timer = setTimeout(() => {
        syncData();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized, isOnline, networkStatusChanged]);
  
  // Periodically check for pending changes
  React.useEffect(() => {
    if (!isInitialized) return;
    
    const checkPendingChanges = async () => {
      const count = await syncService.getPendingChangesCount();
      setPendingChangesCount(count);
    };
    
    const interval = setInterval(checkPendingChanges, 5000);
    return () => clearInterval(interval);
  }, [isInitialized]);
  
  // Sync data with server
  const syncData = async () => {
    if (!isOnline || isSyncing || !isInitialized) return;
    
    setIsSyncing(true);
    
    try {
      // Use a more defensive approach to sync
      let success = false;
      
      try {
        // First try to sync to server (local changes)
        const toServerResult = await syncService.syncToServer().catch(err => {
          console.error('Error syncing to server:', err);
          return false;
        });
        
        // Then try to sync from server (remote changes)
        const fromServerResult = await syncService.syncFromServer().catch(err => {
          console.error('Error syncing from server:', err);
          return false;
        });
        
        success = toServerResult || fromServerResult;
      } catch (error) {
        console.error('Error during sync:', error);
        success = false;
      }
      
      if (success) {
        addToast({
          title: 'Синхронизация завершена',
          description: 'Данные успешно синхронизированы с сервером.',
          color: 'success'
        });
      } else {
        // Don't show error toast if we're offline - that's expected
        if (navigator.onLine) {
          addToast({
            title: 'Предупреждение',
            description: 'Не удалось синхронизировать некоторые данные с сервером.',
            color: 'warning'
          });
        }
      }
      
      // Update pending changes count - do this regardless of sync success
      try {
        const count = await syncService.getPendingChangesCount();
        setPendingChangesCount(count);
      } catch (error) {
        console.error('Error getting pending changes count:', error);
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      // Only show error toast if we're online - offline errors are expected
      if (navigator.onLine) {
        addToast({
          title: 'Ошибка синхронизации',
          description: 'Произошла ошибка при синхронизации данных с сервером.',
          color: 'danger'
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Room operations
  const getRooms = React.useCallback(async (buildingId?: number): Promise<Room[]> => {
    return localDb.getRooms(buildingId);
  }, []);
  
  const getRoomById = React.useCallback(async (roomId: number): Promise<Room | null> => {
    return localDb.getRoomById(roomId);
  }, []);
  
  const createRoom = React.useCallback(async (room: Omit<Room, 'id'>): Promise<Room> => {
    const result = await localDb.createRoom(room);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  const updateRoom = React.useCallback(async (room: Room): Promise<boolean> => {
    const result = await localDb.updateRoom(room);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  const deleteRoom = React.useCallback(async (roomId: number): Promise<boolean> => {
    const result = await localDb.deleteRoom(roomId);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  // Employee operations
  const getEmployees = React.useCallback(async (searchQuery?: string): Promise<Employee[]> => {
    return localDb.getEmployees(searchQuery);
  }, []);
  
  const getEmployeeById = React.useCallback(async (employeeId: number): Promise<Employee | null> => {
    return localDb.getEmployeeById(employeeId);
  }, []);
  
  const createEmployee = React.useCallback(async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
    const result = await localDb.createEmployee(employee);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  const updateEmployee = React.useCallback(async (employee: Employee): Promise<boolean> => {
    const result = await localDb.updateEmployee(employee);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  const deleteEmployee = React.useCallback(async (employeeId: number): Promise<boolean> => {
    const result = await localDb.deleteEmployee(employeeId);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  // Access rights operations
  const getAccessRights = React.useCallback(async (roomId?: number, employeeId?: number): Promise<AccessRight[]> => {
    return localDb.getAccessRights(roomId, employeeId);
  }, []);
  
  const grantAccess = React.useCallback(async (employeeId: number, roomId: number): Promise<boolean> => {
    const result = await localDb.grantAccess(employeeId, roomId);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  const revokeAccess = React.useCallback(async (employeeId: number, roomId: number): Promise<boolean> => {
    const result = await localDb.revokeAccess(employeeId, roomId);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  // Bulk operations
  const bulkImportRooms = React.useCallback(async (rooms: Omit<Room, 'id'>[]): Promise<number> => {
    const result = await localDb.bulkImportRooms(rooms);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  const bulkImportEmployees = React.useCallback(async (employees: Omit<Employee, 'id'>[]): Promise<number> => {
    const result = await localDb.bulkImportEmployees(employees);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  const bulkImportAccessRights = React.useCallback(async (accessRights: AccessRight[]): Promise<number> => {
    const result = await localDb.bulkImportAccessRights(accessRights);
    
    // Update pending changes count
    const count = await syncService.getPendingChangesCount();
    setPendingChangesCount(count);
    
    // Try to sync if online
    if (isOnline) {
      syncData();
    }
    
    return result;
  }, [isOnline]);
  
  return {
    // Status
    isInitialized,
    isOnline,
    isSyncing,
    pendingChangesCount,
    
    // Actions
    syncData,
    
    // Room operations
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    
    // Employee operations
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    
    // Access rights operations
    getAccessRights,
    grantAccess,
    revokeAccess,
    
    // Bulk operations
    bulkImportRooms,
    bulkImportEmployees,
    bulkImportAccessRights
  };
};
