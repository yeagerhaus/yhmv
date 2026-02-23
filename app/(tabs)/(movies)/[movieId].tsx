import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Div, Text } from '@/components';
import { Colors } from '@/constants/styles';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Movie } from '@/types/movie';
import { fetchMovieDetail } from '@/utils/plex';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BACKDROP_HEIGHT = SCREEN_WIDTH * 0.56;

function formatDuration(ms: number): string {
	const minutes = Math.round(ms / 60000);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours}h ${remainingMinutes}m`;
}

export default function MovieDetailScreen() {
	const { movieId } = useLocalSearchParams<{ movieId: string }>();
	const router = useRouter();
	const [movie, setMovie] = useState<Movie | null>(null);
	const backgroundColor = useThemeColor({}, 'background');

	const load = useCallback(async () => {
		if (!movieId) return;
		const result = await fetchMovieDetail(movieId);
		setMovie(result);
	}, [movieId]);

	useEffect(() => {
		load();
	}, [load]);

	if (!movie) {
		return (
			<Div style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Text type='body' colorVariant='muted'>
					Loading...
				</Text>
			</Div>
		);
	}

	const hasProgress = movie.viewOffset != null && movie.viewOffset > 0;

	return (
		<ScrollView style={{ flex: 1, backgroundColor }} showsVerticalScrollIndicator={false}>
			{movie.backdropUrl ? (
				<Image source={{ uri: movie.backdropUrl }} style={styles.backdrop} />
			) : (
				<View style={[styles.backdrop, { backgroundColor: '#1a1a1a' }]} />
			)}

			<Div transparent style={styles.content}>
				<Text type='h1'>{movie.title}</Text>

				<Div transparent style={styles.meta}>
					{movie.year && <Text type='bodyXS' colorVariant='muted'>{movie.year}</Text>}
					{movie.duration > 0 && <Text type='bodyXS' colorVariant='muted'>{formatDuration(movie.duration)}</Text>}
					{movie.contentRating && <Text type='bodyXS' colorVariant='muted'>{movie.contentRating}</Text>}
					{movie.rating != null && <Text type='bodyXS' colorVariant='muted'>{movie.rating.toFixed(1)}</Text>}
				</Div>

				<TouchableOpacity
					style={styles.playButton}
					onPress={() => router.push(`/player/${movie.id}`)}
					activeOpacity={0.8}
				>
					<SymbolView name='play.fill' type='monochrome' tintColor='#fff' size={18} />
					<Text type='body' style={{ color: '#fff', fontWeight: '600' }}>
						{hasProgress ? 'Resume' : 'Play'}
					</Text>
				</TouchableOpacity>

				{movie.genres.length > 0 && (
					<Text type='bodyXS' colorVariant='muted'>
						{movie.genres.join(' · ')}
					</Text>
				)}

				{movie.summary && (
					<Text type='body' style={styles.summary}>
						{movie.summary}
					</Text>
				)}

				{movie.studio && (
					<Text type='bodyXS' colorVariant='muted' style={{ marginTop: 12 }}>
						{movie.studio}
					</Text>
				)}
			</Div>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	backdrop: { width: SCREEN_WIDTH, height: BACKDROP_HEIGHT },
	content: { padding: 16, gap: 10, paddingBottom: 100 },
	meta: { flexDirection: 'row', gap: 12 },
	playButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: Colors.brandPrimary,
		paddingVertical: 14,
		borderRadius: 10,
		marginVertical: 4,
	},
	summary: { lineHeight: 22, marginTop: 4 },
});
