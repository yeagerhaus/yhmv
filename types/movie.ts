import type { PlexSubtitleTrack } from './subtitle';

export interface Movie {
	id: string;
	title: string;
	year?: number;
	duration: number;
	summary?: string;
	posterUrl?: string;
	backdropUrl?: string;
	rating?: number;
	contentRating?: string;
	genres: string[];
	studio?: string;
	addedAt?: number;
	lastViewedAt?: number;
	viewOffset?: number;
	viewCount?: number;
	mediaKey?: string;
	subtitleTracks?: PlexSubtitleTrack[];
}
