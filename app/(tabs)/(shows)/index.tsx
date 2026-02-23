import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Div, Text } from '@/components';
import { ShowItem } from '@/components/DynamicItem/ShowItem';
import { PosterGrid, POSTER_ITEM_WIDTH } from '@/components/PosterGrid';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useVideoLibraryStore } from '@/hooks/useVideoLibraryStore';
import { fetchShows } from '@/utils/plex';

export default function ShowsScreen() {
	const { shows, setShows, setLoading } = useVideoLibraryStore();
	const [hasLoaded, setHasLoaded] = useState(shows.length > 0);
	const backgroundColor = useThemeColor({}, 'background');

	const loadShows = useCallback(async () => {
		setLoading(true);
		try {
			const result = await fetchShows();
			setShows(result);
			setHasLoaded(true);
		} catch (err) {
			console.error('Failed to fetch shows:', err);
		} finally {
			setLoading(false);
		}
	}, [setShows, setLoading]);

	useEffect(() => {
		if (!hasLoaded) loadShows();
	}, [hasLoaded, loadShows]);

	const header = (
		<SafeAreaView style={{ backgroundColor }}>
			<Div transparent style={styles.header}>
				<Text type='h1'>TV Shows</Text>
				<Text type='bodyXS' colorVariant='muted'>
					{shows.length} {shows.length === 1 ? 'show' : 'shows'}
				</Text>
			</Div>
		</SafeAreaView>
	);

	return (
		<Div style={{ flex: 1 }}>
			<PosterGrid
				data={shows}
				renderItem={(show, width) => <ShowItem show={show} width={width} />}
				keyExtractor={(show) => show.id}
				ListHeaderComponent={header}
			/>
		</Div>
	);
}

const styles = StyleSheet.create({
	header: { paddingHorizontal: 16, marginBottom: 16, gap: 4 },
});
