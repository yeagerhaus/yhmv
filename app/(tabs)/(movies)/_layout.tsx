import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { InternalHeader } from '@/components/navigation/InternalHeader';
import { Colors } from '@/constants';

export default function MoviesLayout() {
	const colorScheme = useColorScheme();
	const bg = colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;

	return (
		<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
			<Stack.Screen name='index' />
			<Stack.Screen
				name='[movieId]'
				options={{ headerShown: true, title: '', header: () => <InternalHeader /> }}
			/>
		</Stack>
	);
}
