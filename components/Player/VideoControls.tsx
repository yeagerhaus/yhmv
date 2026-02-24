import Slider from '@react-native-community/slider';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Animated, Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../Text';
import type { PlexSubtitleTrack } from '@/types/subtitle';

const AUTO_HIDE_MS = 4000;

interface VideoControlsProps {
	isPlaying: boolean;
	position: number;
	duration: number;
	bufferedPosition?: number;
	title: string;
	subtitle?: string;
	onPlayPause: () => void;
	onSeek: (position: number) => void;
	onSkipBack: () => void;
	onSkipForward: () => void;
	onClose: () => void;
	onRestart?: () => void;
	onPrevious?: () => void;
	onNext?: () => void;
	hasPrevious?: boolean;
	hasNext?: boolean;
	subtitleTracks?: PlexSubtitleTrack[];
	selectedSubtitleIndex?: number | null;
	onSubtitleSelect?: (index: number | null) => void;
}

function formatTime(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');

	if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
	return `${minutes}:${pad(seconds)}`;
}

export function VideoControls({
	isPlaying,
	position,
	duration,
	bufferedPosition,
	title,
	subtitle,
	onPlayPause,
	onSeek,
	onSkipBack,
	onSkipForward,
	onClose,
	onRestart,
	onPrevious,
	onNext,
	hasPrevious,
	hasNext,
	subtitleTracks,
	selectedSubtitleIndex,
	onSubtitleSelect,
}: VideoControlsProps) {
	const [visible, setVisible] = useState(true);
	const [scrubbing, setScrubbing] = useState(false);
	const [scrubPosition, setScrubPosition] = useState(0);
	const opacity = useRef(new Animated.Value(1)).current;
	const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

	const show = () => {
		setVisible(true);
		Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
		resetHideTimer();
	};

	const hide = () => {
		Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
			setVisible(false);
		});
	};

	const resetHideTimer = () => {
		if (hideTimer.current) clearTimeout(hideTimer.current);
		if (isPlaying) {
			hideTimer.current = setTimeout(hide, AUTO_HIDE_MS);
		}
	};

	useEffect(() => {
		resetHideTimer();
		return () => {
			if (hideTimer.current) clearTimeout(hideTimer.current);
		};
	}, [isPlaying]);

	const toggleVisibility = () => {
		if (visible) {
			hide();
		} else {
			show();
		}
	};

	const progress = duration > 0 ? position / duration : 0;
	const displayPosition = scrubbing ? scrubPosition : position;
	const displayProgress = duration > 0 ? displayPosition / duration : 0;
	const bufferedRatio =
		duration > 0 && bufferedPosition != null && bufferedPosition > 0
			? Math.min(bufferedPosition / duration, 1)
			: 0;

	const handleSlidingStart = () => {
		setScrubbing(true);
		setScrubPosition(position);
	};

	const handleValueChange = (value: number) => {
		setScrubPosition(value * duration);
	};

	const handleSlidingComplete = (value: number) => {
		setScrubbing(false);
		const positionMs = value * duration;
		onSeek(Math.max(0, Math.min(positionMs, duration)));
	};

	const showSubtitlePicker = () => {
		if (!subtitleTracks?.length || !onSubtitleSelect) return;
		const options = ['None', ...subtitleTracks.map((t) => t.displayTitle || t.language || t.codec || `Track ${t.index + 1}`)];
		const cancelButtonIndex = 0;
		if (Platform.OS === 'ios') {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: [...options, 'Cancel'],
					cancelButtonIndex: options.length,
				},
				(buttonIndex) => {
					if (buttonIndex === options.length) return;
					onSubtitleSelect(buttonIndex === 0 ? null : subtitleTracks[buttonIndex - 1].index);
				},
			);
		} else {
			Alert.alert(
				'Subtitles',
				undefined,
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'None', onPress: () => onSubtitleSelect(null) },
					...subtitleTracks.map((t) => ({
						text: t.displayTitle || t.language || t.codec || `Track ${t.index + 1}`,
						onPress: () => onSubtitleSelect(t.index),
					})),
				],
			);
		}
	};

	return (
		<Pressable style={StyleSheet.absoluteFill} onPress={toggleVisibility}>
			<Animated.View style={[styles.overlay, { opacity }]} pointerEvents={visible ? 'auto' : 'none'}>
				{/* Top bar */}
				<View style={styles.topBar}>
					<TouchableOpacity onPress={onClose} hitSlop={20}>
						<SymbolView name='xmark' type='monochrome' tintColor='#fff' size={22} />
					</TouchableOpacity>
					<View style={{ flex: 1, alignItems: 'center' }}>
						<Text type='body' style={styles.titleText} numberOfLines={1}>
							{title}
						</Text>
						{subtitle && (
							<Text type='bodyXS' style={styles.subtitleText} numberOfLines={1}>
								{subtitle}
							</Text>
						)}
					</View>
					{subtitleTracks && subtitleTracks.length > 0 ? (
						<TouchableOpacity onPress={showSubtitlePicker} hitSlop={20}>
							<SymbolView
								name={selectedSubtitleIndex != null ? 'captions.bubble.fill' : 'captions.bubble'}
								type='monochrome'
								tintColor='#fff'
								size={22}
							/>
						</TouchableOpacity>
					) : (
						<View style={{ width: 22 }} />
					)}
				</View>

				{/* Center controls */}
				<View style={styles.centerControls}>
					{hasPrevious && onPrevious ? (
						<TouchableOpacity onPress={onPrevious} hitSlop={20}>
							<SymbolView name='backward.end.fill' type='monochrome' tintColor='#fff' size={36} />
						</TouchableOpacity>
					) : (
						<View style={styles.placeholderButton} />
					)}
					<TouchableOpacity onPress={onSkipBack} hitSlop={20}>
						<SymbolView name='gobackward.10' type='monochrome' tintColor='#fff' size={36} />
					</TouchableOpacity>
					{/* {onRestart ? (
						<TouchableOpacity onPress={onRestart} hitSlop={20}>
							<SymbolView name='arrow.counterclockwise' type='monochrome' tintColor='#fff' size={28} />
						</TouchableOpacity>
					) : (
						<View style={styles.placeholderButton} />
					)} */}
					<TouchableOpacity onPress={onPlayPause} hitSlop={20} style={styles.playButton}>
						<SymbolView
							name={isPlaying ? 'pause.fill' : 'play.fill'}
							type='monochrome'
							tintColor='#fff'
							size={44}
						/>
					</TouchableOpacity>
					<TouchableOpacity onPress={onSkipForward} hitSlop={20}>
						<SymbolView name='goforward.10' type='monochrome' tintColor='#fff' size={36} />
					</TouchableOpacity>
					{hasNext && onNext ? (
						<TouchableOpacity onPress={onNext} hitSlop={20}>
							<SymbolView name='forward.end.fill' type='monochrome' tintColor='#fff' size={36} />
						</TouchableOpacity>
					) : (
						<View style={styles.placeholderButton} />
					)}
				</View>

				{/* Bottom bar - progress */}
				<View style={styles.bottomBar}>
					<Text type='bodyXS' style={styles.timeText}>
						{formatTime(displayPosition)}
					</Text>
					<View style={styles.progressBar}>
						<View style={styles.progressTrack}>
							<View style={[styles.bufferedFill, { width: `${bufferedRatio * 100}%` }]} />
							<View style={[styles.progressFill, { width: `${displayProgress * 100}%` }]} />
						</View>
						<Slider
							style={styles.slider}
							minimumValue={0}
							maximumValue={duration > 0 ? 1 : 1}
							value={scrubbing ? displayProgress : progress}
							minimumTrackTintColor='transparent'
							maximumTrackTintColor='transparent'
							thumbTintColor='#fff'
							onSlidingStart={handleSlidingStart}
							onValueChange={handleValueChange}
							onSlidingComplete={handleSlidingComplete}
						/>
					</View>
					<Text type='bodyXS' style={styles.timeText}>
						{formatTime(duration)}
					</Text>
				</View>
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'space-between',
		padding: 16,
	},
	topBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 32,
		paddingTop: 16,
		gap: 12,
	},
	titleText: { color: '#fff', fontWeight: '600' },
	subtitleText: { color: 'rgba(255,255,255,0.7)', marginTop: 2 },
	centerControls: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 24,
	},
	placeholderButton: { width: 36, height: 36 },
	playButton: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: 'rgba(255,255,255,0.15)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bottomBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 24,
		gap: 10,
	},
	timeText: { color: '#fff', minWidth: 50, textAlign: 'center' },
	progressBar: { flex: 1, height: 30, justifyContent: 'center' },
	progressTrack: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 4,
		backgroundColor: 'rgba(255,255,255,0.3)',
		borderRadius: 2,
		overflow: 'hidden',
	},
	bufferedFill: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		backgroundColor: 'rgba(255,255,255,0.2)',
		borderRadius: 2,
	},
	progressFill: { height: 4, backgroundColor: '#7f62f5', borderRadius: 2 },
	slider: {
		flex: 1,
		height: 30,
	},
});
