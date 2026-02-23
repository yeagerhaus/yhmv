import { useRouter } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Episode } from '@/types/episode';
import { Text } from '../Text';

interface EpisodeItemProps {
	episode: Episode;
}

function formatDuration(ms: number): string {
	const minutes = Math.round(ms / 60000);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours}h ${remainingMinutes}m`;
}

export function EpisodeItem({ episode }: EpisodeItemProps) {
	const router = useRouter();

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={() => router.push(`/player/${episode.id}`)}
			activeOpacity={0.7}
		>
			<View style={styles.thumbContainer}>
				{episode.thumbUrl ? (
					<Image source={{ uri: episode.thumbUrl }} style={styles.thumb} />
				) : (
					<View style={[styles.thumb, styles.placeholder]}>
						<Text type='bodyXS' colorVariant='muted'>
							No Thumb
						</Text>
					</View>
				)}
				{episode.viewOffset != null && episode.viewOffset > 0 && episode.duration > 0 && (
					<View style={styles.progressBarBg}>
						<View style={[styles.progressBarFill, { width: `${(episode.viewOffset / episode.duration) * 100}%` }]} />
					</View>
				)}
			</View>
			<View style={styles.info}>
				<Text type='bodyXS' colorVariant='muted'>
					E{episode.episodeNumber}
					{episode.duration > 0 ? ` · ${formatDuration(episode.duration)}` : ''}
				</Text>
				<Text type='body' numberOfLines={2}>
					{episode.title}
				</Text>
				{episode.summary && (
					<Text type='bodyXS' colorVariant='muted' numberOfLines={2} style={{ marginTop: 2 }}>
						{episode.summary}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
	thumbContainer: { position: 'relative' },
	thumb: { width: 160, height: 90, borderRadius: 6, backgroundColor: '#1a1a1a' },
	placeholder: { alignItems: 'center', justifyContent: 'center' },
	info: { flex: 1, justifyContent: 'center', gap: 2 },
	progressBarBg: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 3,
		backgroundColor: 'rgba(255,255,255,0.2)',
		borderBottomLeftRadius: 6,
		borderBottomRightRadius: 6,
	},
	progressBarFill: { height: 3, backgroundColor: '#7f62f5', borderBottomLeftRadius: 6 },
});
