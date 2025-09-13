import { Room, Employee, AccessRight } from '../types';
import { BaseStorage, PendingChange } from './storage-service';

/**
 * IndexedDB Service
 * 
 * This service provides local storage using IndexedDB for offline functionality.
 */

// Database configuration
const DB_NAME = 'KeyManagementDB';
const DB_VERSION = 1;
const STORES = {
  ROOMS: 'rooms',
  EMPLOYEES: 'employees',
  ACCESS_RIGHTS: 'accessRights',
  PENDING_CHANGES: 'pendingChanges'
};

export class IndexedDBService extends BaseStorage {
  private db: IDBDatabase | null = null;
  private connected: boolean = false;
  
  /**
   * Initialize the IndexedDB database
   */
  async connect(): Promise<boolean> {
    if (this.connected) return true;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = (event) => {
        console.error('IndexedDB connection error:', event);
        reject(new Error('Failed to connect to IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.connected = true;
        resolve(true);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
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
      };
    });
  }
  
  /**
   * Generic method to perform a transaction on an object store
   */
  private async transaction<T>(
    storeName: string, 
    mode: IDBTransactionMode, 
    callback: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) {
      await this.connect();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Add a pending change to be synced later
   */
  private async addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp'>): Promise<void> {
    const pendingChange: PendingChange = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...change
    };
    
    await this.transaction(
      STORES.PENDING_CHANGES,
      'readwrite',
      (store) => store.add(pendingChange)
    );
  }
  
  /**
   * Room operations
   */
  
  async getRooms(buildingId?: number): Promise<Room[]> {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const transaction = this.db.transaction(STORES.ROOMS, 'readonly');
      const store = transaction.objectStore(STORES.ROOMS);
      const request = buildingId 
        ? store.index('building').getAll(buildingId)
        : store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getRoomById(roomId: number): Promise<Room | null> {
    try {
      return await this.transaction(
        STORES.ROOMS,
        'readonly',
        (store) => store.get(roomId)
      );
    } catch (error) {
      console.error('Error getting room by ID:', error);
      return null;
    }
  }
  
  async createRoom(room: Omit<Room, 'id'>): Promise<Room> {
    const newRoom = await this.transaction(
      STORES.ROOMS,
      'readwrite',
      (store) => store.add(room)
    );
    
    const createdRoom = { id: newRoom as number, ...room };
    
    // Add pending change for sync
    await this.addPendingChange({
      operation: 'create',
      entityType: 'room',
      data: createdRoom
    });
    
    return createdRoom;
  }
  
  async updateRoom(room: Room): Promise<boolean> {
    try {
      await this.transaction(
        STORES.ROOMS,
        'readwrite',
        (store) => store.put(room)
      );
      
      // Add pending change for sync
      await this.addPendingChange({
        operation: 'update',
        entityType: 'room',
        data: room
      });
      
      return true;
    } catch (error) {
      console.error('Error updating room:', error);
      return false;
    }
  }
  
  async deleteRoom(roomId: number): Promise<boolean> {
    try {
      // Get the room before deleting (for sync purposes)
      const room = await this.getRoomById(roomId);
      
      await this.transaction(
        STORES.ROOMS,
        'readwrite',
        (store) => store.delete(roomId)
      );
      
      // Delete associated access rights
      const accessRights = await this.getAccessRights(roomId);
      const transaction = this.db!.transaction(STORES.ACCESS_RIGHTS, 'readwrite');
      const accessStore = transaction.objectStore(STORES.ACCESS_RIGHTS);
      
      for (const access of accessRights) {
        accessStore.delete(access.id);
      }
      
      // Add pending change for sync
      await this.addPendingChange({
        operation: 'delete',
        entityType: 'room',
        data: { id: roomId, room }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      return false;
    }
  }
  
  /**
   * Employee operations
   */
  
  async getEmployees(searchQuery?: string): Promise<Employee[]> {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const transaction = this.db.transaction(STORES.EMPLOYEES, 'readonly');
      const store = transaction.objectStore(STORES.EMPLOYEES);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let employees = request.result;
        
        // Filter by search query if provided
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          employees = employees.filter(employee => 
            `${employee.lastName} ${employee.firstName} ${employee.middleName}`.toLowerCase().includes(query) ||
            employee.employeeId.toLowerCase().includes(query)
          );
        }
        
        resolve(employees);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async getEmployeeById(employeeId: number): Promise<Employee | null> {
    try {
      return await this.transaction(
        STORES.EMPLOYEES,
        'readonly',
        (store) => store.get(employeeId)
      );
    } catch (error) {
      console.error('Error getting employee by ID:', error);
      return null;
    }
  }
  
  async createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    const newEmployeeId = await this.transaction(
      STORES.EMPLOYEES,
      'readwrite',
      (store) => store.add({
        ...employee,
        accessRooms: employee.accessRooms || []
      })
    );
    
    const createdEmployee = { 
      id: newEmployeeId as number, 
      ...employee,
      accessRooms: employee.accessRooms || []
    };
    
    // Add pending change for sync
    await this.addPendingChange({
      operation: 'create',
      entityType: 'employee',
      data: createdEmployee
    });
    
    return createdEmployee;
  }
  
  async updateEmployee(employee: Employee): Promise<boolean> {
    try {
      await this.transaction(
        STORES.EMPLOYEES,
        'readwrite',
        (store) => store.put(employee)
      );
      
      // Add pending change for sync
      await this.addPendingChange({
        operation: 'update',
        entityType: 'employee',
        data: employee
      });
      
      return true;
    } catch (error) {
      console.error('Error updating employee:', error);
      return false;
    }
  }
  
  async deleteEmployee(employeeId: number): Promise<boolean> {
    try {
      // Get the employee before deleting (for sync purposes)
      const employee = await this.getEmployeeById(employeeId);
      
      await this.transaction(
        STORES.EMPLOYEES,
        'readwrite',
        (store) => store.delete(employeeId)
      );
      
      // Delete associated access rights
      const accessRights = await this.getAccessRights(undefined, employeeId);
      const transaction = this.db!.transaction(STORES.ACCESS_RIGHTS, 'readwrite');
      const accessStore = transaction.objectStore(STORES.ACCESS_RIGHTS);
      
      for (const access of accessRights) {
        accessStore.delete(access.id);
      }
      
      // Add pending change for sync
      await this.addPendingChange({
        operation: 'delete',
        entityType: 'employee',
        data: { id: employeeId, employee }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }
  
  /**
   * Access rights operations
   */
  
  async getAccessRights(roomId?: number, employeeId?: number): Promise<AccessRight[]> {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const transaction = this.db.transaction(STORES.ACCESS_RIGHTS, 'readonly');
      const store = transaction.objectStore(STORES.ACCESS_RIGHTS);
      let request: IDBRequest;
      
      if (roomId && employeeId) {
        // Get by both room and employee
        request = store.index('unique_access').getAll([employeeId, roomId]);
      } else if (roomId) {
        // Get by room
        request = store.index('roomId').getAll(roomId);
      } else if (employeeId) {
        // Get by employee
        request = store.index('employeeId').getAll(employeeId);
      } else {
        // Get all
        request = store.getAll();
      }
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async grantAccess(employeeId: number, roomId: number): Promise<boolean> {
    try {
      // Check if access already exists
      const existingAccess = await this.getAccessRights(roomId, employeeId);
      if (existingAccess.length > 0) {
        return true; // Access already granted
      }
      
      const accessRight: Omit<AccessRight, 'id'> = {
        employeeId,
        roomId
      };
      
      const accessId = await this.transaction(
        STORES.ACCESS_RIGHTS,
        'readwrite',
        (store) => store.add(accessRight)
      );
      
      // Update employee's accessRooms array
      const employee = await this.getEmployeeById(employeeId);
      if (employee) {
        if (!employee.accessRooms.includes(roomId)) {
          employee.accessRooms.push(roomId);
          await this.updateEmployee(employee);
        }
      }
      
      // Add pending change for sync
      await this.addPendingChange({
        operation: 'grant',
        entityType: 'access',
        data: { id: accessId, employeeId, roomId }
      });
      
      return true;
    } catch (error) {
      console.error('Error granting access:', error);
      return false;
    }
  }
  
  async revokeAccess(employeeId: number, roomId: number): Promise<boolean> {
    try {
      // Find the access right
      const accessRights = await this.getAccessRights(roomId, employeeId);
      if (accessRights.length === 0) {
        return true; // No access to revoke
      }
      
      // Delete the access right
      for (const access of accessRights) {
        await this.transaction(
          STORES.ACCESS_RIGHTS,
          'readwrite',
          (store) => store.delete(access.id)
        );
      }
      
      // Update employee's accessRooms array
      const employee = await this.getEmployeeById(employeeId);
      if (employee) {
        employee.accessRooms = employee.accessRooms.filter(id => id !== roomId);
        await this.updateEmployee(employee);
      }
      
      // Add pending change for sync
      await this.addPendingChange({
        operation: 'revoke',
        entityType: 'access',
        data: { employeeId, roomId }
      });
      
      return true;
    } catch (error) {
      console.error('Error revoking access:', error);
      return false;
    }
  }
  
  /**
   * Bulk operations
   */
  
  async bulkImportRooms(rooms: Omit<Room, 'id'>[]): Promise<number> {
    if (!this.db) {
      await this.connect();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const transaction = this.db.transaction(STORES.ROOMS, 'readwrite');
      const store = transaction.objectStore(STORES.ROOMS);
      let count = 0;
      
      transaction.oncomplete = () => {
        // Add pending change for sync
        this.addPendingChange({
          operation: 'bulk',
          entityType: 'room',
          data: { rooms }
        }).then(() => resolve(count));
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      for (const room of rooms) {
        const request = store.add(room);
        request.onsuccess = () => count++;
      }
    });
  }
  
  async bulkImportEmployees(employees: Omit<Employee, 'id'>[]): Promise<number> {
    if (!this.db) {
      await this.connect();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const transaction = this.db.transaction(STORES.EMPLOYEES, 'readwrite');
      const store = transaction.objectStore(STORES.EMPLOYEES);
      let count = 0;
      
      transaction.oncomplete = () => {
        // Add pending change for sync
        this.addPendingChange({
          operation: 'bulk',
          entityType: 'employee',
          data: { employees }
        }).then(() => resolve(count));
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      for (const employee of employees) {
        const request = store.add({
          ...employee,
          accessRooms: employee.accessRooms || []
        });
        request.onsuccess = () => count++;
      }
    });
  }
  
  async bulkImportAccessRights(accessRights: AccessRight[]): Promise<number> {
    if (!this.db) {
      await this.connect();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const transaction = this.db.transaction(STORES.ACCESS_RIGHTS, 'readwrite');
      const store = transaction.objectStore(STORES.ACCESS_RIGHTS);
      let count = 0;
      
      transaction.oncomplete = () => {
        // Add pending change for sync
        this.addPendingChange({
          operation: 'bulk',
          entityType: 'access',
          data: { accessRights }
        }).then(() => resolve(count));
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      for (const access of accessRights) {
        const request = store.add(access);
        request.onsuccess = () => count++;
      }
    });
  }
  
  /**
   * Transaction support
   */
  
  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }
  
  /**
   * Get all pending changes
   */
  async getPendingChanges(): Promise<PendingChange[]> {
    if (!this.db) {
      await this.connect();
    }
    
    return this.transaction(
      STORES.PENDING_CHANGES,
      'readonly',
      (store) => store.getAll()
    );
  }
  
  /**
   * Delete a pending change
   */
  async deletePendingChange(id: string): Promise<boolean> {
    try {
      await this.transaction(
        STORES.PENDING_CHANGES,
        'readwrite',
        (store) => store.delete(id)
      );
      return true;
    } catch (error) {
      console.error('Error deleting pending change:', error);
      return false;
    }
  }
  
  /**
   * Clear all pending changes
   */
  async clearPendingChanges(): Promise<boolean> {
    try {
      await this.transaction(
        STORES.PENDING_CHANGES,
        'readwrite',
        (store) => store.clear()
      );
      return true;
    } catch (error) {
      console.error('Error clearing pending changes:', error);
      return false;
    }
  }
  
  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.connected = false;
    }
  }
}
