import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { VideoControls } from '@/components/Player/VideoControls';
import { useVideoPlayerStore, type PlayableItem } from '@/hooks/useVideoPlayerStore';
import { plexClient } from '@/utils/plex-client';
import { fetchEpisodeDetail, fetchMovieDetail, scrobble } from '@/utils/plex';

export default function PlayerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const store = useVideoPlayerStore();
	const [item, setItem] = useState<PlayableItem | null>(null);
	const [streamUrl, setStreamUrl] = useState<string | null>(null);
	const positionInterval = useRef<ReturnType<typeof setInterval>>(undefined);

	const loadItem = useCallback(async () => {
		if (!id) return;

		const movie = await fetchMovieDetail(id);
		if (movie && movie.mediaKey) {
			const playable: PlayableItem = { ...movie, type: 'movie' };
			setItem(playable);
			setStreamUrl(plexClient.buildMediaURL(movie.mediaKey));
			store.playVideo(playable);
			return;
		}

		const episode = await fetchEpisodeDetail(id);
		if (episode && episode.mediaKey) {
			const playable: PlayableItem = { ...episode, type: 'episode' };
			setItem(playable);
			setStreamUrl(plexClient.buildMediaURL(episode.mediaKey));
			store.playVideo(playable);
		}
	}, [id]);

	useEffect(() => {
		loadItem();
	}, [loadItem]);

	useEffect(() => {
		ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
		return () => {
			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
		};
	}, []);

	const player = useVideoPlayer(streamUrl ?? '', (p) => {
		if (!streamUrl) return;
		p.play();
		if (item?.viewOffset && item.viewOffset > 0) {
			p.currentTime = item.viewOffset / 1000;
		}
	});

	useEffect(() => {
		if (!player) return;

		positionInterval.current = setInterval(() => {
			if (player.currentTime != null) {
				store.setPosition(player.currentTime * 1000);
			}
			if (player.duration != null && player.duration > 0) {
				store.setDuration(player.duration * 1000);
			}
			store.setPlaying(player.playing);
			store.setBuffering(player.status === 'loading');
		}, 500);

		return () => {
			if (positionInterval.current) clearInterval(positionInterval.current);
		};
	}, [player]);

	const handleClose = useCallback(() => {
		store.stop();
		if (item) {
			const watchedPercent = store.duration > 0 ? store.position / store.duration : 0;
			if (watchedPercent > 0.9) {
				scrobble(item.id).catch(() => {});
			}
		}
		router.back();
	}, [item, store, router]);

	const handlePlayPause = useCallback(() => {
		if (!player) return;
		if (player.playing) {
			player.pause();
		} else {
			player.play();
		}
	}, [player]);

	const handleSeek = useCallback(
		(positionMs: number) => {
			if (!player) return;
			player.currentTime = positionMs / 1000;
			store.setPosition(positionMs);
		},
		[player],
	);

	const handleSkipBack = useCallback(() => {
		if (!player) return;
		player.currentTime = Math.max(0, player.currentTime - 10);
	}, [player]);

	const handleSkipForward = useCallback(() => {
		if (!player) return;
		player.currentTime = player.currentTime + 10;
	}, [player]);

	const subtitle =
		item && 'episodeNumber' in item ? `S${item.seasonNumber} E${item.episodeNumber}` : undefined;

	if (!streamUrl) {
		return <View style={styles.container} />;
	}

	return (
		<View style={styles.container}>
			<StatusBar hidden />
			<VideoView
				player={player}
				style={StyleSheet.absoluteFill}
				nativeControls={false}
				contentFit='contain'
			/>
			<VideoControls
				isPlaying={store.isPlaying}
				position={store.position}
				duration={store.duration}
				title={item?.title ?? ''}
				subtitle={subtitle}
				onPlayPause={handlePlayPause}
				onSeek={handleSeek}
				onSkipBack={handleSkipBack}
				onSkipForward={handleSkipForward}
				onClose={handleClose}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#000' },
});
