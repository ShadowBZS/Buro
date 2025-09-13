import React from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [networkStatusChanged, setNetworkStatusChanged] = React.useState(0);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkStatusChanged(prev => prev + 1);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkStatusChanged(prev => prev + 1);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, networkStatusChanged };
};
