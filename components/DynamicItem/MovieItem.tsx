import { useRouter } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Movie } from '@/types/movie';
import { Text } from '../Text';

interface MovieItemProps {
	movie: Movie;
	width?: number;
}

const ASPECT_RATIO = 1.5;

export function MovieItem({ movie, width = 140 }: MovieItemProps) {
	const router = useRouter();
	const height = width * ASPECT_RATIO;

	return (
		<TouchableOpacity
			style={[styles.container, { width }]}
			onPress={() => router.push(`/(tabs)/(movies)/${movie.id}`)}
			activeOpacity={0.7}
		>
			{movie.posterUrl ? (
				<Image source={{ uri: movie.posterUrl }} style={[styles.poster, { width, height }]} />
			) : (
				<View style={[styles.poster, styles.placeholder, { width, height }]}>
					<Text type='bodyXS' colorVariant='muted'>
						No Poster
					</Text>
				</View>
			)}
			{movie.viewOffset != null && movie.viewOffset > 0 && movie.duration > 0 && (
				<View style={styles.progressBarBg}>
					<View style={[styles.progressBarFill, { width: `${(movie.viewOffset / movie.duration) * 100}%` }]} />
				</View>
			)}
			<Text type='bodyXS' numberOfLines={1} style={styles.title}>
				{movie.title}
			</Text>
			{movie.year && (
				<Text type='bodyXS' colorVariant='muted' numberOfLines={1}>
					{movie.year}
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
	progressBarBg: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 3,
		backgroundColor: 'rgba(255,255,255,0.2)',
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	},
	progressBarFill: { height: 3, backgroundColor: '#7f62f5', borderBottomLeftRadius: 8 },
});
