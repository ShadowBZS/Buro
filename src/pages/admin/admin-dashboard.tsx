import React from 'react';
import { Tabs, Tab, Card, CardBody, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { Header } from '../../components/header';
import { RoomManagement } from '../../components/admin/room-management';
import { EmployeeManagement } from '../../components/admin/employee-management';
import { RoomSearch } from '../../components/admin/room-search';
import { EmployeeSearch } from '../../components/admin/employee-search';
import { ImportExport } from '../../components/admin/import-export';
import { useAuth } from '../../contexts/auth-context';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<string>('search');
  const [searchType, setSearchType] = React.useState<'room' | 'employee'>('room');
  const [selectedBuilding, setSelectedBuilding] = React.useState<number | 'all'>(1);
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Панель администратора" isAdmin={true} />
      
      <div className="container mx-auto p-4 flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <Tabs 
            aria-label="Admin Options" 
            selectedKey={activeTab} 
            onSelectionChange={(key) => setActiveTab(key as string)}
          >
            <Tab key="search" title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:search" />
                <span>Поиск</span>
              </div>
            }/>
            <Tab key="edit" title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:edit" />
                <span>Редактирование</span>
              </div>
            }/>
            <Tab key="import" title={
              <div className="flex items-center gap-2">
                <Icon icon="lucide:upload" />
                <span>Импорт/Экспорт</span>
              </div>
            }/>
          </Tabs>
          
          <div className="flex gap-2">
            <Dropdown>
              <DropdownTrigger>
                <Button 
                  variant="bordered"
                  startContent={<Icon icon="lucide:building" />}
                >
                  {selectedBuilding === 'all' ? 'Все корпуса' : `Корпус ${selectedBuilding}`}
                </Button>
              </DropdownTrigger>
              <DropdownMenu 
                aria-label="Building selection"
                onAction={(key) => setSelectedBuilding(key === 'all' ? 'all' : Number(key))}
              >
                <DropdownItem key="1">Корпус 1</DropdownItem>
                <DropdownItem key="2">Корпус 2</DropdownItem>
                <DropdownItem key="all">Все корпуса</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            
            <Button color="danger" variant="light" onPress={handleLogout}>
              Выйти
            </Button>
          </div>
        </div>

        {activeTab === 'search' && (
          <Card>
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
              
              {searchType === 'room' ? (
                <RoomSearch buildingId={selectedBuilding} />
              ) : (
                <EmployeeSearch buildingId={selectedBuilding} />
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 'edit' && (
          <Card>
            <CardBody>
              <Tabs 
                aria-label="Edit Options" 
                selectedKey={searchType} 
                onSelectionChange={(key) => setSearchType(key as 'room' | 'employee')}
                className="mb-4"
              >
                <Tab key="room" title={
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:door-open" />
                    <span>Редактирование помещений</span>
                  </div>
                }/>
                <Tab key="employee" title={
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:user" />
                    <span>Редактирование сотрудников</span>
                  </div>
                }/>
              </Tabs>
              
              {searchType === 'room' ? (
                <RoomManagement buildingId={selectedBuilding} />
              ) : (
                <EmployeeManagement buildingId={selectedBuilding} />
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 'import' && (
          <Card>
            <CardBody>
              <ImportExport />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};
