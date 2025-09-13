import React from 'react';
import { Input, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Accordion, AccordionItem, Checkbox } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useData } from '../../contexts/data-context';
import { Room, Employee } from '../../types';

interface EmployeeManagementProps {
  buildingId: number | 'all';
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ buildingId }) => {
  const { getEmployees, getRooms, createEmployee, updateEmployee } = useData();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = React.useState<Partial<Employee>>({
    lastName: '',
    firstName: '',
    middleName: '',
    employeeId: '',
    accessRooms: []
  });
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [isEditing, setIsEditing] = React.useState(false);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = React.useState(false);

  // Load rooms
  React.useEffect(() => {
    const loadRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const loadedRooms = await getRooms();
        setRooms(loadedRooms);
      } catch (error) {
        console.error('Error loading rooms:', error);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    
    loadRooms();
  }, [getRooms]);

  // Filter rooms by building
  const filteredRooms = React.useMemo(() => {
    if (buildingId === 'all') return rooms;
    return rooms.filter(room => room.building === buildingId);
  }, [rooms, buildingId]);

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
      if (!searchQuery.trim()) {
        setEmployees([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const results = await getEmployees(searchQuery);
        setEmployees(results);
      } catch (error) {
        console.error('Error searching employees:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timer = setTimeout(searchEmployees, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, getEmployees]);

  // Handle employee selection for editing
  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewEmployee({
      id: employee.id,
      lastName: employee.lastName,
      firstName: employee.firstName,
      middleName: employee.middleName,
      employeeId: employee.employeeId,
      accessRooms: [...employee.accessRooms]
    });
    setIsEditing(true);
    onOpen();
  };

  // Handle creating a new employee
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setNewEmployee({
      lastName: '',
      firstName: '',
      middleName: '',
      employeeId: '',
      accessRooms: []
    });
    setIsEditing(false);
    onOpen();
  };

  // Handle save employee (create or update)
  const handleSaveEmployee = async () => {
    if (!newEmployee.lastName || !newEmployee.firstName || !newEmployee.middleName || !newEmployee.employeeId) {
      return; // Validation failed
    }
    
    try {
      if (isEditing && selectedEmployee) {
        // Update existing employee
        await updateEmployee(newEmployee as Employee);
      } else {
        // Create new employee
        await createEmployee(newEmployee as Omit<Employee, 'id'>);
      }
      
      // Clear search to refresh results
      setSearchQuery('');
      setEmployees([]);
      
      onClose();
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  // Handle room access toggle
  const handleToggleRoomAccess = (roomId: number) => {
    const currentAccessRooms = newEmployee.accessRooms || [];
    
    if (currentAccessRooms.includes(roomId)) {
      setNewEmployee({
        ...newEmployee,
        accessRooms: currentAccessRooms.filter(id => id !== roomId)
      });
    } else {
      setNewEmployee({
        ...newEmployee,
        accessRooms: [...currentAccessRooms, roomId]
      });
    }
  };

  // Format employee name (last name + initials)
  const formatEmployeeName = (employee: Employee) => {
    return `${employee.lastName} ${employee.firstName.charAt(0)}. ${employee.middleName.charAt(0)}.`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 flex-1 max-w-md">
          <Input
            placeholder="Поиск сотрудника по ФИО или табельному номеру"
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="flex-1"
          />
        </div>
        <Button 
          color="primary" 
          startContent={<Icon icon="lucide:user-plus" />}
          onPress={handleAddEmployee}
        >
          Добавить сотрудника
        </Button>
      </div>

      {/* Only show employees when search query is entered */}
      {searchQuery.trim() ? (
        isLoading ? (
          <div className="text-center p-6">
            <Icon icon="lucide:loader" className="text-primary text-4xl mb-2 animate-spin" />
            <p className="text-default-500">Поиск сотрудников...</p>
          </div>
        ) : (
          <Table removeWrapper aria-label="Employees list">
            <TableHeader>
              <TableColumn>ФИО</TableColumn>
              <TableColumn>ТАБЕЛЬНЫЙ НОМЕР</TableColumn>
              <TableColumn>ДОСТУПОВ</TableColumn>
              <TableColumn>ДЕЙСТВИЯ</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Сотрудники не найдены">
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{formatEmployeeName(employee)}</TableCell>
                  <TableCell>{employee.employeeId}</TableCell>
                  <TableCell>{employee.accessRooms.length}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="light" onPress={() => handleEditEmployee(employee)}>
                      <Icon icon="lucide:edit" className="text-default-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        <div className="text-center p-12 bg-content1 rounded-medium border border-default-200">
          <Icon icon="lucide:users-search" className="text-default-400 text-4xl mb-2" />
          <p className="text-default-600 font-medium">Введите ФИО или табельный номер для поиска сотрудников</p>
          <p className="text-default-500 text-small mt-1">Для добавления нового сотрудника нажмите кнопку "Добавить сотрудника"</p>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {isEditing ? 'Редактирование сотрудника' : 'Добавление сотрудника'}
              </ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Input
                    label="Фамилия"
                    placeholder="Фамилия"
                    value={newEmployee.lastName || ''}
                    onValueChange={(value) => setNewEmployee({...newEmployee, lastName: value})}
                    isRequired
                  />
                  <Input
                    label="Имя"
                    placeholder="Имя"
                    value={newEmployee.firstName || ''}
                    onValueChange={(value) => setNewEmployee({...newEmployee, firstName: value})}
                    isRequired
                  />
                  <Input
                    label="Отчество"
                    placeholder="Отчество"
                    value={newEmployee.middleName || ''}
                    onValueChange={(value) => setNewEmployee({...newEmployee, middleName: value})}
                    isRequired
                  />
                  <Input
                    label="Табельный номер"
                    placeholder="Табельный номер"
                    value={newEmployee.employeeId || ''}
                    onValueChange={(value) => setNewEmployee({...newEmployee, employeeId: value})}
                    isRequired
                  />
                </div>
                
                <h3 className="text-medium font-semibold mb-2">Доступ в помещения</h3>
                
                {isLoadingRooms ? (
                  <div className="text-center p-4">
                    <Icon icon="lucide:loader" className="text-primary text-2xl mb-2 animate-spin" />
                    <p className="text-default-500">Загрузка списка помещений...</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto border border-default-200 rounded-medium p-2">
                    {groupedRooms.map((buildingGroup) => (
                      <Accordion key={buildingGroup.building} className="mb-2" variant="light">
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
                                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
                                  {floorGroup.rooms.map((room) => (
                                    <Checkbox
                                      key={room.id}
                                      isSelected={newEmployee.accessRooms?.includes(room.id)}
                                      onValueChange={() => handleToggleRoomAccess(room.id)}
                                    >
                                      {room.number}
                                    </Checkbox>
                                  ))}
                                </div>
                              </AccordionItem>
                            </Accordion>
                          ))}
                        </AccordionItem>
                      </Accordion>
                    ))}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Отмена
                </Button>
                <Button color="primary" onPress={handleSaveEmployee}>
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
