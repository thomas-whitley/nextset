import React, { useState } from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, Platform } from 'react-native';
import Colors from '@/constants/Colors';

interface FocusableButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  focusStyle?: any;
}

export default function FocusableButton({ 
  children, 
  style, 
  focusStyle,
  onFocus,
  onBlur,
  ...props 
}: FocusableButtonProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (event: any) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: any) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const combinedStyle = [
    style,
    isFocused && (focusStyle || styles.defaultFocus),
    Platform.OS === 'web' && styles.webFocus,
  ];

  return (
    <TouchableOpacity
      {...props}
      style={combinedStyle}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // Web-specific props
      {...(Platform.OS === 'web' && {
        tabIndex: props.disabled ? -1 : 0,
        role: props.accessibilityRole || 'button',
      })}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  defaultFocus: {
    borderWidth: 2,
    borderColor: Colors.light.focus,
    shadowColor: Colors.light.focusRing,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  webFocus: Platform.OS === 'web' ? {
    outline: 'none',
    ':focus': {
      borderColor: Colors.light.focus,
      boxShadow: `0 0 0 3px ${Colors.light.focusRing}`,
    },
  } : {},
});
</FocusableButton>