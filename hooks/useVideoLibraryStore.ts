import { create } from 'zustand';
import type { Episode } from '@/types/episode';
import type { Movie } from '@/types/movie';
import type { Show } from '@/types/show';

interface VideoLibraryState {
	movies: Movie[];
	shows: Show[];
	onDeck: (Movie | Episode)[];
	recentlyAddedMovies: Movie[];
	recentlyAddedShows: Show[];
	isLoading: boolean;
	lastFetchedAt: number | null;

	setMovies: (movies: Movie[]) => void;
	setShows: (shows: Show[]) => void;
	setOnDeck: (items: (Movie | Episode)[]) => void;
	setRecentlyAddedMovies: (movies: Movie[]) => void;
	setRecentlyAddedShows: (shows: Show[]) => void;
	setLoading: (loading: boolean) => void;
}

export const useVideoLibraryStore = create<VideoLibraryState>((set) => ({
	movies: [],
	shows: [],
	onDeck: [],
	recentlyAddedMovies: [],
	recentlyAddedShows: [],
	isLoading: false,
	lastFetchedAt: null,

	setMovies: (movies) => set({ movies, lastFetchedAt: Date.now() }),
	setShows: (shows) => set({ shows, lastFetchedAt: Date.now() }),
	setOnDeck: (onDeck) => set({ onDeck }),
	setRecentlyAddedMovies: (recentlyAddedMovies) => set({ recentlyAddedMovies }),
	setRecentlyAddedShows: (recentlyAddedShows) => set({ recentlyAddedShows }),
	setLoading: (isLoading) => set({ isLoading }),
}));
