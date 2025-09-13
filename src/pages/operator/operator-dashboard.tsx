import React from 'react';
import { Tabs, Tab, Input, Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Header } from '../../components/header';
import { useData } from '../../contexts/data-context';
import { Room, Employee } from '../../types';

interface OperatorDashboardProps {
  buildingId: number;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ buildingId }) => {
  const { getRooms, getEmployees, getAccessRights } = useData();
  const [searchType, setSearchType] = React.useState<'room' | 'employee'>('room');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Room[] | Employee[]>([]);
  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Search functionality with debounce
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (searchType === 'room') {
          const rooms = await getRooms(buildingId);
          const results = rooms.filter(room => 
            room.number.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(results);
          
          if (results.length === 1) {
            setSelectedRoom(results[0]);
            setSelectedEmployee(null);
          } else {
            setSelectedRoom(null);
          }
        } else {
          const employees = await getEmployees(searchQuery);
          setSearchResults(employees);
          
          if (employees.length === 1) {
            setSelectedEmployee(employees[0]);
            setSelectedRoom(null);
          } else {
            setSelectedEmployee(null);
          }
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, searchType, buildingId, getRooms, getEmployees]);

  // Reset search when changing search type
  React.useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedRoom(null);
    setSelectedEmployee(null);
  }, [searchType]);

  // Format employee name (last name + initials)
  const formatEmployeeName = (employee: Employee) => {
    const firstName = employee.firstName ? employee.firstName.charAt(0) + '.' : '';
    const middleName = employee.middleName ? employee.middleName.charAt(0) + '.' : '';
    return `${employee.lastName} ${firstName} ${middleName}`.trim();
  };

  // Get employees with access to a room
  const getEmployeesWithAccess = async (roomId: number) => {
    const accessRights = await getAccessRights(roomId);
    const employeeIds = accessRights.map(right => right.employeeId);
    const employees = await getEmployees();
    return employees.filter(employee => employeeIds.includes(employee.id));
  };

  // Get rooms accessible by an employee in this building
  const getRoomsAccessibleByEmployee = async (employee: Employee) => {
    const rooms = await getRooms(buildingId);
    return rooms.filter(room => employee.accessRooms.includes(room.id));
  };

  // Group rooms by floor
  const groupRoomsByFloor = (rooms: Room[]) => {
    const grouped: Record<number, Room[]> = {};
    
    rooms.forEach(room => {
      if (!grouped[room.floor]) {
        grouped[room.floor] = [];
      }
      grouped[room.floor].push(room);
    });
    
    return Object.entries(grouped)
      .sort(([floorA], [floorB]) => parseInt(floorA) - parseInt(floorB))
      .map(([floor, rooms]) => ({
        floor: parseInt(floor),
        rooms: rooms.sort((a, b) => a.number.localeCompare(b.number))
      }));
  };

  // Handle room selection
  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setSelectedEmployee(null);
  };

  // Handle employee selection
  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectedRoom(null);
  };

  // Room details component
  const RoomDetails = React.memo(({ room }: { room: Room }) => {
    const [employees, setEmployees] = React.useState<Employee[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
      const fetchEmployees = async () => {
        setLoading(true);
        try {
          const emps = await getEmployeesWithAccess(room.id);
          setEmployees(emps);
        } catch (error) {
          console.error('Error fetching employees with access:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchEmployees();
    }, [room.id]);
    
    return (
      <Card className="mb-6">
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Информация о помещении</h2>
            <Button size="sm" variant="light" onPress={() => setSelectedRoom(null)}>
              Назад к результатам
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-content2 rounded-medium">
              <p className="text-small text-default-500">Номер помещения</p>
              <p className="font-semibold">{room.number}</p>
            </div>
            <div className="p-4 bg-content2 rounded-medium">
              <p className="text-small text-default-500">Этаж</p>
              <p className="font-semibold">{room.floor}</p>
            </div>
            <div className="p-4 bg-content2 rounded-medium">
              <p className="text-small text-default-500">Корпус</p>
              <p className="font-semibold">{room.building}</p>
            </div>
          </div>
          
          <h3 className="text-medium font-semibold mb-2">Сотрудники с доступом</h3>
          
          {loading ? (
            <div className="text-center p-4">
              <p className="text-default-500">Загрузка списка сотрудников...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
              {employees.map((employee) => (
                <div key={employee.id} className="p-2 border border-default-200 rounded-medium">
                  <p className="font-medium">{formatEmployeeName(employee)}</p>
                </div>
              ))}
              {employees.length === 0 && (
                <p className="text-default-500 col-span-full">Нет сотрудников с доступом</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    );
  });

  // Employee details component
  const EmployeeDetails = React.memo(({ employee }: { employee: Employee }) => {
    const [rooms, setRooms] = React.useState<Room[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
      const fetchRooms = async () => {
        setLoading(true);
        try {
          const accessibleRooms = await getRoomsAccessibleByEmployee(employee);
          setRooms(accessibleRooms);
        } catch (error) {
          console.error('Error fetching accessible rooms:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchRooms();
    }, [employee]);
    
    const groupedRooms = React.useMemo(() => groupRoomsByFloor(rooms), [rooms]);
    
    return (
      <Card className="mb-6">
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Информация о сотруднике</h2>
            <Button size="sm" variant="light" onPress={() => setSelectedEmployee(null)}>
              Назад к результатам
            </Button>
          </div>
          
          <div className="p-4 bg-content2 rounded-medium mb-6">
            <p className="text-small text-default-500">ФИО</p>
            <p className="font-semibold">{formatEmployeeName(employee)}</p>
          </div>
          
          <h3 className="text-medium font-semibold mb-2">Доступные помещения</h3>
          
          {loading ? (
            <div className="text-center p-4">
              <p className="text-default-500">Загрузка списка помещений...</p>
            </div>
          ) : (
            <>
              {groupedRooms.map((group) => (
                <div key={group.floor} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Chip color="primary" variant="flat">Этаж {group.floor}</Chip>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 mb-4">
                    {group.rooms.map((room) => (
                      <div key={room.id} className="p-2 border border-default-200 rounded-medium text-center">
                        <span>{room.number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {rooms.length === 0 && (
                <p className="text-default-500">Нет доступных помещений в этом корпусе</p>
              )}
            </>
          )}
        </CardBody>
      </Card>
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title={`Оператор корпуса ${buildingId}`} buildingId={buildingId} />
      
      <div className="container mx-auto p-4 flex-grow">
        <Card className="mb-6">
          <CardBody>
            <Tabs 
              aria-label="Search Options" 
              selectedKey={searchType} 
              onSelectionChange={(key) => setSearchType(key as 'room' | 'employee')}
              className="mb-4"
            >
              <Tab key="room" title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:door-open" />
                  <span>Поиск помещения</span>
                </div>
              }/>
              <Tab key="employee" title={
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:user" />
                  <span>Поиск сотрудника</span>
                </div>
              }/>
            </Tabs>
            
            <div className="flex gap-2">
              <Input
                placeholder={searchType === 'room' ? "Введите номер помещения" : "Введите ФИО сотрудника"}
                value={searchQuery}
                onValueChange={setSearchQuery}
                startContent={
                  <Icon 
                    icon={searchType === 'room' ? "lucide:door-open" : "lucide:user"} 
                    className="text-default-400"
                  />
                }
                className="flex-grow"
                isDisabled={isLoading}
              />
            </div>
          </CardBody>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && !selectedRoom && !selectedEmployee && (
          <Card className="mb-6">
            <CardBody>
              <h2 className="text-lg font-semibold mb-4">Результаты поиска</h2>
              <Table removeWrapper aria-label="Search Results">
                <TableHeader>
                  {searchType === 'room' ? (
                    <>
                      <TableColumn>НОМЕР</TableColumn>
                      <TableColumn>ЭТАЖ</TableColumn>
                      <TableColumn>ДЕЙСТВИЯ</TableColumn>
                    </>
                  ) : (
                    <>
                      <TableColumn>ФИО</TableColumn>
                      <TableColumn>ДЕЙСТВИЯ</TableColumn>
                    </>
                  )}
                </TableHeader>
                <TableBody>
                  {searchType === 'room' ? (
                    (searchResults as Room[]).map((room) => (
                      <TableRow key={room.id}>
                        <TableCell>{room.number}</TableCell>
                        <TableCell>{room.floor}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="light" onPress={() => handleRoomSelect(room)}>
                            Просмотр
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    (searchResults as Employee[]).map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{formatEmployeeName(employee)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="light" onPress={() => handleEmployeeSelect(employee)}>
                            Просмотр доступов
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        )}

        {/* Room Details */}
        {selectedRoom && <RoomDetails room={selectedRoom} />}

        {/* Employee Details */}
        {selectedEmployee && <EmployeeDetails employee={selectedEmployee} />}

        {/* No Results Message */}
        {searchQuery && searchResults.length === 0 && !isLoading && !selectedRoom && !selectedEmployee && (
          <div className="text-center p-6 bg-content1 rounded-medium border border-default-200">
            <Icon icon="lucide:search-x" className="text-default-400 text-4xl mb-2" />
            <p className="text-default-500">
              {searchType === 'room' ? 'Помещения не найдены' : 'Сотрудники не найдены'}
            </p>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="text-center p-6">
            <Icon icon="lucide:loader" className="text-primary text-4xl mb-2 animate-spin" />
            <p className="text-default-500">Загрузка данных...</p>
          </div>
        )}
      </div>
    </div>
  );
};
