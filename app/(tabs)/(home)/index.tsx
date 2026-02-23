import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import { Div, Text } from '@/components';
import { ContinueWatchingCard } from '@/components/ContinueWatchingCard';
import { MovieItem } from '@/components/DynamicItem/MovieItem';
import { ShowItem } from '@/components/DynamicItem/ShowItem';
import { HomeSection } from '@/components/HomeSection';
import { Main } from '@/components/Main';
import { Colors } from '@/constants/styles';
import { useVideoLibraryStore } from '@/hooks/useVideoLibraryStore';
import { fetchOnDeck, fetchRecentlyAddedMovies, fetchRecentlyAddedShows } from '@/utils/plex';

export default function HomeScreen() {
	const { onDeck, recentlyAddedMovies, recentlyAddedShows, setOnDeck, setRecentlyAddedMovies, setRecentlyAddedShows, isLoading } =
		useVideoLibraryStore();
	const [refreshing, setRefreshing] = useState(false);

	const loadData = useCallback(async () => {
		try {
			const [deckItems, recentMovies, recentShows] = await Promise.all([
				fetchOnDeck(15),
				fetchRecentlyAddedMovies(15),
				fetchRecentlyAddedShows(15),
			]);
			setOnDeck(deckItems);
			setRecentlyAddedMovies(recentMovies);
			setRecentlyAddedShows(recentShows);
		} catch (err) {
			console.error('Failed to load home data:', err);
		}
	}, [setOnDeck, setRecentlyAddedMovies, setRecentlyAddedShows]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	}, [loadData]);

	return (
		<Main
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandPrimary} />}
		>
			<Div transparent style={styles.header}>
				<Text type='h1'>Home</Text>
			</Div>

			<Div transparent style={styles.sections}>
				<HomeSection
					title='Continue Watching'
					data={onDeck}
					renderItem={(item) => <ContinueWatchingCard item={item} />}
					keyExtractor={(item) => item.id}
					isLoading={isLoading}
					itemSize={260}
				/>

				<HomeSection
					title='Recently Added Movies'
					data={recentlyAddedMovies}
					renderItem={(movie) => <MovieItem movie={movie} width={140} />}
					keyExtractor={(movie) => movie.id}
					isLoading={isLoading}
					itemSize={140}
				/>

				<HomeSection
					title='Recently Added Shows'
					data={recentlyAddedShows}
					renderItem={(show) => <ShowItem show={show} width={140} />}
					keyExtractor={(show) => show.id}
					isLoading={isLoading}
					itemSize={140}
				/>
			</Div>
		</Main>
	);
}

const styles = StyleSheet.create({
	header: { paddingHorizontal: 16, marginBottom: 16 },
	sections: { gap: 28, paddingBottom: 100 },
});
