export interface Episode {
	id: string;
	showId: string;
	seasonId: string;
	title: string;
	seasonNumber: number;
	episodeNumber: number;
	duration: number;
	summary?: string;
	thumbUrl?: string;
	rating?: number;
	addedAt?: number;
	lastViewedAt?: number;
	viewOffset?: number;
	viewCount?: number;
	mediaKey?: string;
}
