import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../Text';

const SCREEN_WIDTH = Dimensions.get('window').width;
const AUTO_HIDE_MS = 4000;

interface VideoControlsProps {
	isPlaying: boolean;
	position: number;
	duration: number;
	title: string;
	subtitle?: string;
	onPlayPause: () => void;
	onSeek: (position: number) => void;
	onSkipBack: () => void;
	onSkipForward: () => void;
	onClose: () => void;
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
	title,
	subtitle,
	onPlayPause,
	onSeek,
	onSkipBack,
	onSkipForward,
	onClose,
}: VideoControlsProps) {
	const [visible, setVisible] = useState(true);
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

	const handleSeekPress = (e: any) => {
		const x = e.nativeEvent.locationX;
		const barWidth = SCREEN_WIDTH - 32;
		const seekPosition = (x / barWidth) * duration;
		onSeek(Math.max(0, Math.min(seekPosition, duration)));
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
					<View style={{ width: 22 }} />
				</View>

				{/* Center controls */}
				<View style={styles.centerControls}>
					<TouchableOpacity onPress={onSkipBack} hitSlop={20}>
						<SymbolView name='gobackward.10' type='monochrome' tintColor='#fff' size={36} />
					</TouchableOpacity>

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
				</View>

				{/* Bottom bar - progress */}
				<View style={styles.bottomBar}>
					<Text type='bodyXS' style={styles.timeText}>
						{formatTime(position)}
					</Text>
					<Pressable style={styles.progressBar} onPress={handleSeekPress}>
						<View style={styles.progressTrack}>
							<View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
						</View>
					</Pressable>
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
	},
	topBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 16,
		gap: 12,
	},
	titleText: { color: '#fff', fontWeight: '600' },
	subtitleText: { color: 'rgba(255,255,255,0.7)', marginTop: 2 },
	centerControls: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 48,
	},
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
		height: 4,
		backgroundColor: 'rgba(255,255,255,0.3)',
		borderRadius: 2,
		overflow: 'hidden',
	},
	progressFill: { height: 4, backgroundColor: '#7f62f5', borderRadius: 2 },
});
