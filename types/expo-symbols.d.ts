declare module 'expo-symbols' {
  import type React from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export type SymbolWeight =
    | 'ultralight'
    | 'thin'
    | 'light'
    | 'regular'
    | 'medium'
    | 'semibold'
    | 'bold'
    | 'heavy'
    | 'black';

  export interface SymbolViewProps {
    name: string;
    weight?: SymbolWeight;
    tintColor?: string;
    resizeMode?: 'center' | 'contain' | 'cover' | 'stretch' | 'repeat' | 'scaleAspectFit' | 'scaleToFill';
    style?: StyleProp<ViewStyle>;
  }

  export const SymbolView: React.ComponentType<SymbolViewProps>;
}
