import React from 'react';
import { Navbar, NavbarBrand, NavbarContent, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Badge } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';

interface HeaderProps {
  title: string;
  isAdmin?: boolean;
  buildingId?: number;
}

export const Header: React.FC<HeaderProps> = ({ title, isAdmin = false, buildingId }) => {
  const { logout } = useAuth();
  const { isOnline, pendingChangesCount, syncData } = useData();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  return (
    <Navbar className="border-b border-divider">
      <NavbarBrand>
        <Icon icon="lucide:key" className="text-primary text-2xl mr-2" />
        <p className="font-semibold text-inherit">Система управления ключами</p>
      </NavbarBrand>
      
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <span className="text-default-600">{title}</span>
        {isAdmin && buildingId && (
          <span className="text-default-500">Корпус {buildingId}</span>
        )}
      </NavbarContent>
      
      <NavbarContent justify="end">
        {isAdmin && (
          <>
            {isOnline && pendingChangesCount > 0 && (
              <Button 
                variant="light" 
                color="primary" 
                startContent={<Icon icon="lucide:refresh-cw" />}
                endContent={<Badge color="danger" content={pendingChangesCount} />}
                onPress={syncData}
              >
                Синхронизировать
              </Button>
            )}
            <Dropdown>
              <DropdownTrigger>
                <Button variant="light" isIconOnly>
                  <Icon icon="lucide:user" className="text-xl" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="User Actions">
                <DropdownItem key="profile" startContent={<Icon icon="lucide:user" />}>
                  Администратор
                </DropdownItem>
                <DropdownItem key="logout" startContent={<Icon icon="lucide:log-out" />} onPress={handleLogout}>
                  Выйти
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </>
        )}
        
        {!isAdmin && (
          <div className="flex items-center">
            <span className="text-default-500 mr-2">Оператор корпуса {buildingId}</span>
            <Button as="a" href="/login" variant="light" color="primary" size="sm">
              Вход для администратора
            </Button>
          </div>
        )}
      </NavbarContent>
    </Navbar>
  );
};
