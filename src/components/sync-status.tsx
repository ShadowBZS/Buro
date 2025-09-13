import React from 'react';
import { Button, Tooltip, Badge } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useNetworkStatus } from '../hooks/use-network-status';
import { useDataService } from '../hooks/use-data-service';

export const SyncStatus: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const { 
    isSyncing, 
    pendingChangesCount, 
    syncData 
  } = useDataService();
  
  const handleSync = () => {
    if (isOnline && !isSyncing) {
      syncData();
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Tooltip
        content={isOnline ? 'Подключено к сети' : 'Нет подключения к сети'}
        placement="bottom"
      >
        <div className="flex items-center">
          <Icon 
            icon={isOnline ? "lucide:wifi" : "lucide:wifi-off"} 
            className={isOnline ? "text-success" : "text-danger"}
          />
          <span className="ml-1 text-small">
            {isOnline ? 'Онлайн' : 'Офлайн'}
          </span>
        </div>
      </Tooltip>
      
      {pendingChangesCount > 0 && (
        <Badge content={pendingChangesCount} color="warning">
          <Tooltip content="Ожидающие синхронизации изменения" placement="bottom">
            <Icon icon="lucide:database" className="text-warning" />
          </Tooltip>
        </Badge>
      )}
      
      <Tooltip
        content={
          isSyncing 
            ? 'Синхронизация...' 
            : isOnline 
              ? 'Синхронизировать с сервером' 
              : 'Нет подключения к серверу'
        }
        placement="bottom"
      >
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={handleSync}
          isDisabled={!isOnline || isSyncing}
          isLoading={isSyncing}
        >
          <Icon icon="lucide:refresh-cw" className={isSyncing ? "animate-spin" : ""} />
        </Button>
      </Tooltip>
    </div>
  );
};
