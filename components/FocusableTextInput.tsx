import React, { useState, forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet, Platform } from 'react-native';
import Colors from '@/constants/Colors';

interface FocusableTextInputProps extends TextInputProps {
  focusStyle?: any;
}

const FocusableTextInput = forwardRef<TextInput, FocusableTextInputProps>(({ 
  style, 
  focusStyle,
  onFocus,
  onBlur,
  ...props 
}, ref) => {
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
    <TextInput
      {...props}
      ref={ref}
      style={combinedStyle}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // Web-specific props
      {...(Platform.OS === 'web' && {
        tabIndex: props.editable === false ? -1 : 0,
      })}
    />
  );
});

FocusableTextInput.displayName = 'FocusableTextInput';

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

export default FocusableTextInput;
</FocusableTextInput>