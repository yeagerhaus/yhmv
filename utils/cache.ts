import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { getIsOfflineMode } from '@/hooks/useOfflineModeStore';
import type { Movie } from '@/types/movie';
import type { Show } from '@/types/show';

let useVideoLibraryStore: any;
try {
	useVideoLibraryStore = require('@/hooks/useVideoLibraryStore').useVideoLibraryStore;
} catch {}

const STORAGE_LIBRARY_KEY = 'VIDEO_LIBRARY_STATE';

interface VideoCachePayload {
	movies: Movie[];
	shows: Show[];
	lastFetchedAt?: number;
}

function getStore() {
	if (!useVideoLibraryStore) {
		useVideoLibraryStore = require('@/hooks/useVideoLibraryStore').useVideoLibraryStore;
	}
	return useVideoLibraryStore;
}

export async function saveLibraryToCache() {
	try {
		const state = getStore().getState();
		const payload: VideoCachePayload = {
			movies: state.movies,
			shows: state.shows,
			lastFetchedAt: Date.now(),
		};
		await AsyncStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(payload));
	} catch (err) {
		console.error('Failed to save library state:', err);
	}
}

export async function loadLibraryFromCache(): Promise<VideoCachePayload | null> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_LIBRARY_KEY);
		if (!raw) return null;

		const parsed = JSON.parse(raw);
		if (parsed?.movies && Array.isArray(parsed.movies)) {
			return {
				movies: parsed.movies,
				shows: Array.isArray(parsed.shows) ? parsed.shows : [],
				lastFetchedAt: parsed.lastFetchedAt,
			};
		}

		return null;
	} catch (err) {
		console.error('Failed to load library from cache:', err);
		return null;
	}
}

export async function rehydrateLibraryStore(): Promise<boolean> {
	const cached = await loadLibraryFromCache();
	if (!cached || (cached.movies.length === 0 && cached.shows.length === 0)) {
		return false;
	}

	const store = getStore();
	store.setState({
		movies: cached.movies,
		shows: cached.shows,
	});

	return true;
}

export async function clearLibraryCache() {
	try {
		await AsyncStorage.removeItem(STORAGE_LIBRARY_KEY);
	} catch (err) {
		console.error('Failed to clear library cache:', err);
	}
}

export async function clearCacheAndReload(): Promise<number> {
	if (getIsOfflineMode()) return 0;

	const { fetchMovies, fetchShows } = require('@/utils/plex');
	const store = getStore();

	try {
		const [movies, shows] = await Promise.all([fetchMovies(), fetchShows()]);

		const state = store.getState();
		if (movies.length > 0) state.setMovies(movies);
		if (shows.length > 0) state.setShows(shows);

		InteractionManager.runAfterInteractions(() => {
			saveLibraryToCache().catch((err: any) => console.warn('Cache save failed:', err));
		});

		return movies.length + shows.length;
	} catch (err) {
		console.error('Failed to reload library:', err);
		return 0;
	}
}
