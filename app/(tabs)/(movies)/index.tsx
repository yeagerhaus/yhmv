import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Div, Text } from '@/components';
import { MovieItem } from '@/components/DynamicItem/MovieItem';
import { PosterGrid, POSTER_ITEM_WIDTH } from '@/components/PosterGrid';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useVideoLibraryStore } from '@/hooks/useVideoLibraryStore';
import { fetchMovies } from '@/utils/plex';

export default function MoviesScreen() {
	const { movies, setMovies, setLoading } = useVideoLibraryStore();
	const [hasLoaded, setHasLoaded] = useState(movies.length > 0);
	const backgroundColor = useThemeColor({}, 'background');

	const loadMovies = useCallback(async () => {
		setLoading(true);
		try {
			const result = await fetchMovies();
			setMovies(result);
			setHasLoaded(true);
		} catch (err) {
			console.error('Failed to fetch movies:', err);
		} finally {
			setLoading(false);
		}
	}, [setMovies, setLoading]);

	useEffect(() => {
		if (!hasLoaded) loadMovies();
	}, [hasLoaded, loadMovies]);

	const header = (
		<SafeAreaView style={{ backgroundColor }}>
			<Div transparent style={styles.header}>
				<Text type='h1'>Movies</Text>
				<Text type='bodyXS' colorVariant='muted'>
					{movies.length} {movies.length === 1 ? 'movie' : 'movies'}
				</Text>
			</Div>
		</SafeAreaView>
	);

	return (
		<Div style={{ flex: 1 }}>
			<PosterGrid
				data={movies}
				renderItem={(movie, width) => <MovieItem movie={movie} width={width} />}
				keyExtractor={(movie) => movie.id}
				ListHeaderComponent={header}
			/>
		</Div>
	);
}

const styles = StyleSheet.create({
	header: { paddingHorizontal: 16, marginBottom: 16, gap: 4 },
});
