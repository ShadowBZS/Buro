import React from 'react';
import { Input, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Accordion, AccordionItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useData } from '../../contexts/data-context';
import { Room, Employee } from '../../types';

interface RoomManagementProps {
  buildingId: number | 'all';
}

export const RoomManagement: React.FC<RoomManagementProps> = ({ buildingId }) => {
  const { getRooms, getEmployees, createRoom, updateRoom, grantAccess, revokeAccess } = useData();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = React.useState('');
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null);
  const [newRoom, setNewRoom] = React.useState<Partial<Room>>({
    number: '',
    building: buildingId === 'all' ? 1 : Number(buildingId),
    floor: 1
  });
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [isEditing, setIsEditing] = React.useState(false);
  const [employeesWithAccess, setEmployeesWithAccess] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filteredEmployees, setFilteredEmployees] = React.useState<Employee[]>([]);

  // Load rooms
  React.useEffect(() => {
    const loadRooms = async () => {
      setIsLoading(true);
      try {
        const loadedRooms = await getRooms(buildingId === 'all' ? undefined : buildingId);
        setRooms(loadedRooms);
      } catch (error) {
        console.error('Error loading rooms:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRooms();
  }, [buildingId, getRooms]);

  // Filter rooms by search query
  const filteredRooms = React.useMemo(() => {
    if (!searchQuery) return rooms;
    
    return rooms.filter(room => 
      room.number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rooms, searchQuery]);

  // Group rooms by building and floor
  const groupedRooms = React.useMemo(() => {
    const grouped: Record<number, Record<number, Room[]>> = {};
    
    filteredRooms.forEach(room => {
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
  }, [filteredRooms]);

  // Search for employees
  React.useEffect(() => {
    const searchEmployees = async () => {
      if (!employeeSearchQuery.trim()) {
        setFilteredEmployees([]);
        return;
      }
      
      try {
        const employees = await getEmployees(employeeSearchQuery);
        setFilteredEmployees(employees);
      } catch (error) {
        console.error('Error searching employees:', error);
      }
    };
    
    searchEmployees();
  }, [employeeSearchQuery, getEmployees]);

  // Handle room selection for editing
  const handleEditRoom = async (room: Room) => {
    setSelectedRoom(room);
    setNewRoom({
      id: room.id,
      number: room.number,
      building: room.building,
      floor: room.floor
    });
    setIsEditing(true);
    
    // Get employees with access to this room
    try {
      const employees = await getEmployees();
      const employeesWithAccess = employees
        .filter(emp => emp.accessRooms.includes(room.id))
        .map(emp => emp.id);
      setEmployeesWithAccess(employeesWithAccess);
    } catch (error) {
      console.error('Error getting employees with access:', error);
    }
    
    onOpen();
  };

  // Handle creating a new room
  const handleAddRoom = () => {
    setSelectedRoom(null);
    setNewRoom({
      number: '',
      building: buildingId === 'all' ? 1 : Number(buildingId),
      floor: 1
    });
    setEmployeesWithAccess([]);
    setIsEditing(false);
    onOpen();
  };

  // Handle save room (create or update)
  const handleSaveRoom = async () => {
    if (!newRoom.number || !newRoom.building || !newRoom.floor) {
      return; // Validation failed
    }
    
    try {
      if (isEditing && selectedRoom) {
        // Update existing room
        await updateRoom({ ...newRoom as Room });
        
        // Update access rights
        const employees = await getEmployees();
        const currentEmployeesWithAccess = employees
          .filter(emp => emp.accessRooms.includes(selectedRoom.id))
          .map(emp => emp.id);
        
        // Grant access to new employees
        for (const empId of employeesWithAccess) {
          if (!currentEmployeesWithAccess.includes(empId)) {
            await grantAccess(empId, selectedRoom.id);
          }
        }
        
        // Revoke access from removed employees
        for (const empId of currentEmployeesWithAccess) {
          if (!employeesWithAccess.includes(empId)) {
            await revokeAccess(empId, selectedRoom.id);
          }
        }
        
        // Refresh rooms list
        const updatedRooms = await getRooms(buildingId === 'all' ? undefined : buildingId);
        setRooms(updatedRooms);
      } else {
        // Create new room
        const room = await createRoom(newRoom as Omit<Room, 'id'>);
        
        // Grant access to selected employees
        for (const empId of employeesWithAccess) {
          await grantAccess(empId, room.id);
        }
        
        // Refresh rooms list
        const updatedRooms = await getRooms(buildingId === 'all' ? undefined : buildingId);
        setRooms(updatedRooms);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving room:', error);
    }
  };

  // Handle employee access toggle
  const handleToggleEmployeeAccess = (employeeId: number) => {
    if (employeesWithAccess.includes(employeeId)) {
      setEmployeesWithAccess(employeesWithAccess.filter(id => id !== employeeId));
    } else {
      setEmployeesWithAccess([...employeesWithAccess, employeeId]);
    }
  };

  // Format employee name (last name + initials)
  const formatEmployeeName = (employee: Employee) => {
    return `${employee.lastName} ${employee.firstName.charAt(0)}. ${employee.middleName.charAt(0)}.`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Поиск помещения по номеру"
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Icon icon="lucide:search" className="text-default-400" />}
          className="max-w-md"
        />
        <Button 
          color="primary" 
          startContent={<Icon icon="lucide:plus" />}
          onPress={handleAddRoom}
        >
          Добавить помещение
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-6">
          <Icon icon="lucide:loader" className="text-primary text-4xl mb-2 animate-spin" />
          <p className="text-default-500">Загрузка помещений...</p>
        </div>
      ) : (
        <>
          {/* Rooms grouped by building and floor */}
          {groupedRooms.map((buildingGroup) => (
            <Accordion key={buildingGroup.building} className="mb-6" variant="bordered">
              <AccordionItem 
                key={`building-${buildingGroup.building}`} 
                aria-label={`Корпус ${buildingGroup.building}`}
                title={`Корпус ${buildingGroup.building}`}
                startContent={<Icon icon="lucide:building" className="text-primary" />}
              >
                {buildingGroup.floors.map((floorGroup) => (
                  <Accordion key={`floor-${floorGroup.floor}`} className="ml-4 mb-2" variant="light">
                    <AccordionItem 
                      key={`floor-${floorGroup.floor}`} 
                      aria-label={`Этаж ${floorGroup.floor}`}
                      title={`Этаж ${floorGroup.floor}`}
                      startContent={<Icon icon="lucide:layers" className="text-secondary" />}
                    >
                      {/* Update grid to fit 10 rooms per row */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 p-2">
                        {floorGroup.rooms.map((room) => (
                          <Button 
                            key={room.id}
                            variant="bordered" 
                            className="h-auto py-2 justify-between"
                            onPress={() => handleEditRoom(room)}
                            endContent={<Icon icon="lucide:edit" className="text-default-500" />}
                          >
                            {room.number}
                          </Button>
                        ))}
                      </div>
                    </AccordionItem>
                  </Accordion>
                ))}
              </AccordionItem>
            </Accordion>
          ))}

          {filteredRooms.length === 0 && (
            <div className="text-center p-6">
              <Icon icon="lucide:door-closed" className="text-default-400 text-4xl mb-2" />
              <p className="text-default-500">Помещения не найдены</p>
              <Button color="primary" variant="light" className="mt-4" onPress={handleAddRoom}>
                Добавить помещение
              </Button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Room Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {isEditing ? 'Редактирование помещения' : 'Добавление помещения'}
              </ModalHeader>
              <ModalBody>
                {/* Room details form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Input
                    label="Номер помещения"
                    placeholder="Например: 101, A-204"
                    value={newRoom.number || ''}
                    onValueChange={(value) => setNewRoom({...newRoom, number: value})}
                    isRequired
                  />
                  <Input
                    label="Этаж"
                    type="number"
                    min={1}
                    value={newRoom.floor?.toString() || '1'}
                    onValueChange={(value) => setNewRoom({...newRoom, floor: parseInt(value) || 1})}
                    isRequired
                  />
                  <Input
                    label="Корпус"
                    type="number"
                    min={1}
                    max={2}
                    value={newRoom.building?.toString() || '1'}
                    onValueChange={(value) => setNewRoom({...newRoom, building: parseInt(value) || 1})}
                    isRequired
                  />
                </div>
                
                <h3 className="text-medium font-semibold mb-2">Сотрудники с доступом</h3>
                
                {/* Added employee search input */}
                <Input
                  placeholder="Поиск сотрудника по ФИО или табельному номеру"
                  value={employeeSearchQuery}
                  onValueChange={setEmployeeSearchQuery}
                  startContent={<Icon icon="lucide:search" className="text-default-400" />}
                  className="mb-2"
                  size="sm"
                  clearable
                />
                
                <div className="max-h-96 overflow-y-auto border border-default-200 rounded-medium p-2">
                  {/* Show only employees that match search query */}
                  {filteredEmployees.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {filteredEmployees.map((employee) => (
                        <div key={employee.id} className="p-2 border border-default-200 rounded-medium flex justify-between items-center">
                          <div>
                            <p className="font-medium">{formatEmployeeName(employee)}</p>
                            <p className="text-tiny text-default-500">{employee.employeeId}</p>
                          </div>
                          <Button 
                            size="sm" 
                            color={employeesWithAccess.includes(employee.id) ? "success" : "default"}
                            variant={employeesWithAccess.includes(employee.id) ? "solid" : "bordered"}
                            onPress={() => handleToggleEmployeeAccess(employee.id)}
                            isIconOnly
                          >
                            {employeesWithAccess.includes(employee.id) ? (
                              <Icon icon="lucide:check" />
                            ) : (
                              <Icon icon="lucide:plus" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-default-500">Введите ФИО или табельный номер для поиска сотрудников</p>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Отмена
                </Button>
                <Button color="primary" onPress={handleSaveRoom}>
                  {isEditing ? 'Сохранить' : 'Добавить'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};
