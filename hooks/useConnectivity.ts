import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * True unless the device reports no connection or confirms the internet is
 * unreachable. `isInternetReachable` is null while undetermined, which counts
 * as online so the banner never flashes on launch.
 */
export function useConnectivity(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  return { isOnline };
}
