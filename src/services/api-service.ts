import { DatabaseService, DatabaseConfig } from './database-service';
import { Room, Employee, AccessRight } from '../types';

/**
 * API Service
 * 
 * This service provides a higher-level API for the application,
 * abstracting away the database implementation details.
 */
export class ApiService {
  private dbService: DatabaseService;
  private static instance: ApiService;
  
  private constructor(config: DatabaseConfig) {
    this.dbService = new DatabaseService(config);
  }
  
  /**
   * Get singleton instance of ApiService
   */
  public static getInstance(config?: DatabaseConfig): ApiService {
    if (!ApiService.instance && config) {
      ApiService.instance = new ApiService(config);
    } else if (!ApiService.instance) {
      throw new Error('ApiService must be initialized with config first');
    }
    return ApiService.instance;
  }
  
  /**
   * Initialize the API service and connect to the database
   */
  public async initialize(): Promise<boolean> {
    return this.dbService.connect();
  }
  
  /**
   * Room operations
   */
  
  public async getRooms(buildingId?: number): Promise<Room[]> {
    return this.dbService.getRooms(buildingId);
  }
  
  public async getRoomById(roomId: number): Promise<Room | null> {
    return this.dbService.getRoomById(roomId);
  }
  
  public async createRoom(room: Omit<Room, 'id'>): Promise<Room> {
    return this.dbService.createRoom(room);
  }
  
  public async updateRoom(room: Room): Promise<boolean> {
    return this.dbService.updateRoom(room);
  }
  
  public async deleteRoom(roomId: number): Promise<boolean> {
    return this.dbService.deleteRoom(roomId);
  }
  
  /**
   * Employee operations
   */
  
  public async getEmployees(searchQuery?: string): Promise<Employee[]> {
    return this.dbService.getEmployees(searchQuery);
  }
  
  public async getEmployeeById(employeeId: number): Promise<Employee | null> {
    return this.dbService.getEmployeeById(employeeId);
  }
  
  public async createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    return this.dbService.createEmployee(employee);
  }
  
  public async updateEmployee(employee: Employee): Promise<boolean> {
    return this.dbService.updateEmployee(employee);
  }
  
  public async deleteEmployee(employeeId: number): Promise<boolean> {
    return this.dbService.deleteEmployee(employeeId);
  }
  
  /**
   * Access rights operations
   */
  
  public async getEmployeesWithAccessToRoom(roomId: number): Promise<Employee[]> {
    const accessRights = await this.dbService.getAccessRights(roomId);
    const employeeIds = accessRights.map(right => right.employeeId);
    
    // In a real implementation, we would use a JOIN query instead of separate queries
    const employees: Employee[] = [];
    for (const id of employeeIds) {
      const employee = await this.dbService.getEmployeeById(id);
      if (employee) employees.push(employee);
    }
    
    return employees;
  }
  
  public async getRoomsAccessibleByEmployee(employeeId: number): Promise<Room[]> {
    const accessRights = await this.dbService.getAccessRights(undefined, employeeId);
    const roomIds = accessRights.map(right => right.roomId);
    
    // In a real implementation, we would use a JOIN query instead of separate queries
    const rooms: Room[] = [];
    for (const id of roomIds) {
      const room = await this.dbService.getRoomById(id);
      if (room) rooms.push(room);
    }
    
    return rooms;
  }
  
  public async grantAccess(employeeId: number, roomId: number): Promise<boolean> {
    return this.dbService.grantAccess(employeeId, roomId);
  }
  
  public async revokeAccess(employeeId: number, roomId: number): Promise<boolean> {
    return this.dbService.revokeAccess(employeeId, roomId);
  }
  
  /**
   * Bulk operations for import/export
   */
  
  public async importRooms(rooms: Omit<Room, 'id'>[]): Promise<number> {
    return this.dbService.bulkImportRooms(rooms);
  }
  
  public async importEmployees(employees: Omit<Employee, 'id'>[]): Promise<number> {
    return this.dbService.bulkImportEmployees(employees);
  }
  
  public async importAccessRights(accessRights: AccessRight[]): Promise<number> {
    return this.dbService.bulkImportAccessRights(accessRights);
  }
  
  /**
   * Complex operations that require transactions
   */
  
  public async updateRoomWithAccess(
    room: Room, 
    employeeIdsWithAccess: number[]
  ): Promise<boolean> {
    return this.dbService.withTransaction(async () => {
      // 1. Update room details
      await this.dbService.updateRoom(room);
      
      // 2. Get current access rights
      const currentAccessRights = await this.dbService.getAccessRights(room.id);
      const currentEmployeeIds = currentAccessRights.map(right => right.employeeId);
      
      // 3. Determine which access rights to add and which to remove
      const toAdd = employeeIdsWithAccess.filter(id => !currentEmployeeIds.includes(id));
      const toRemove = currentEmployeeIds.filter(id => !employeeIdsWithAccess.includes(id));
      
      // 4. Add new access rights
      for (const employeeId of toAdd) {
        await this.dbService.grantAccess(employeeId, room.id);
      }
      
      // 5. Remove revoked access rights
      for (const employeeId of toRemove) {
        await this.dbService.revokeAccess(employeeId, room.id);
      }
      
      return true;
    });
  }
  
  public async updateEmployeeWithAccess(
    employee: Employee, 
    roomIdsWithAccess: number[]
  ): Promise<boolean> {
    return this.dbService.withTransaction(async () => {
      // 1. Update employee details
      await this.dbService.updateEmployee(employee);
      
      // 2. Get current access rights
      const currentAccessRights = await this.dbService.getAccessRights(undefined, employee.id);
      const currentRoomIds = currentAccessRights.map(right => right.roomId);
      
      // 3. Determine which access rights to add and which to remove
      const toAdd = roomIdsWithAccess.filter(id => !currentRoomIds.includes(id));
      const toRemove = currentRoomIds.filter(id => !roomIdsWithAccess.includes(id));
      
      // 4. Add new access rights
      for (const roomId of toAdd) {
        await this.dbService.grantAccess(employee.id, roomId);
      }
      
      // 5. Remove revoked access rights
      for (const roomId of toRemove) {
        await this.dbService.revokeAccess(employee.id, roomId);
      }
      
      return true;
    });
  }
  
  /**
   * Close the API service and disconnect from the database
   */
  public async shutdown(): Promise<void> {
    await this.dbService.disconnect();
  }
}

// Example usage:
// const apiService = ApiService.getInstance({
//   type: 'mysql',
//   host: 'localhost',
//   port: 3306,
//   database: 'key_management',
//   username: 'admin',
//   password: 'secure_password'
// });
// 
// await apiService.initialize();
// const rooms = await apiService.getRooms(1); // Get rooms in building 1
