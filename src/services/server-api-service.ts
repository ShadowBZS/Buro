import { DatabaseConfig } from './database-service';
import { BaseStorage } from './storage-service';
import { Room, Employee, AccessRight } from '../types';

/**
 * Server API Service
 * 
 * This service communicates with the server API when online.
 */
export class ServerApiService extends BaseStorage {
  private baseUrl: string;
  private apiKey?: string;
  private useMockData: boolean = true; // Set to true to use mock data instead of real API calls
  
  constructor(config: DatabaseConfig) {
    super();
    this.baseUrl = `http://${config.host}:${config.port}/api`;
    // In a real app, you would handle authentication properly
    this.apiKey = btoa(`${config.username}:${config.password}`);
    
    // Check if we're in development mode
    this.useMockData = import.meta.env.DEV || !navigator.onLine;
  }
  
  /**
   * Check if we're online
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }
  
  /**
   * Make an API request
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    // Use mock data in development mode or when offline
    if (this.useMockData) {
      return this.getMockResponse<T>(endpoint, method, data);
    }
    
    // Check if we're online first
    if (!this.isOnline()) {
      throw new Error('Cannot make API request while offline');
    }
    
    const url = `${this.baseUrl}/${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${this.apiKey}`
    };
    
    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      // Use a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      options.signal = controller.signal;
      
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('API request timed out');
        throw new Error('API request timed out');
      }
      
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Generate mock responses for development and testing
   */
  private async getMockResponse<T>(endpoint: string, method: string, data?: any): Promise<T> {
    console.log(`[MOCK API] ${method} ${endpoint}`, data);
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock data based on endpoint and method
      if (endpoint.startsWith('rooms')) {
        if (method === 'GET') {
          return this.getMockRooms(endpoint) as unknown as T;
        } else if (method === 'POST') {
          return this.createMockRoom(data) as unknown as T;
        } else if (method === 'PUT') {
          return true as unknown as T;
        } else if (method === 'DELETE') {
          return true as unknown as T;
        }
      } else if (endpoint.startsWith('employees')) {
        if (method === 'GET') {
          return this.getMockEmployees(endpoint) as unknown as T;
        } else if (method === 'POST') {
          return this.createMockEmployee(data) as unknown as T;
        } else if (method === 'PUT') {
          return true as unknown as T;
        } else if (method === 'DELETE') {
          return true as unknown as T;
        }
      } else if (endpoint.startsWith('access')) {
        if (method === 'GET') {
          return this.getMockAccessRights(endpoint) as unknown as T;
        } else if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          return true as unknown as T;
        }
      } else if (endpoint.includes('bulk')) {
        // Handle bulk operations
        return { count: 5 } as unknown as T;
      }
      
      // Default empty response
      return [] as unknown as T;
    } catch (error) {
      console.error(`[MOCK API] Error in mock response for ${method} ${endpoint}:`, error);
      // Return empty data instead of throwing to prevent sync errors
      if (endpoint.includes('bulk')) {
        return { count: 0 } as unknown as T;
      }
      return [] as unknown as T;
    }
  }
  
  /**
   * Mock room data
   */
  private getMockRooms(endpoint: string): Room[] {
    const mockRooms: Room[] = [
      { id: 1, number: '101', building: 1, floor: 1 },
      { id: 2, number: '102', building: 1, floor: 1 },
      { id: 3, number: '201', building: 1, floor: 2 },
      { id: 4, number: '202', building: 1, floor: 2 },
      { id: 5, number: '101', building: 2, floor: 1 },
      { id: 6, number: '102', building: 2, floor: 1 },
    ];
    
    // Filter by building if specified
    if (endpoint.includes('building=')) {
      const buildingId = parseInt(endpoint.split('building=')[1]);
      return mockRooms.filter(room => room.building === buildingId);
    }
    
    // Get single room if ID is specified
    if (endpoint.match(/rooms\/\d+$/)) {
      const roomId = parseInt(endpoint.split('/').pop() || '0');
      const room = mockRooms.find(r => r.id === roomId);
      return room ? [room] : [];
    }
    
    return mockRooms;
  }
  
  /**
   * Mock employee data
   */
  private getMockEmployees(endpoint: string): Employee[] {
    const mockEmployees: Employee[] = [
      { id: 1, lastName: 'Иванов', firstName: 'Иван', middleName: 'Иванович', employeeId: 'EMP001', accessRooms: [1, 2] },
      { id: 2, lastName: 'Петров', firstName: 'Петр', middleName: 'Петрович', employeeId: 'EMP002', accessRooms: [1, 3] },
      { id: 3, lastName: 'Сидорова', firstName: 'Мария', middleName: 'Александровна', employeeId: 'EMP003', accessRooms: [2, 5] },
    ];
    
    // Search by query if specified
    if (endpoint.includes('search=')) {
      const query = decodeURIComponent(endpoint.split('search=')[1]).toLowerCase();
      return mockEmployees.filter(emp => 
        `${emp.lastName} ${emp.firstName} ${emp.middleName}`.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query)
      );
    }
    
    // Get single employee if ID is specified
    if (endpoint.match(/employees\/\d+$/)) {
      const empId = parseInt(endpoint.split('/').pop() || '0');
      const employee = mockEmployees.find(e => e.id === empId);
      return employee ? [employee] : [];
    }
    
    return mockEmployees;
  }
  
  /**
   * Mock access rights data
   */
  private getMockAccessRights(endpoint: string): AccessRight[] {
    const mockAccessRights: AccessRight[] = [
      { id: 1, employeeId: 1, roomId: 1 },
      { id: 2, employeeId: 1, roomId: 2 },
      { id: 3, employeeId: 2, roomId: 1 },
      { id: 4, employeeId: 2, roomId: 3 },
      { id: 5, employeeId: 3, roomId: 2 },
      { id: 6, employeeId: 3, roomId: 5 },
    ];
    
    // Filter by room ID if specified
    if (endpoint.includes('roomId=')) {
      const roomId = parseInt(endpoint.split('roomId=')[1].split('&')[0]);
      return mockAccessRights.filter(access => access.roomId === roomId);
    }
    
    // Filter by employee ID if specified
    if (endpoint.includes('employeeId=')) {
      const employeeId = parseInt(endpoint.split('employeeId=')[1].split('&')[0]);
      return mockAccessRights.filter(access => access.employeeId === employeeId);
    }
    
    return mockAccessRights;
  }
  
  /**
   * Create mock room
   */
  private createMockRoom(data: Omit<Room, 'id'>): Room {
    return {
      id: Math.floor(Math.random() * 1000) + 100,
      ...data
    };
  }
  
  /**
   * Create mock employee
   */
  private createMockEmployee(data: Omit<Employee, 'id'>): Employee {
    return {
      id: Math.floor(Math.random() * 1000) + 100,
      ...data,
      accessRooms: data.accessRooms || []
    };
  }
  
  /**
   * Room operations
   */
  
  async getRooms(buildingId?: number): Promise<Room[]> {
    const endpoint = buildingId ? `rooms?building=${buildingId}` : 'rooms';
    return this.apiRequest<Room[]>(endpoint);
  }
  
  async getRoomById(roomId: number): Promise<Room | null> {
    try {
      return await this.apiRequest<Room>(`rooms/${roomId}`);
    } catch (error) {
      console.error('Error getting room by ID:', error);
      return null;
    }
  }
  
  async createRoom(room: Omit<Room, 'id'>): Promise<Room> {
    return this.apiRequest<Room>('rooms', 'POST', room);
  }
  
  async updateRoom(room: Room): Promise<boolean> {
    try {
      await this.apiRequest<Room>(`rooms/${room.id}`, 'PUT', room);
      return true;
    } catch (error) {
      console.error('Error updating room:', error);
      return false;
    }
  }
  
  async deleteRoom(roomId: number): Promise<boolean> {
    try {
      await this.apiRequest(`rooms/${roomId}`, 'DELETE');
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
    const endpoint = searchQuery ? `employees?search=${encodeURIComponent(searchQuery)}` : 'employees';
    return this.apiRequest<Employee[]>(endpoint);
  }
  
  async getEmployeeById(employeeId: number): Promise<Employee | null> {
    try {
      return await this.apiRequest<Employee>(`employees/${employeeId}`);
    } catch (error) {
      console.error('Error getting employee by ID:', error);
      return null;
    }
  }
  
  async createEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    return this.apiRequest<Employee>('employees', 'POST', employee);
  }
  
  async updateEmployee(employee: Employee): Promise<boolean> {
    try {
      await this.apiRequest<Employee>(`employees/${employee.id}`, 'PUT', employee);
      return true;
    } catch (error) {
      console.error('Error updating employee:', error);
      return false;
    }
  }
  
  async deleteEmployee(employeeId: number): Promise<boolean> {
    try {
      await this.apiRequest(`employees/${employeeId}`, 'DELETE');
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
    let endpoint = 'access';
    
    if (roomId && employeeId) {
      endpoint += `?roomId=${roomId}&employeeId=${employeeId}`;
    } else if (roomId) {
      endpoint += `?roomId=${roomId}`;
    } else if (employeeId) {
      endpoint += `?employeeId=${employeeId}`;
    }
    
    return this.apiRequest<AccessRight[]>(endpoint);
  }
  
  async grantAccess(employeeId: number, roomId: number): Promise<boolean> {
    try {
      await this.apiRequest('access', 'POST', { employeeId, roomId });
      return true;
    } catch (error) {
      console.error('Error granting access:', error);
      return false;
    }
  }
  
  async revokeAccess(employeeId: number, roomId: number): Promise<boolean> {
    try {
      await this.apiRequest(`access?employeeId=${employeeId}&roomId=${roomId}`, 'DELETE');
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
    try {
      const result = await this.apiRequest<{ count: number }>('rooms/bulk', 'POST', { rooms });
      return result.count;
    } catch (error) {
      console.error('Error bulk importing rooms:', error);
      return 0;
    }
  }
  
  async bulkImportEmployees(employees: Omit<Employee, 'id'>[]): Promise<number> {
    try {
      const result = await this.apiRequest<{ count: number }>('employees/bulk', 'POST', { employees });
      return result.count;
    } catch (error) {
      console.error('Error bulk importing employees:', error);
      return 0;
    }
  }
  
  async bulkImportAccessRights(accessRights: AccessRight[]): Promise<number> {
    try {
      const result = await this.apiRequest<{ count: number }>('access/bulk', 'POST', { accessRights });
      return result.count;
    } catch (error) {
      console.error('Error bulk importing access rights:', error);
      return 0;
    }
  }
  
  /**
   * Transaction support
   */
  
  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    // Server handles transactions, so we just execute the callback
    return callback();
  }
}
