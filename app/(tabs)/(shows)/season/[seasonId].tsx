import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Div, Text } from '@/components';
import { EpisodeItem } from '@/components/DynamicItem/EpisodeItem';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Episode } from '@/types/episode';
import { fetchEpisodes } from '@/utils/plex';

export default function SeasonDetailScreen() {
	const { seasonId } = useLocalSearchParams<{ seasonId: string }>();
	const [episodes, setEpisodes] = useState<Episode[]>([]);
	const [loading, setLoading] = useState(true);
	const backgroundColor = useThemeColor({}, 'background');

	const load = useCallback(async () => {
		if (!seasonId) return;
		try {
			const result = await fetchEpisodes(seasonId);
			setEpisodes(result);
		} catch (err) {
			console.error('Failed to fetch episodes:', err);
		} finally {
			setLoading(false);
		}
	}, [seasonId]);

	useEffect(() => {
		load();
	}, [load]);

	const seasonNum = episodes.length > 0 ? episodes[0].seasonNumber : '';

	return (
		<Div style={{ flex: 1, backgroundColor }}>
			<FlatList
				data={episodes}
				keyExtractor={(ep) => ep.id}
				renderItem={({ item }) => <EpisodeItem episode={item} />}
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
				ListHeaderComponent={
					<Div transparent style={styles.header}>
						<Text type='h1'>Season {seasonNum}</Text>
						<Text type='bodyXS' colorVariant='muted'>
							{episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
						</Text>
					</Div>
				}
				ListEmptyComponent={
					loading ? (
						<Text type='body' colorVariant='muted' style={{ textAlign: 'center', marginTop: 40 }}>
							Loading...
						</Text>
					) : null
				}
			/>
		</Div>
	);
}

const styles = StyleSheet.create({
	list: { paddingHorizontal: 16, paddingBottom: 100 },
	header: { marginBottom: 16, gap: 4, paddingTop: 60 },
});
