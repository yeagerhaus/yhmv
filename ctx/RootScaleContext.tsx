import type React from 'react';
import { createContext, useRef, useContext } from 'react';
import { Animated, Easing } from 'react-native';

interface RootScaleContextType {
	scale: Animated.Value;
	setScale: (value: number) => void;
}

const RootScaleContext = createContext<RootScaleContextType | null>(null);

export function RootScaleProvider({ children }: { children: React.ReactNode }) {
	const scale = useRef(new Animated.Value(1)).current;

	const setScale = (value: number) => {
		Animated.timing(scale, {
			toValue: value,
			duration: 300,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	};

	return <RootScaleContext.Provider value={{ scale, setScale }}>{children}</RootScaleContext.Provider>;
}

export const useRootScale = () => {
	const context = useContext(RootScaleContext);
	if (!context) {
		throw new Error('useRootScale must be used within a RootScaleProvider');
	}
	return context;
};
