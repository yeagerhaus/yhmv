import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Div, Text } from '@/components';
import { Colors } from '@/constants/styles';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Season } from '@/types/season';
import type { Show } from '@/types/show';
import { useVideoLibraryStore } from '@/hooks/useVideoLibraryStore';
import { fetchSeasons } from '@/utils/plex';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BACKDROP_HEIGHT = SCREEN_WIDTH * 0.56;

export default function ShowDetailScreen() {
	const { showId } = useLocalSearchParams<{ showId: string }>();
	const router = useRouter();
	const [seasons, setSeasons] = useState<Season[]>([]);
	const backgroundColor = useThemeColor({}, 'background');
	const shows = useVideoLibraryStore((s) => s.shows);
	const show = shows.find((s) => s.id === showId) ?? null;

	const loadSeasons = useCallback(async () => {
		if (!showId) return;
		try {
			const result = await fetchSeasons(showId);
			setSeasons(result);
		} catch (err) {
			console.error('Failed to fetch seasons:', err);
		}
	}, [showId]);

	useEffect(() => {
		loadSeasons();
	}, [loadSeasons]);

	if (!show) {
		return (
			<Div style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<Text type='body' colorVariant='muted'>
					Loading...
				</Text>
			</Div>
		);
	}

	return (
		<ScrollView style={{ flex: 1, backgroundColor }} showsVerticalScrollIndicator={false}>
			{show.backdropUrl ? (
				<Image source={{ uri: show.backdropUrl }} style={styles.backdrop} />
			) : (
				<View style={[styles.backdrop, { backgroundColor: '#1a1a1a' }]} />
			)}

			<Div transparent style={styles.content}>
				<Text type='h1'>{show.title}</Text>

				<Div transparent style={styles.meta}>
					{show.year && <Text type='bodyXS' colorVariant='muted'>{show.year}</Text>}
					{show.contentRating && <Text type='bodyXS' colorVariant='muted'>{show.contentRating}</Text>}
					{show.seasonCount != null && (
						<Text type='bodyXS' colorVariant='muted'>
							{show.seasonCount} {show.seasonCount === 1 ? 'Season' : 'Seasons'}
						</Text>
					)}
				</Div>

				{show.genres.length > 0 && (
					<Text type='bodyXS' colorVariant='muted'>
						{show.genres.join(' · ')}
					</Text>
				)}

				{show.summary && (
					<Text type='body' style={styles.summary}>
						{show.summary}
					</Text>
				)}

				<Div transparent style={styles.seasonsSection}>
					<Text type='h2' style={{ marginBottom: 12 }}>
						Seasons
					</Text>
					{seasons.map((season) => (
						<TouchableOpacity
							key={season.id}
							style={styles.seasonRow}
							onPress={() => router.push(`/(tabs)/(shows)/season/${season.id}`)}
							activeOpacity={0.7}
						>
							{season.posterUrl ? (
								<Image source={{ uri: season.posterUrl }} style={styles.seasonThumb} />
							) : (
								<View style={[styles.seasonThumb, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
									<Text type='bodyXS' colorVariant='muted'>S{season.seasonNumber}</Text>
								</View>
							)}
							<Div transparent style={{ flex: 1, justifyContent: 'center' }}>
								<Text type='body'>{season.title}</Text>
								{season.episodeCount != null && (
									<Text type='bodyXS' colorVariant='muted'>
										{season.episodeCount} {season.episodeCount === 1 ? 'Episode' : 'Episodes'}
									</Text>
								)}
							</Div>
						</TouchableOpacity>
					))}
				</Div>
			</Div>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	backdrop: { width: SCREEN_WIDTH, height: BACKDROP_HEIGHT },
	content: { padding: 16, gap: 10, paddingBottom: 100 },
	meta: { flexDirection: 'row', gap: 12 },
	summary: { lineHeight: 22, marginTop: 4 },
	seasonsSection: { marginTop: 16 },
	seasonRow: {
		flexDirection: 'row',
		gap: 12,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: Colors.surfaceDark,
	},
	seasonThumb: { width: 70, height: 105, borderRadius: 6 },
});
