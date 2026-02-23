import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants';

export default function SearchLayout() {
	const colorScheme = useColorScheme();
	const bg = colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;

	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }} />;
}
