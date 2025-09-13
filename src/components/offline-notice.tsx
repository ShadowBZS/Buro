import React from 'react';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useNetworkStatus } from '../hooks/use-network-status';

export const OfflineNotice: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const [showNotice, setShowNotice] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  
  React.useEffect(() => {
    // On initial load, only show notice if offline
    if (isInitialLoad) {
      setIsInitialLoad(false);
      if (!isOnline) {
        setShowNotice(true);
      }
      return;
    }
    
    if (!isOnline) {
      setShowNotice(true);
    } else {
      // Hide after a delay when going back online
      const timer = setTimeout(() => {
        setShowNotice(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, isInitialLoad]);
  
  if (!showNotice) return null;
  
  return (
    <Card 
      className={`fixed bottom-4 right-4 max-w-md transition-all duration-300 z-50 ${
        isOnline ? 'bg-success-100' : 'bg-warning-100'
      }`}
    >
      <CardBody className="p-3">
        <div className="flex items-center gap-2">
          <Icon 
            icon={isOnline ? "lucide:wifi" : "lucide:wifi-off"} 
            className={isOnline ? "text-success" : "text-warning"}
            width={24}
          />
          <div>
            <p className="font-medium">
              {isOnline 
                ? 'Подключение к сети восстановлено' 
                : 'Нет подключения к сети'
              }
            </p>
            <p className="text-small text-default-600">
              {isOnline 
                ? 'Данные будут синхронизированы с сервером' 
                : 'Приложение работает в автономном режиме. Изменения будут синхронизированы при восстановлении подключения.'
              }
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
