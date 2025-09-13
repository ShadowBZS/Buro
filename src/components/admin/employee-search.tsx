import React from 'react';
import { Input, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Card, CardBody, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useData } from '../../contexts/data-context';
import { Room, Employee } from '../../types';

interface EmployeeSearchProps {
  buildingId: number | 'all';
}

export const EmployeeSearch: React.FC<EmployeeSearchProps> = ({ buildingId }) => {
  const { getEmployees, getRooms } = useData();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [accessibleRooms, setAccessibleRooms] = React.useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = React.useState(false);

  // Search functionality with debounce
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedEmployee(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const employees = await getEmployees(searchQuery);
        setSearchResults(employees);
        
        if (employees.length === 1) {
          setSelectedEmployee(employees[0]);
          loadAccessibleRooms(employees[0]);
        } else {
          setSelectedEmployee(null);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, getEmployees]);

  // Load rooms accessible by an employee
  const loadAccessibleRooms = async (employee: Employee) => {
    setLoadingRooms(true);
    try {
      const allRooms = await getRooms();
      const rooms = allRooms.filter(room => 
        employee.accessRooms.includes(room.id) && 
        (buildingId === 'all' || room.building === buildingId)
      );
      setAccessibleRooms(rooms);
    } catch (error) {
      console.error('Error loading accessible rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Format employee name (last name + initials)
  const formatEmployeeName = (employee: Employee) => {
    return `${employee.lastName} ${employee.firstName.charAt(0)}. ${employee.middleName.charAt(0)}.`;
  };

  // Group rooms by building and floor
  const groupRoomsByBuildingAndFloor = React.useMemo(() => {
    const grouped: Record<number, Record<number, Room[]>> = {};
    
    accessibleRooms.forEach(room => {
      if (!grouped[room.building]) {
        grouped[room.building] = {};
      }
      if (!grouped[room.building][room.floor]) {
        grouped[room.building][room.floor] = [];
      }
      grouped[room.building][room.floor].push(room);
    });
    
    return Object.entries(grouped)
      .sort(([buildingA], [buildingB]) => parseInt(buildingA) - parseInt(buildingB))
      .map(([building, floors]) => ({
        building: parseInt(building),
        floors: Object.entries(floors)
          .sort(([floorA], [floorB]) => parseInt(floorA) - parseInt(floorB))
          .map(([floor, rooms]) => ({
            floor: parseInt(floor),
            rooms: rooms.sort((a, b) => a.number.localeCompare(b.number))
          }))
      }));
  }, [accessibleRooms]);

  // Handle employee selection
  const handleEmployeeSelect = async (employee: Employee) => {
    setSelectedEmployee(employee);
    loadAccessibleRooms(employee);
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Введите ФИО или табельный номер сотрудника"
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Icon icon="lucide:user" className="text-default-400" />}
          className="flex-grow"
          isDisabled={isLoading}
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && !selectedEmployee && (
        <Table removeWrapper aria-label="Search Results">
          <TableHeader>
            <TableColumn>ФИО</TableColumn>
            <TableColumn>ТАБЕЛЬНЫЙ НОМЕР</TableColumn>
            <TableColumn>ДЕЙСТВИЯ</TableColumn>
          </TableHeader>
          <TableBody>
            {searchResults.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{formatEmployeeName(employee)}</TableCell>
                <TableCell>{employee.employeeId}</TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => handleEmployeeSelect(employee)}>
                    Просмотр доступов
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Employee Details */}
      {selectedEmployee && (
        <Card>
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Информация о сотруднике</h2>
              <Button size="sm" variant="light" onPress={() => setSelectedEmployee(null)}>
                Назад к результатам
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-content2 rounded-medium">
                <p className="text-small text-default-500">ФИО</p>
                <p className="font-semibold">
                  {selectedEmployee.lastName} {selectedEmployee.firstName} {selectedEmployee.middleName}
                </p>
              </div>
              <div className="p-4 bg-content2 rounded-medium">
                <p className="text-small text-default-500">Табельный номер</p>
                <p className="font-semibold">{selectedEmployee.employeeId}</p>
              </div>
            </div>
            
            <h3 className="text-medium font-semibold mb-2">Доступные помещения</h3>
            
            {loadingRooms ? (
              <div className="text-center p-4">
                <Icon icon="lucide:loader" className="text-primary text-2xl mb-2 animate-spin" />
                <p className="text-default-500">Загрузка списка помещений...</p>
              </div>
            ) : (
              <>
                {groupRoomsByBuildingAndFloor.map((buildingGroup) => (
                  <div key={buildingGroup.building} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Chip color="primary" variant="flat" size="lg">Корпус {buildingGroup.building}</Chip>
                    </div>
                    
                    {buildingGroup.floors.map((floorGroup) => (
                      <div key={floorGroup.floor} className="mb-4 ml-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Chip color="secondary" variant="flat">Этаж {floorGroup.floor}</Chip>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                          {floorGroup.rooms.map((room) => (
                            <div key={room.id} className="p-2 border border-default-200 rounded-medium text-center">
                              <span>{room.number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {accessibleRooms.length === 0 && (
                  <p className="text-default-500">Нет доступных помещений</p>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* No Results Message */}
      {searchQuery && searchResults.length === 0 && !isLoading && !selectedEmployee && (
        <div className="text-center p-6">
          <Icon icon="lucide:search-x" className="text-default-400 text-4xl mb-2" />
          <p className="text-default-500">Сотрудники не найдены</p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-center p-6">
          <Icon icon="lucide:loader" className="text-primary text-4xl mb-2 animate-spin" />
          <p className="text-default-500">Поиск сотрудников...</p>
        </div>
      )}
    </div>
  );
};
