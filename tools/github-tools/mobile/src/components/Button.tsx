import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  ...rest
}) => {
  // Determine button styling based on variant
  const getContainerStyle = () => {
    const baseStyle = [styles.container];
    
    // Variant styles
    if (variant === 'primary') baseStyle.push(styles.primaryContainer);
    if (variant === 'secondary') baseStyle.push(styles.secondaryContainer);
    if (variant === 'outline') baseStyle.push(styles.outlineContainer);
    if (variant === 'danger') baseStyle.push(styles.dangerContainer);
    
    // Size styles
    if (size === 'small') baseStyle.push(styles.smallContainer);
    if (size === 'medium') baseStyle.push(styles.mediumContainer);
    if (size === 'large') baseStyle.push(styles.largeContainer);
    
    // Full width style
    if (fullWidth) baseStyle.push(styles.fullWidth);
    
    // Disabled style
    if (disabled || loading) baseStyle.push(styles.disabledContainer);
    
    // Custom style
    if (style) baseStyle.push(style);
    
    return baseStyle;
  };
  
  // Determine text styling based on variant
  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    // Variant text styles
    if (variant === 'primary') baseStyle.push(styles.primaryText);
    if (variant === 'secondary') baseStyle.push(styles.secondaryText);
    if (variant === 'outline') baseStyle.push(styles.outlineText);
    if (variant === 'danger') baseStyle.push(styles.dangerText);
    
    // Size text styles
    if (size === 'small') baseStyle.push(styles.smallText);
    if (size === 'medium') baseStyle.push(styles.mediumText);
    if (size === 'large') baseStyle.push(styles.largeText);
    
    // Disabled text style
    if (disabled || loading) baseStyle.push(styles.disabledText);
    
    // Custom text style
    if (textStyle) baseStyle.push(textStyle);
    
    return baseStyle;
  };
  
  return (
    <TouchableOpacity
      style={getContainerStyle()}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? '#1E3A8A' : '#FFFFFF'} 
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  // Variant styles
  primaryContainer: {
    backgroundColor: '#1E3A8A',
  },
  secondaryContainer: {
    backgroundColor: '#4B5563',
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  dangerContainer: {
    backgroundColor: '#EF4444',
  },
  // Size styles
  smallContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumContainer: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  largeContainer: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  // Width style
  fullWidth: {
    width: '100%',
  },
  // Disabled style
  disabledContainer: {
    opacity: 0.6,
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#1E3A8A',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  disabledText: {
    // No additional styling needed beyond the container opacity
  },
});

export default Button;