import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { VideoControls } from '@/components/Player/VideoControls';
import { useVideoPlayerStore, type PlayableItem } from '@/hooks/useVideoPlayerStore';
import { plexAuthService } from '@/utils/plex-auth';
import { plexClient } from '@/utils/plex-client';
import { fetchEpisodeDetail, fetchEpisodes, fetchMovieDetail, scrobble } from '@/utils/plex';

export default function PlayerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const store = useVideoPlayerStore();
	const [item, setItem] = useState<PlayableItem | null>(null);
	const [streamUrl, setStreamUrl] = useState<string | null>(null);
	const [nextEpisodeId, setNextEpisodeId] = useState<string | null>(null);
	const [prevEpisodeId, setPrevEpisodeId] = useState<string | null>(null);
	const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
	const prevSubtitleIndexRef = useRef<number | null | undefined>(undefined);
	const seekAppliedRef = useRef(false);

	const loadItem = useCallback(async () => {
		if (!id) return;

		// Ensure client is ready (fast no-op when already initialized from browsing)
		await plexClient.initialize();

		// Start the player immediately — id IS the ratingKey, no metadata fetch needed first
		const startUrl = plexClient.buildTranscodeURL(id);
		setStreamUrl(startUrl);

		// Fetch metadata concurrently while the player is already buffering
		const movie = await fetchMovieDetail(id);
		if (movie && movie.mediaKey) {
			const playable: PlayableItem = { ...movie, type: 'movie' };
			setItem(playable);
			useVideoPlayerStore.getState().playVideo(playable);
			setNextEpisodeId(null);
			setPrevEpisodeId(null);
			return;
		}

		const episode = await fetchEpisodeDetail(id);
		if (episode && episode.mediaKey) {
			const playable: PlayableItem = { ...episode, type: 'episode' };
			setItem(playable);
			useVideoPlayerStore.getState().playVideo(playable);
			const seasonEpisodes = await fetchEpisodes(episode.seasonId);
			const idx = seasonEpisodes.findIndex((ep) => ep.id === id);
			setNextEpisodeId(idx >= 0 && idx < seasonEpisodes.length - 1 ? seasonEpisodes[idx + 1].id : null);
			setPrevEpisodeId(idx > 0 ? seasonEpisodes[idx - 1].id : null);
		} else {
			setNextEpisodeId(null);
			setPrevEpisodeId(null);
		}
	}, [id]);

	useEffect(() => {
		seekAppliedRef.current = false;
		loadItem();
	}, [loadItem]);

	useEffect(() => {
		ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
		return () => {
			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
		};
	}, []);

	const token = plexAuthService.getAccessToken();
	const videoSource = streamUrl
		? {
				uri: streamUrl,
				contentType: 'hls' as const,
				...(token && { headers: { 'X-Plex-Token': token } }),
			}
		: '';
	const player = useVideoPlayer(videoSource, (p) => {
		if (!streamUrl) return;
		p.play();
	});

	// Seek to resume position once metadata arrives (player is already buffering by then)
	useEffect(() => {
		if (!player || !item || seekAppliedRef.current) return;
		if (item.viewOffset && item.viewOffset > 0) {
			player.currentTime = item.viewOffset / 1000;
		}
		seekAppliedRef.current = true;
	}, [item, player]);

	// Use timeUpdate for snappier position updates (no setInterval)
	useEffect(() => {
		if (!player) return;
		player.timeUpdateEventInterval = 0.25;
		const sub = player.addListener('timeUpdate', (payload) => {
			if (payload.currentTime != null) {
				store.setPosition(payload.currentTime * 1000);
			}
			if (player.duration != null && player.duration > 0) {
				store.setDuration(player.duration * 1000);
			}
			store.setPlaying(player.playing);
			store.setBuffering(player.status === 'loading');
		});
		return () => sub.remove();
	}, [player, store]);

	// Apply subtitle selection by replacing the source (only when user changes subtitle)
	useEffect(() => {
		if (!player || !id) return;
		if (prevSubtitleIndexRef.current === undefined) {
			prevSubtitleIndexRef.current = selectedSubtitleIndex;
			return;
		}
		if (prevSubtitleIndexRef.current === selectedSubtitleIndex) return;
		prevSubtitleIndexRef.current = selectedSubtitleIndex;
		const url = plexClient.buildTranscodeURL(id, {
			subtitleStreamIndex: selectedSubtitleIndex ?? undefined,
		});
		const token = plexAuthService.getAccessToken();
		const source = {
			uri: url,
			contentType: 'hls' as const,
			...(token && { headers: { 'X-Plex-Token': token } }),
		};
		player.replace(source);
	}, [player, id, selectedSubtitleIndex]);

	// Debug: log player status and errors
	useEffect(() => {
		if (!player || !streamUrl) return;
		const sub = player.addListener('statusChange', (payload) => {
			console.log('[Player] status:', payload.status, payload.oldStatus ? `(from ${payload.oldStatus})` : '');
			if (payload.error) {
				console.error('[Player] error:', payload.error.message ?? payload.error);
			}
		});
		return () => sub.remove();
	}, [player, streamUrl]);

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
			store.setPosition(positionMs);
			player.currentTime = positionMs / 1000;
		},
		[player, store],
	);

	const handleSkipBack = useCallback(() => {
		if (!player) return;
		player.currentTime = Math.max(0, player.currentTime - 10);
	}, [player]);

	const handleSkipForward = useCallback(() => {
		if (!player) return;
		player.currentTime = player.currentTime + 10;
	}, [player]);

	const handleRestart = useCallback(() => {
		if (!player) return;
		player.replay();
		store.setPosition(0);
	}, [player, store]);

	const handleNext = useCallback(() => {
		if (!nextEpisodeId) return;
		store.stop();
		router.replace(`/player/${nextEpisodeId}`);
	}, [nextEpisodeId, store, router]);

	const handlePrevious = useCallback(() => {
		if (!prevEpisodeId) return;
		store.stop();
		router.replace(`/player/${prevEpisodeId}`);
	}, [prevEpisodeId, store, router]);

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
				allowsPictureInPicture
				contentFit='contain'
			/>
			<VideoControls
				isPlaying={store.isPlaying}
				position={store.position}
				duration={store.duration}
				bufferedPosition={player.bufferedPosition >= 0 ? player.bufferedPosition * 1000 : undefined}
				title={item?.title ?? ''}
				subtitle={subtitle}
				onPlayPause={handlePlayPause}
				onSeek={handleSeek}
				onSkipBack={handleSkipBack}
				onSkipForward={handleSkipForward}
				onClose={handleClose}
				onRestart={handleRestart}
				onPrevious={handlePrevious}
				onNext={handleNext}
				hasPrevious={!!prevEpisodeId}
				hasNext={!!nextEpisodeId}
				subtitleTracks={item?.subtitleTracks}
				selectedSubtitleIndex={selectedSubtitleIndex}
				onSubtitleSelect={setSelectedSubtitleIndex}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#000' },
});
