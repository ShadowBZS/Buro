// Database configuration
// In a production environment, these values would typically come from environment variables
export const databaseConfig = {
  type: 'mysql' as const, // Can be 'mysql', 'mssql', or 'postgres'
  host: import.meta.env.VITE_DB_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
  database: import.meta.env.VITE_DB_NAME || 'key_management',
  username: import.meta.env.VITE_DB_USER || 'admin',
  password: import.meta.env.VITE_DB_PASSWORD || 'password',
  connectionLimit: parseInt(import.meta.env.VITE_DB_CONNECTION_LIMIT || '10')
};

// Database schema creation SQL scripts
export const databaseSchemas = {
  mysql: `
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      number VARCHAR(50) NOT NULL,
      building INT NOT NULL,
      floor INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_room (number, building)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lastName VARCHAR(100) NOT NULL,
      firstName VARCHAR(100) NOT NULL,
      middleName VARCHAR(100) NOT NULL,
      employeeId VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS access_rights (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employeeId INT NOT NULL,
      roomId INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_access (employeeId, roomId),
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_room_building ON rooms(building);
    CREATE INDEX idx_room_floor ON rooms(floor);
    CREATE INDEX idx_employee_name ON employees(lastName, firstName, middleName);
  `,
  
  postgres: `
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      number VARCHAR(50) NOT NULL,
      building INT NOT NULL,
      floor INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (number, building)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      lastName VARCHAR(100) NOT NULL,
      firstName VARCHAR(100) NOT NULL,
      middleName VARCHAR(100) NOT NULL,
      employeeId VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS access_rights (
      id SERIAL PRIMARY KEY,
      employeeId INT NOT NULL,
      roomId INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (employeeId, roomId),
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_room_building ON rooms(building);
    CREATE INDEX idx_room_floor ON rooms(floor);
    CREATE INDEX idx_employee_name ON employees(lastName, firstName, middleName);
  `,
  
  mssql: `
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='rooms' AND xtype='U')
    CREATE TABLE rooms (
      id INT IDENTITY(1,1) PRIMARY KEY,
      number NVARCHAR(50) NOT NULL,
      building INT NOT NULL,
      floor INT NOT NULL,
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE(),
      CONSTRAINT unique_room UNIQUE (number, building)
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='employees' AND xtype='U')
    CREATE TABLE employees (
      id INT IDENTITY(1,1) PRIMARY KEY,
      lastName NVARCHAR(100) NOT NULL,
      firstName NVARCHAR(100) NOT NULL,
      middleName NVARCHAR(100) NOT NULL,
      employeeId NVARCHAR(50) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='access_rights' AND xtype='U')
    CREATE TABLE access_rights (
      id INT IDENTITY(1,1) PRIMARY KEY,
      employeeId INT NOT NULL,
      roomId INT NOT NULL,
      created_at DATETIME DEFAULT GETDATE(),
      CONSTRAINT unique_access UNIQUE (employeeId, roomId),
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
    );

    IF NOT EXISTS (SELECT * FROM sysindexes WHERE name = 'idx_room_building')
    CREATE INDEX idx_room_building ON rooms(building);
    
    IF NOT EXISTS (SELECT * FROM sysindexes WHERE name = 'idx_room_floor')
    CREATE INDEX idx_room_floor ON rooms(floor);
    
    IF NOT EXISTS (SELECT * FROM sysindexes WHERE name = 'idx_employee_name')
    CREATE INDEX idx_employee_name ON employees(lastName, firstName, middleName);
  `
};
