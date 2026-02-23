import { useRouter } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Episode } from '@/types/episode';
import type { Movie } from '@/types/movie';
import { Text } from './Text';

interface ContinueWatchingCardProps {
	item: Movie | Episode;
}

function isEpisode(item: Movie | Episode): item is Episode {
	return 'episodeNumber' in item;
}

export function ContinueWatchingCard({ item }: ContinueWatchingCardProps) {
	const router = useRouter();
	const thumbUrl = isEpisode(item) ? item.thumbUrl : item.backdropUrl ?? item.posterUrl;
	const progress = item.viewOffset && item.duration ? item.viewOffset / item.duration : 0;

	const subtitle = isEpisode(item)
		? `S${item.seasonNumber} E${item.episodeNumber}`
		: item.year
			? String(item.year)
			: '';

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={() => router.push(`/player/${item.id}`)}
			activeOpacity={0.7}
		>
			{thumbUrl ? (
				<Image source={{ uri: thumbUrl }} style={styles.backdrop} />
			) : (
				<View style={[styles.backdrop, styles.placeholder]}>
					<Text type='bodyXS' colorVariant='muted'>
						No Image
					</Text>
				</View>
			)}
			{progress > 0 && (
				<View style={styles.progressBarBg}>
					<View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
				</View>
			)}
			<View style={styles.infoOverlay}>
				<Text type='bodyXS' numberOfLines={1} style={styles.title}>
					{item.title}
				</Text>
				{subtitle !== '' && (
					<Text type='bodyXS' colorVariant='muted' numberOfLines={1}>
						{subtitle}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: { width: 260, marginRight: 0 },
	backdrop: { width: 260, height: 146, borderRadius: 8, backgroundColor: '#1a1a1a' },
	placeholder: { alignItems: 'center', justifyContent: 'center' },
	progressBarBg: {
		position: 'absolute',
		top: 143,
		left: 0,
		right: 0,
		height: 3,
		backgroundColor: 'rgba(255,255,255,0.2)',
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	},
	progressBarFill: { height: 3, backgroundColor: '#7f62f5', borderBottomLeftRadius: 8 },
	infoOverlay: { marginTop: 6 },
	title: { fontWeight: '600' },
});
