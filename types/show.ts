export interface Show {
	id: string;
	title: string;
	year?: number;
	summary?: string;
	posterUrl?: string;
	backdropUrl?: string;
	rating?: number;
	contentRating?: string;
	genres: string[];
	studio?: string;
	seasonCount?: number;
	episodeCount?: number;
	addedAt?: number;
	lastViewedAt?: number;
}
