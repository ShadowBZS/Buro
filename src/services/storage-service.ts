import { Room, Employee, AccessRight } from '../types';

/**
 * Storage Service
 * 
 * This service provides a unified interface for data storage,
 * supporting both IndexedDB (for offline mode) and server API (when online).
 */

// Interface for storage operations
export interface StorageInterface {
  // Room operations
  getRooms(buildingId?: number): Promise<Room[]>;
  getRoomById(roomId: number): Promise<Room | null>;
  createRoom(room: Omit<Room, 'id'>): Promise<Room>;
  updateRoom(room: Room): Promise<boolean>;
  deleteRoom(roomId: number): Promise<boolean>;
  
  // Employee operations
  getEmployees(searchQuery?: string): Promise<Employee[]>;
  getEmployeeById(employeeId: number): Promise<Employee | null>;
  createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee>;
  updateEmployee(employee: Employee): Promise<boolean>;
  deleteEmployee(employeeId: number): Promise<boolean>;
  
  // Access rights operations
  getAccessRights(roomId?: number, employeeId?: number): Promise<AccessRight[]>;
  grantAccess(employeeId: number, roomId: number): Promise<boolean>;
  revokeAccess(employeeId: number, roomId: number): Promise<boolean>;
  
  // Bulk operations
  bulkImportRooms(rooms: Omit<Room, 'id'>[]): Promise<number>;
  bulkImportEmployees(employees: Omit<Employee, 'id'>[]): Promise<number>;
  bulkImportAccessRights(accessRights: AccessRight[]): Promise<number>;
  
  // Transaction support
  withTransaction<T>(callback: () => Promise<T>): Promise<T>;
}

// Type for pending changes to be synced
export interface PendingChange {
  id: string; // Unique ID for the change
  timestamp: number; // When the change was made
  operation: 'create' | 'update' | 'delete' | 'grant' | 'revoke' | 'bulk';
  entityType: 'room' | 'employee' | 'access';
  data: any; // The data associated with the change
}

// Base class for storage implementations
export abstract class BaseStorage implements StorageInterface {
  abstract getRooms(buildingId?: number): Promise<Room[]>;
  abstract getRoomById(roomId: number): Promise<Room | null>;
  abstract createRoom(room: Omit<Room, 'id'>): Promise<Room>;
  abstract updateRoom(room: Room): Promise<boolean>;
  abstract deleteRoom(roomId: number): Promise<boolean>;
  
  abstract getEmployees(searchQuery?: string): Promise<Employee[]>;
  abstract getEmployeeById(employeeId: number): Promise<Employee | null>;
  abstract createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee>;
  abstract updateEmployee(employee: Employee): Promise<boolean>;
  abstract deleteEmployee(employeeId: number): Promise<boolean>;
  
  abstract getAccessRights(roomId?: number, employeeId?: number): Promise<AccessRight[]>;
  abstract grantAccess(employeeId: number, roomId: number): Promise<boolean>;
  abstract revokeAccess(employeeId: number, roomId: number): Promise<boolean>;
  
  abstract bulkImportRooms(rooms: Omit<Room, 'id'>[]): Promise<number>;
  abstract bulkImportEmployees(employees: Omit<Employee, 'id'>[]): Promise<number>;
  abstract bulkImportAccessRights(accessRights: AccessRight[]): Promise<number>;
  
  abstract withTransaction<T>(callback: () => Promise<T>): Promise<T>;
}
