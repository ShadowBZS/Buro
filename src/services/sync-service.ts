import { IndexedDBService } from './indexed-db-service';
import { ServerApiService } from './server-api-service';
import { PendingChange } from './storage-service';
import { DatabaseConfig } from './database-service';

/**
 * Sync Service
 * 
 * This service handles synchronization between local IndexedDB and server API.
 */
export class SyncService {
  private localDb: IndexedDBService;
  private serverApi: ServerApiService;
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;
  
  constructor(config: DatabaseConfig) {
    this.localDb = new IndexedDBService();
    this.serverApi = new ServerApiService(config);
  }
  
  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    try {
      await this.localDb.connect();
      
      // Load last sync time from localStorage
      const lastSync = localStorage.getItem('lastSyncTime');
      if (lastSync) {
        this.lastSyncTime = parseInt(lastSync, 10);
      }
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      // Continue without failing - we can still work offline
    }
  }
  
  /**
   * Check if we're online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
  
  /**
   * Sync pending changes to the server
   */
  async syncToServer(): Promise<boolean> {
    if (!this.isOnline() || this.isSyncing) {
      return false;
    }
    
    this.isSyncing = true;
    
    try {
      // Get all pending changes
      const pendingChanges = await this.localDb.getPendingChanges();
      
      if (pendingChanges.length === 0) {
        this.isSyncing = false;
        return true;
      }
      
      console.log(`Syncing ${pendingChanges.length} pending changes to server...`);
      
      // Sort changes by timestamp
      pendingChanges.sort((a, b) => a.timestamp - b.timestamp);
      
      // Process each change
      for (const change of pendingChanges) {
        try {
          await this.processChange(change);
          await this.localDb.deletePendingChange(change.id);
        } catch (error) {
          console.error(`Failed to process change ${change.id}:`, error);
          // Continue with other changes
          continue;
        }
      }
      
      // Update last sync time
      this.lastSyncTime = Date.now();
      localStorage.setItem('lastSyncTime', this.lastSyncTime.toString());
      
      this.isSyncing = false;
      return true;
    } catch (error) {
      console.error('Sync error:', error);
      this.isSyncing = false;
      return false;
    }
  }
  
  /**
   * Process a single pending change
   */
  private async processChange(change: PendingChange): Promise<void> {
    try {
      switch (change.operation) {
        case 'create':
          if (change.entityType === 'room') {
            await this.serverApi.createRoom(change.data);
          } else if (change.entityType === 'employee') {
            await this.serverApi.createEmployee(change.data);
          }
          break;
          
        case 'update':
          if (change.entityType === 'room') {
            await this.serverApi.updateRoom(change.data);
          } else if (change.entityType === 'employee') {
            await this.serverApi.updateEmployee(change.data);
          }
          break;
          
        case 'delete':
          if (change.entityType === 'room') {
            await this.serverApi.deleteRoom(change.data.id);
          } else if (change.entityType === 'employee') {
            await this.serverApi.deleteEmployee(change.data.id);
          }
          break;
          
        case 'grant':
          if (change.entityType === 'access') {
            await this.serverApi.grantAccess(change.data.employeeId, change.data.roomId);
          }
          break;
          
        case 'revoke':
          if (change.entityType === 'access') {
            await this.serverApi.revokeAccess(change.data.employeeId, change.data.roomId);
          }
          break;
          
        case 'bulk':
          if (change.entityType === 'room') {
            await this.serverApi.bulkImportRooms(change.data.rooms);
          } else if (change.entityType === 'employee') {
            await this.serverApi.bulkImportEmployees(change.data.employees);
          } else if (change.entityType === 'access') {
            await this.serverApi.bulkImportAccessRights(change.data.accessRights);
          }
          break;
      }
    } catch (error) {
      console.error(`Error processing change ${change.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Sync data from server to local database
   */
  async syncFromServer(): Promise<boolean> {
    if (!this.isOnline() || this.isSyncing) {
      return false;
    }
    
    this.isSyncing = true;
    
    try {
      // Fetch all data from server with individual try/catch blocks
      let rooms: Room[] = [];
      let employees: Employee[] = [];
      let accessRights: AccessRight[] = [];
      
      try {
        const roomsResponse = await this.serverApi.getRooms();
        if (Array.isArray(roomsResponse)) {
          rooms = roomsResponse;
          console.log(`Fetched ${rooms.length} rooms from server`);
        } else {
          console.warn('Server returned invalid rooms data format');
        }
      } catch (error) {
        console.error('Error fetching rooms from server:', error);
        // Continue with other data fetching
      }
      
      try {
        const employeesResponse = await this.serverApi.getEmployees();
        if (Array.isArray(employeesResponse)) {
          employees = employeesResponse;
          console.log(`Fetched ${employees.length} employees from server`);
        } else {
          console.warn('Server returned invalid employees data format');
        }
      } catch (error) {
        console.error('Error fetching employees from server:', error);
        // Continue with other data fetching
      }
      
      try {
        const accessRightsResponse = await this.serverApi.getAccessRights();
        if (Array.isArray(accessRightsResponse)) {
          accessRights = accessRightsResponse;
          console.log(`Fetched ${accessRights.length} access rights from server`);
        } else {
          console.warn('Server returned invalid access rights data format');
        }
      } catch (error) {
        console.error('Error fetching access rights from server:', error);
        // Continue with other data fetching
      }
      
      // Only update local database if we got valid data
      if (rooms.length > 0) {
        try {
          await this.localDb.bulkImportRooms(rooms);
          console.log(`Imported ${rooms.length} rooms to local database`);
        } catch (error) {
          console.error('Error importing rooms to local database:', error);
        }
      }
      
      if (employees.length > 0) {
        try {
          await this.localDb.bulkImportEmployees(employees);
          console.log(`Imported ${employees.length} employees to local database`);
        } catch (error) {
          console.error('Error importing employees to local database:', error);
        }
      }
      
      if (accessRights.length > 0) {
        try {
          await this.localDb.bulkImportAccessRights(accessRights);
          console.log(`Imported ${accessRights.length} access rights to local database`);
        } catch (error) {
          console.error('Error importing access rights to local database:', error);
        }
      }
      
      // Update last sync time only if at least one data type was synced
      if (rooms.length > 0 || employees.length > 0 || accessRights.length > 0) {
        this.lastSyncTime = Date.now();
        localStorage.setItem('lastSyncTime', this.lastSyncTime.toString());
      }
      
      this.isSyncing = false;
      return true;
    } catch (error) {
      console.error('Sync from server error:', error);
      this.isSyncing = false;
      return false;
    } finally {
      // Ensure isSyncing is reset even if an error occurs
      this.isSyncing = false;
    }
  }
  
  /**
   * Perform a full sync (both directions)
   */
  async fullSync(): Promise<boolean> {
    if (!this.isOnline()) {
      return false;
    }
    
    try {
      // First sync local changes to server
      let toServerResult = false;
      try {
        toServerResult = await this.syncToServer();
      } catch (error) {
        console.error('Error syncing to server:', error);
        // Continue with from server sync even if to server sync fails
      }
      
      // Then sync server changes to local
      let fromServerResult = false;
      try {
        fromServerResult = await this.syncFromServer();
      } catch (error) {
        console.error('Error syncing from server:', error);
      }
      
      return toServerResult || fromServerResult;
    } catch (error) {
      console.error('Full sync error:', error);
      return false;
    }
  }
  
  /**
   * Get the last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }
  
  /**
   * Check if there are pending changes
   */
  async hasPendingChanges(): Promise<boolean> {
    const pendingChanges = await this.localDb.getPendingChanges();
    return pendingChanges.length > 0;
  }
  
  /**
   * Get the number of pending changes
   */
  async getPendingChangesCount(): Promise<number> {
    const pendingChanges = await this.localDb.getPendingChanges();
    return pendingChanges.length;
  }
}
