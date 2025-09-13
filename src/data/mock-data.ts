import { Room, Employee } from '../types';

// Mock rooms data
export const mockRooms: Room[] = [
  { id: 1, number: '101', building: 1, floor: 1 },
  { id: 2, number: '102', building: 1, floor: 1 },
  { id: 3, number: '103', building: 1, floor: 1 },
  { id: 4, number: '201', building: 1, floor: 2 },
  { id: 5, number: '202', building: 1, floor: 2 },
  { id: 6, number: '301', building: 1, floor: 3 },
  { id: 7, number: '302', building: 1, floor: 3 },
  { id: 8, number: '101', building: 2, floor: 1 },
  { id: 9, number: '102', building: 2, floor: 1 },
  { id: 10, number: '201', building: 2, floor: 2 },
  { id: 11, number: '202', building: 2, floor: 2 },
  { id: 12, number: '301', building: 2, floor: 3 },
];

// Mock employees data
export const mockEmployees: Employee[] = [
  { 
    id: 1, 
    lastName: 'Иванов', 
    firstName: 'Иван', 
    middleName: 'Иванович', 
    employeeId: 'EMP001', 
    accessRooms: [1, 2, 4, 8] 
  },
  { 
    id: 2, 
    lastName: 'Петров', 
    firstName: 'Петр', 
    middleName: 'Петрович', 
    employeeId: 'EMP002', 
    accessRooms: [1, 3, 5, 9] 
  },
  { 
    id: 3, 
    lastName: 'Сидорова', 
    firstName: 'Мария', 
    middleName: 'Александровна', 
    employeeId: 'EMP003', 
    accessRooms: [2, 6, 10] 
  },
  { 
    id: 4, 
    lastName: 'Кузнецов', 
    firstName: 'Алексей', 
    middleName: 'Дмитриевич', 
    employeeId: 'EMP004', 
    accessRooms: [3, 7, 11] 
  },
  { 
    id: 5, 
    lastName: 'Смирнова', 
    firstName: 'Елена', 
    middleName: 'Сергеевна', 
    employeeId: 'EMP005', 
    accessRooms: [1, 4, 7, 12] 
  }
];
