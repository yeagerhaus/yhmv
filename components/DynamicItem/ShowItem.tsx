import { useRouter } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Show } from '@/types/show';
import { Text } from '../Text';

interface ShowItemProps {
	show: Show;
	width?: number;
}

const ASPECT_RATIO = 1.5;

export function ShowItem({ show, width = 140 }: ShowItemProps) {
	const router = useRouter();
	const height = width * ASPECT_RATIO;

	return (
		<TouchableOpacity
			style={[styles.container, { width }]}
			onPress={() => router.push(`/(tabs)/(shows)/${show.id}`)}
			activeOpacity={0.7}
		>
			{show.posterUrl ? (
				<Image source={{ uri: show.posterUrl }} style={[styles.poster, { width, height }]} />
			) : (
				<View style={[styles.poster, styles.placeholder, { width, height }]}>
					<Text type='bodyXS' colorVariant='muted'>
						No Poster
					</Text>
				</View>
			)}
			<Text type='bodyXS' numberOfLines={1} style={styles.title}>
				{show.title}
			</Text>
			{show.year && (
				<Text type='bodyXS' colorVariant='muted' numberOfLines={1}>
					{show.year}
				</Text>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: { marginBottom: 8 },
	poster: { borderRadius: 8, backgroundColor: '#1a1a1a' },
	placeholder: { alignItems: 'center', justifyContent: 'center' },
	title: { marginTop: 6 },
});
