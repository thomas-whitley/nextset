import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useLocalDatabase } from '@/hooks/useLocalDatabase';

interface SyncStatusIndicatorProps {
  onSyncPress?: () => void;
  compact?: boolean;
}

export default function SyncStatusIndicator({ onSyncPress, compact = false }: SyncStatusIndicatorProps) {
  const { syncStatus, isSyncing, lastSyncResult, syncToCloud } = useLocalDatabase();

  const handleSyncPress = async () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      await syncToCloud(true); // Force sync
    }
  };

  const getStatusIcon = () => {
    if (isSyncing) {
      return <ActivityIndicator size="small" color={Colors.light.primary} />;
    }
    
    if (!syncStatus.isOnline) {
      return <WifiOff size={16} color={Colors.light.error} />;
    }
    
    if (syncStatus.pendingSync > 0) {
      return <CloudOff size={16} color={Colors.light.warning} />;
    }
    
    if (lastSyncResult?.success) {
      return <CheckCircle size={16} color={Colors.light.success} />;
    }
    
    if (lastSyncResult && !lastSyncResult.success) {
      return <AlertCircle size={16} color={Colors.light.error} />;
    }
    
    return <Cloud size={16} color={Colors.light.textTertiary} />;
  };

  const getStatusText = () => {
    if (isSyncing) {
      return 'Syncing...';
    }
    
    if (!syncStatus.isOnline) {
      return 'Offline';
    }
    
    if (syncStatus.pendingSync > 0) {
      return `${syncStatus.pendingSync} pending`;
    }
    
    if (lastSyncResult?.success) {
      return 'Synced';
    }
    
    if (lastSyncResult && !lastSyncResult.success) {
      return 'Sync failed';
    }
    
    return 'Ready to sync';
  };

  const getStatusColor = () => {
    if (isSyncing) {
      return Colors.light.primary;
    }
    
    if (!syncStatus.isOnline) {
      return Colors.light.error;
    }
    
    if (syncStatus.pendingSync > 0) {
      return Colors.light.warning;
    }
    
    if (lastSyncResult?.success) {
      return Colors.light.success;
    }
    
    if (lastSyncResult && !lastSyncResult.success) {
      return Colors.light.error;
    }
    
    return Colors.light.textTertiary;
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.compactContainer, { borderColor: getStatusColor() }]}
        onPress={handleSyncPress}
        disabled={isSyncing}
      >
        {getStatusIcon()}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: getStatusColor() }]}
      onPress={handleSyncPress}
      disabled={isSyncing}
    >
      <View style={styles.statusRow}>
        {getStatusIcon()}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {syncStatus.pendingSync > 0 && (
        <Text style={styles.pendingText}>
          {syncStatus.pendingSync} workout{syncStatus.pendingSync !== 1 ? 's' : ''} to sync
        </Text>
      )}
      
      {syncStatus.lastSyncAt && (
        <Text style={styles.lastSyncText}>
          Last sync: {new Date(syncStatus.lastSyncAt).toLocaleString()}
        </Text>
      )}
      
      {!syncStatus.isWiFi && syncStatus.isOnline && (
        <Text style={styles.wifiWarning}>
          Connect to Wi-Fi for automatic sync
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  compactContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  pendingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  lastSyncText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  wifiWarning: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.light.warning,
    marginTop: 2,
  },
});