/**
 * Utility functions for generating sample data for import/export
 */

// Room distribution per floor for each building
const ROOM_DISTRIBUTION = {
  1: { // Building 1
    1: 50,  // 50 rooms on floor 1
    2: 50,  // 50 rooms on floor 2
    3: 75,  // 75 rooms on floor 3
    4: 75,  // 75 rooms on floor 4
    5: 100, // 100 rooms on floor 5
    6: 75,  // 75 rooms on floor 6
    7: 75,  // 75 rooms on floor 7
  },
  2: { // Building 2
    1: 50,  // 50 rooms on floor 1
    2: 50,  // 50 rooms on floor 2
    3: 75,  // 75 rooms on floor 3
    4: 75,  // 75 rooms on floor 4
    5: 100, // 100 rooms on floor 5
    6: 75,  // 75 rooms on floor 6
    7: 75,  // 75 rooms on floor 7
  }
};

// Common Russian last names
const LAST_NAMES = [
  'Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов', 
  'Новиков', 'Федоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семенов', 'Егоров', 
  'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров', 'Никитин', 
  'Захаров', 'Зайцев', 'Соловьев', 'Борисов', 'Яковлев', 'Григорьев', 'Романов', 'Воробьев', 
  'Сергеев', 'Кузьмин', 'Фролов', 'Александров', 'Дмитриев', 'Королев', 'Гусев', 'Киселев'
];

// Common Russian male first names
const MALE_FIRST_NAMES = [
  'Александр', 'Алексей', 'Анатолий', 'Андрей', 'Антон', 'Аркадий', 'Артем', 'Борис', 
  'Вадим', 'Валентин', 'Валерий', 'Василий', 'Виктор', 'Виталий', 'Владимир', 'Владислав', 
  'Геннадий', 'Георгий', 'Григорий', 'Даниил', 'Денис', 'Дмитрий', 'Евгений', 'Егор', 
  'Иван', 'Игорь', 'Илья', 'Кирилл', 'Константин', 'Леонид', 'Максим', 'Михаил', 
  'Никита', 'Николай', 'Олег', 'Павел', 'Петр', 'Роман', 'Сергей', 'Станислав'
];

// Common Russian female first names
const FEMALE_FIRST_NAMES = [
  'Александра', 'Алена', 'Алина', 'Алла', 'Анастасия', 'Анна', 'Валентина', 'Валерия', 
  'Вера', 'Виктория', 'Галина', 'Дарья', 'Евгения', 'Екатерина', 'Елена', 'Елизавета', 
  'Инна', 'Ирина', 'Карина', 'Кристина', 'Ксения', 'Лариса', 'Любовь', 'Людмила', 
  'Маргарита', 'Марина', 'Мария', 'Надежда', 'Наталья', 'Нина', 'Оксана', 'Ольга', 
  'Полина', 'Светлана', 'София', 'Татьяна', 'Юлия', 'Яна'
];

// Common Russian patronymics
const MALE_PATRONYMICS = [
  'Александрович', 'Алексеевич', 'Анатольевич', 'Андреевич', 'Антонович', 'Аркадьевич', 
  'Борисович', 'Вадимович', 'Валентинович', 'Валерьевич', 'Васильевич', 'Викторович', 
  'Владимирович', 'Геннадьевич', 'Георгиевич', 'Григорьевич', 'Данилович', 'Денисович', 
  'Дмитриевич', 'Евгеньевич', 'Егорович', 'Иванович', 'Игоревич', 'Ильич', 'Кириллович', 
  'Константинович', 'Леонидович', 'Максимович', 'Михайлович', 'Николаевич', 'Олегович', 
  'Павлович', 'Петрович', 'Романович', 'Сергеевич', 'Станиславович'
];

const FEMALE_PATRONYMICS = [
  'Александровна', 'Алексеевна', 'Анатольевна', 'Андреевна', 'Антоновна', 'Аркадьевна', 
  'Борисовна', 'Вадимовна', 'Валентиновна', 'Валерьевна', 'Васильевна', 'Викторовна', 
  'Владимировна', 'Геннадьевна', 'Георгиевна', 'Григорьевна', 'Даниловна', 'Денисовна', 
  'Дмитриевна', 'Евгеньевна', 'Егоровна', 'Ивановна', 'Игоревна', 'Ильинична', 'Кирилловна', 
  'Константиновна', 'Леонидовна', 'Максимовна', 'Михайловна', 'Николаевна', 'Олеговна', 
  'Павловна', 'Петровна', 'Романовна', 'Сергеевна', 'Станиславовна'
];

/**
 * Generates a full CSV file for room import
 * @returns CSV string with 1000 rooms (500 per building)
 */
export const generateFullRoomsCsv = (): string => {
  let csv = 'id,number,building,floor,employeeAccess\n';
  let roomId = 1;
  
  // For each building
  for (let building = 1; building <= 2; building++) {
    // For each floor in the building
    for (const [floor, roomCount] of Object.entries(ROOM_DISTRIBUTION[building as 1 | 2])) {
      // Generate rooms for this floor
      for (let i = 1; i <= roomCount; i++) {
        // Room number format: floor + sequential number (padded to 2 digits)
        const roomNumber = `${floor}${i.toString().padStart(2, '0')}`;
        
        // Generate random employee access (3-8 employees per room)
        const employeeCount = 3 + Math.floor(Math.random() * 6);
        const employeeIds = new Set<number>();
        
        while (employeeIds.size < employeeCount) {
          employeeIds.add(1 + Math.floor(Math.random() * 3500)); // Random employee IDs up to 3500
        }
        
        csv += `${roomId},${roomNumber},${building},${floor},"${Array.from(employeeIds).join(',')}"\n`;
        roomId++;
      }
    }
  }
  
  return csv;
};

/**
 * Generates a full CSV file for employee import
 * @returns CSV string with 3500 employees
 */
export const generateFullEmployeesCsv = (): string => {
  let csv = 'id,lastName,firstName,middleName,employeeId,accessRooms\n';
  
  for (let i = 1; i <= 3500; i++) {
    // Determine gender (roughly 50/50 split)
    const isMale = Math.random() > 0.5;
    
    // Generate name components based on gender
    const lastName = isMale ? 
      LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)] : 
      LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)] + 'а';
      
    const firstName = isMale ? 
      MALE_FIRST_NAMES[Math.floor(Math.random() * MALE_FIRST_NAMES.length)] : 
      FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
      
    const middleName = isMale ? 
      MALE_PATRONYMICS[Math.floor(Math.random() * MALE_PATRONYMICS.length)] : 
      FEMALE_PATRONYMICS[Math.floor(Math.random() * FEMALE_PATRONYMICS.length)];
    
    // Generate employee ID
    const employeeId = `EMP${i.toString().padStart(4, '0')}`;
    
    // Generate random room access (5-15 rooms per employee)
    const roomCount = 5 + Math.floor(Math.random() * 11);
    const roomIds = new Set<number>();
    
    while (roomIds.size < roomCount) {
      roomIds.add(1 + Math.floor(Math.random() * 1000)); // Random room IDs up to 1000
    }
    
    csv += `${i},${lastName},${firstName},${middleName},${employeeId},"${Array.from(roomIds).join(',')}"\n`;
  }
  
  return csv;
};

/**
 * Generates a sample CSV file for room import (first 20 entries)
 * @returns CSV string with sample room data
 */
export const generateSampleRoomsCsv = (): string => {
  const fullCsv = generateFullRoomsCsv();
  const lines = fullCsv.split('\n');
  return lines.slice(0, 21).join('\n'); // Header + 20 entries
};

/**
 * Generates a sample CSV file for employee import (first 20 entries)
 * @returns CSV string with sample employee data
 */
export const generateSampleEmployeesCsv = (): string => {
  const fullCsv = generateFullEmployeesCsv();
  const lines = fullCsv.split('\n');
  return lines.slice(0, 21).join('\n'); // Header + 20 entries
};
