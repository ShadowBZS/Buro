import React from 'react';
import { Input, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useData } from '../../contexts/data-context';
import { Room, Employee } from '../../types';

interface RoomSearchProps {
  buildingId: number | 'all';
}

export const RoomSearch: React.FC<RoomSearchProps> = ({ buildingId }) => {
  const { getRooms, getEmployees, getAccessRights } = useData();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [employeesWithAccess, setEmployeesWithAccess] = React.useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = React.useState(false);

  // Search functionality with debounce
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedRoom(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const rooms = await getRooms(buildingId === 'all' ? undefined : buildingId);
        const results = rooms.filter(room => 
          room.number.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(results);
        
        if (results.length === 1) {
          setSelectedRoom(results[0]);
          loadEmployeesWithAccess(results[0].id);
        } else {
          setSelectedRoom(null);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, buildingId, getRooms]);

  // Load employees with access to a room
  const loadEmployeesWithAccess = async (roomId: number) => {
    setLoadingEmployees(true);
    try {
      const accessRights = await getAccessRights(roomId);
      const employeeIds = accessRights.map(right => right.employeeId);
      const allEmployees = await getEmployees();
      const employees = allEmployees.filter(employee => employeeIds.includes(employee.id));
      setEmployeesWithAccess(employees);
    } catch (error) {
      console.error('Error loading employees with access:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Format employee name (last name + initials)
  const formatEmployeeName = (employee: Employee) => {
    return `${employee.lastName} ${employee.firstName.charAt(0)}. ${employee.middleName.charAt(0)}.`;
  };

  // Handle room selection
  const handleRoomSelect = async (room: Room) => {
    setSelectedRoom(room);
    loadEmployeesWithAccess(room.id);
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Введите номер помещения"
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Icon icon="lucide:door-open" className="text-default-400" />}
          className="flex-grow"
          isDisabled={isLoading}
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && !selectedRoom && (
        <Table removeWrapper aria-label="Search Results">
          <TableHeader>
            <TableColumn>НОМЕР</TableColumn>
            <TableColumn>ЭТАЖ</TableColumn>
            <TableColumn>КОРПУС</TableColumn>
            <TableColumn>ДЕЙСТВИЯ</TableColumn>
          </TableHeader>
          <TableBody>
            {searchResults.map((room) => (
              <TableRow key={room.id}>
                <TableCell>{room.number}</TableCell>
                <TableCell>{room.floor}</TableCell>
                <TableCell>{room.building}</TableCell>
                <TableCell>
                  <Button size="sm" variant="light" onPress={() => handleRoomSelect(room)}>
                    Просмотр
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Room Details */}
      {selectedRoom && (
        <Card>
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
                <p className="font-semibold">{selectedRoom.number}</p>
              </div>
              <div className="p-4 bg-content2 rounded-medium">
                <p className="text-small text-default-500">Этаж</p>
                <p className="font-semibold">{selectedRoom.floor}</p>
              </div>
              <div className="p-4 bg-content2 rounded-medium">
                <p className="text-small text-default-500">Корпус</p>
                <p className="font-semibold">{selectedRoom.building}</p>
              </div>
            </div>
            
            <h3 className="text-medium font-semibold mb-2">Сотрудники с доступом</h3>
            
            {loadingEmployees ? (
              <div className="text-center p-4">
                <Icon icon="lucide:loader" className="text-primary text-2xl mb-2 animate-spin" />
                <p className="text-default-500">Загрузка списка сотрудников...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
                {employeesWithAccess.map((employee) => (
                  <div key={employee.id} className="p-2 border border-default-200 rounded-medium">
                    <p className="font-medium">{formatEmployeeName(employee)}</p>
                    <p className="text-tiny text-default-500">{employee.employeeId}</p>
                  </div>
                ))}
                {employeesWithAccess.length === 0 && (
                  <p className="text-default-500 col-span-full">Нет сотрудников с доступом</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* No Results Message */}
      {searchQuery && searchResults.length === 0 && !isLoading && !selectedRoom && (
        <div className="text-center p-6">
          <Icon icon="lucide:search-x" className="text-default-400 text-4xl mb-2" />
          <p className="text-default-500">Помещения не найдены</p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-center p-6">
          <Icon icon="lucide:loader" className="text-primary text-4xl mb-2 animate-spin" />
          <p className="text-default-500">Поиск помещений...</p>
        </div>
      )}
    </div>
  );
};
