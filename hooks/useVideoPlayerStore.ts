import { create } from 'zustand';
import type { Episode } from '@/types/episode';
import type { Movie } from '@/types/movie';
import { reportTimeline } from '@/utils/plex';

type PlayableItem = (Movie | Episode) & { type: 'movie' | 'episode'; showTitle?: string };

interface VideoPlayerState {
	currentItem: PlayableItem | null;
	isPlaying: boolean;
	position: number;
	duration: number;
	isBuffering: boolean;

	playVideo: (item: PlayableItem) => void;
	setPlaying: (playing: boolean) => void;
	setPosition: (position: number) => void;
	setDuration: (duration: number) => void;
	setBuffering: (buffering: boolean) => void;
	stop: () => void;
	reportProgress: () => Promise<void>;
}

let reportTimer: ReturnType<typeof setTimeout> | null = null;

export const useVideoPlayerStore = create<VideoPlayerState>((set, get) => ({
	currentItem: null,
	isPlaying: false,
	position: 0,
	duration: 0,
	isBuffering: false,

	playVideo: (item) => {
		set({ currentItem: item, isPlaying: true, position: item.viewOffset ?? 0, duration: item.duration, isBuffering: true });
		startPeriodicReporting(get);
	},

	setPlaying: (isPlaying) => {
		set({ isPlaying });
		if (!isPlaying) {
			get().reportProgress();
		}
	},

	setPosition: (position) => set({ position }),
	setDuration: (duration) => set({ duration }),
	setBuffering: (isBuffering) => set({ isBuffering }),

	stop: () => {
		const state = get();
		if (state.currentItem) {
			reportTimeline(state.currentItem.id, 'stopped', state.position, state.duration).catch(() => {});
		}
		if (reportTimer) {
			clearInterval(reportTimer);
			reportTimer = null;
		}
		set({ currentItem: null, isPlaying: false, position: 0, duration: 0, isBuffering: false });
	},

	reportProgress: async () => {
		const { currentItem, isPlaying, position, duration } = get();
		if (!currentItem) return;
		const state = isPlaying ? 'playing' : 'paused';
		try {
			await reportTimeline(currentItem.id, state, position, duration);
		} catch {
			// non-critical
		}
	},
}));

function startPeriodicReporting(get: () => VideoPlayerState) {
	if (reportTimer) clearInterval(reportTimer);
	reportTimer = setInterval(() => {
		const state = get();
		if (state.currentItem && state.isPlaying) {
			state.reportProgress();
		}
	}, 10000);
}

export type { PlayableItem };
