export interface Room {
  id: number;
  number: string;
  building: 1 | 2;
  floor: number;
}

export interface Employee {
  id: number;
  lastName: string;
  firstName: string;
  middleName: string;
  employeeId: string; // Visible only to admin
  accessRooms: number[]; // Array of room IDs
}

export interface AccessRight {
  id?: number;
  employeeId: number;
  roomId: number;
}

export enum UserRole {
  Admin = 'admin',
  OperatorBuilding1 = 'operator1',
  OperatorBuilding2 = 'operator2'
}

export interface PendingChange {
  id: string;
  timestamp: number;
  operation: 'create' | 'update' | 'delete' | 'grant' | 'revoke' | 'bulk';
  entityType: 'room' | 'employee' | 'access';
  data: any;
}

export interface DatabaseConfig {
  type: 'mysql' | 'mssql' | 'postgres';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionLimit?: number;
}
