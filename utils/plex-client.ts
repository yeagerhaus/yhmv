import { fetch } from 'expo/fetch';
import { getIsOfflineMode } from '@/hooks/useOfflineModeStore';
import type { Episode } from '@/types/episode';
import type { Movie } from '@/types/movie';
import type { Season } from '@/types/season';
import type { Show } from '@/types/show';
import { plexAuthService } from './plex-auth';
import { plexDiscoveryService } from './plex-discovery';

const OFFLINE_MODE_MESSAGE = 'Offline mode is on. Disable in Settings to fetch library data.';

const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 10000,
	backoffMultiplier: 2,
};

const TIMEOUT_CONFIG = {
	connectTimeout: 15000,
	requestTimeout: 30000,
};

export interface PlexError extends Error {
	code?: string;
	status?: number;
	retryable?: boolean;
}

export interface PlexResponse<T = any> {
	data: T;
	status: number;
	headers: Record<string, string>;
}

export class PlexClient {
	private baseURL: string = '';
	private token: string | null = null;
	private movieSectionId: string | null = null;
	private showSectionId: string | null = null;
	private initialized: boolean = false;
	private initPromise: Promise<void> | null = null;

	constructor(baseURL?: string) {
		if (baseURL) {
			this.baseURL = baseURL.replace(/\/$/, '');
		}
	}

	async initialize(): Promise<void> {
		if (getIsOfflineMode()) {
			throw new Error(OFFLINE_MODE_MESSAGE);
		}
		if (this.initPromise) {
			return this.initPromise;
		}

		if (this.initialized) {
			const selectedServer = plexAuthService.getSelectedServer();
			if (selectedServer && this.baseURL && this.token) {
				return;
			}
			this.initialized = false;
		}

		this.initPromise = this._doInitialize();
		try {
			await this.initPromise;
			this.initialized = true;
		} finally {
			this.initPromise = null;
		}
	}

	private async _doInitialize(): Promise<void> {
		// Ensure auth state is loaded from storage before checking (avoids race with Home/tabs mounting first)
		await plexAuthService.loadAuthState();

		if (!plexAuthService.isAuthenticated()) {
			throw new Error('No Plex authentication available. Please sign in through Settings.');
		}

		const selectedServer = plexAuthService.getSelectedServer();
		if (!selectedServer) {
			throw new Error('No Plex server selected. Please select a server in Settings.');
		}

		if (!selectedServer.uri) {
			throw new Error(`Server "${selectedServer.name}" has no valid URI. Please refresh servers in Settings.`);
		}

		let serverUri = selectedServer.uri.trim();
		serverUri = serverUri
			.replace(/\/playlists.*$/, '')
			.replace(/\/library.*$/, '')
			.replace(/\/status.*$/, '')
			.replace(/\/$/, '');

		if (!serverUri.match(/^https?:\/\/.+/)) {
			if (selectedServer.address && selectedServer.port) {
				const protocol = selectedServer.local ? 'http' : 'https';
				serverUri = `${protocol}://${selectedServer.address}:${selectedServer.port}`;
			} else {
				throw new Error(
					`Invalid server URI format: "${selectedServer.uri}". Server: ${selectedServer.name}. Please refresh servers in Settings.`,
				);
			}
		}

		this.baseURL = serverUri;
		this.token = plexAuthService.getAccessToken() || '';

		const reachable = await plexDiscoveryService.testServerConnection(selectedServer, this.token);
		if (reachable) {
			this.baseURL = selectedServer.uri.replace(/\/$/, '');
		} else {
			console.warn('⚠️ No reachable connection found — using stored URI as fallback');
		}

		this.movieSectionId = null;
		this.showSectionId = null;
	}

	clearInitialization(): void {
		this.initialized = false;
		this.initPromise = null;
		this.baseURL = '';
		this.token = null;
		this.movieSectionId = null;
		this.showSectionId = null;
	}

	// ── Section Discovery ──────────────────────────────────────────────

	private async discoverVideoSections(): Promise<void> {
		const sections = await this.getLibrarySections();
		for (const section of sections) {
			if (section.type === 'movie' && !this.movieSectionId) {
				this.movieSectionId = section.key;
			} else if (section.type === 'show' && !this.showSectionId) {
				this.showSectionId = section.key;
			}
		}
	}

	private async ensureVideoSections(): Promise<void> {
		if (!this.movieSectionId && !this.showSectionId) {
			await this.discoverVideoSections();
		}
	}

	// ── URL Helpers ────────────────────────────────────────────────────

	buildMediaURL(path: string): string {
		const normalizedPath = path.startsWith('/') ? path : `/${path}`;
		return this.token
			? `${this.baseURL}${normalizedPath}?X-Plex-Token=${encodeURIComponent(this.token)}`
			: `${this.baseURL}${normalizedPath}`;
	}

	private buildURL(path: string, params: Record<string, string> = {}): string {
		if (!this.baseURL || !this.baseURL.match(/^https?:\/\/.+/)) {
			throw new Error(`Invalid baseURL: "${this.baseURL}". Please ensure you are authenticated and have selected a valid server.`);
		}

		const normalizedPath = path.startsWith('/') ? path : `/${path}`;
		const url = new URL(`${this.baseURL}${normalizedPath}`);

		if (this.token) {
			url.searchParams.set('X-Plex-Token', this.token);
		}

		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}

		return url.toString();
	}

	/**
	 * Build transcode start URL. Uses metadata key (ratingKey) as path — Plex expects
	 * /library/metadata/<id>, not the part key; using part key returns 400.
	 */
	buildTranscodeURL(
		ratingKey: string,
		options: { maxWidth?: number; maxHeight?: number; videoBitrate?: number; audioBoost?: number } = {},
	): string {
		const { maxWidth = 1920, maxHeight = 1080, videoBitrate = 20000, audioBoost = 100 } = options;
		const transcodeSessionId = `yhmv-${Date.now()}`;
		const path = `/library/metadata/${ratingKey}`;

		return this.buildURL('/video/:/transcode/universal/start.m3u8', {
			path,
			transcodeSessionId,
			'X-Plex-Session-Identifier': transcodeSessionId,
			mediaIndex: '0',
			partIndex: '0',
			protocol: 'hls',
			fastSeek: '1',
			directPlay: '0',
			directStream: '1',
			subtitleSize: '100',
			audioBoost: String(audioBoost),
			maxVideoBitrate: String(videoBitrate),
			videoResolution: `${maxWidth}x${maxHeight}`,
			'X-Plex-Client-Identifier': 'yhmv-mobile',
			'X-Plex-Product': 'yhmv',
			'X-Plex-Platform': 'iOS',
		});
	}

	/**
	 * Resolve the transcode start URL to the final session playlist URL.
	 * Plex may respond with a redirect; the native player can fail with "resource unavailable"
	 * if it doesn't follow redirects or loses auth. Resolving in JS and passing the final URL fixes that.
	 */
	async resolveTranscodeStreamUrl(startUrl: string): Promise<string> {
		const controller = this.createTimeoutController(15000);
		const response = await fetch(startUrl, {
			method: 'GET',
			redirect: 'follow',
			signal: controller.signal,
		});
		if (!response.ok) {
			const body = await response.text().catch(() => '');
			console.error('[PlexClient] Transcode 400 body:', body);
			throw new Error(`Transcode start failed: ${response.status}`);
		}
		await response.text(); // consume body
		return response.url;
	}

	// ── HTTP Infrastructure ────────────────────────────────────────────

	private createTimeoutController(timeout: number): AbortController {
		const controller = new AbortController();
		setTimeout(() => controller.abort(), timeout);
		return controller;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private calculateRetryDelay(attempt: number): number {
		const delay = Math.min(RETRY_CONFIG.baseDelay * RETRY_CONFIG.backoffMultiplier ** attempt, RETRY_CONFIG.maxDelay);
		return delay + Math.random() * 1000;
	}

	private isRetryableError(error: any): boolean {
		if (error.name === 'AbortError' || error.message?.includes('timeout')) return true;
		if (error.message?.includes('Network request failed')) return true;
		if (error.status >= 500) return true;
		if (error.message?.includes('certificate') || error.message?.includes('SSL') || error.message?.includes('TLS')) return true;
		return false;
	}

	private getFallbackUrl(originalUrl: string): string | null {
		if (originalUrl.startsWith('https://') && originalUrl.includes('.plex.direct')) {
			return originalUrl.replace('https://', 'http://');
		}
		return null;
	}

	async request<T = any>(
		path: string,
		params: Record<string, string> = {},
		options: {
			method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
			headers?: Record<string, string>;
			timeout?: number;
			retries?: number;
		} = {},
	): Promise<PlexResponse<T>> {
		if (getIsOfflineMode()) {
			throw new Error(OFFLINE_MODE_MESSAGE);
		}
		const { method = 'GET', headers = {}, timeout = TIMEOUT_CONFIG.requestTimeout, retries = RETRY_CONFIG.maxRetries } = options;

		const url = this.buildURL(path, params);

		const defaultHeaders = {
			Accept: 'application/json',
			'User-Agent': 'yhmv/1.0.0',
			'X-Plex-Client-Identifier': 'yhmv-mobile',
			...headers,
		};

		let lastError: any;
		let triedHttpFallback = false;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const controller = this.createTimeoutController(timeout);
				let requestUrl = url;

				if (attempt > 0 && lastError?.message?.includes('TLS') && !triedHttpFallback) {
					const fallbackUrl = this.getFallbackUrl(url);
					if (fallbackUrl) {
						requestUrl = fallbackUrl;
						triedHttpFallback = true;
					}
				}

				const fetchOptions: any = {
					method,
					headers: defaultHeaders,
					signal: controller.signal,
				};

				const response = await fetch(requestUrl, fetchOptions);

				if (!response.ok) {
					const errorText = await response.text().catch(() => 'Unknown error');
					const error: PlexError = new Error(`[${requestUrl}] - ${response.status}: ${errorText}`);
					error.status = response.status;
					error.code = `HTTP_${response.status}`;
					error.retryable = response.status >= 500;

					if (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status)) {
						throw error;
					}

					lastError = error;
					if (attempt < retries && error.retryable) {
						await this.sleep(this.calculateRetryDelay(attempt));
						continue;
					}
					throw error;
				}

				const contentType = response.headers.get('content-type') || '';
				let data: T;

				if (contentType.includes('application/json')) {
					data = await response.json();
				} else {
					data = (await response.text()) as T;
				}

				const responseHeaders: Record<string, string> = {};
				response.headers.forEach((value, key) => {
					responseHeaders[key] = value;
				});

				return { data, status: response.status, headers: responseHeaders };
			} catch (error: any) {
				lastError = error;

				if (attempt >= retries) break;
				if (!this.isRetryableError(error)) break;

				if (error.message?.includes('TLS') || error.message?.includes('certificate') || error.message?.includes('SSL')) {
					console.log('🔧 SSL Certificate Issue — will retry with HTTP fallback if possible');
				}

				await this.sleep(this.calculateRetryDelay(attempt));
			}
		}

		throw lastError || new Error('Request failed after all retries');
	}

	// ── Connectivity ───────────────────────────────────────────────────

	async testConnectivity(): Promise<boolean> {
		try {
			await this.initialize();
			const response = await this.request('/status/sessions', {}, { timeout: TIMEOUT_CONFIG.connectTimeout, retries: 1 });
			return response.status === 200;
		} catch {
			return false;
		}
	}

	// ── Library Sections ───────────────────────────────────────────────

	async getLibrarySections(): Promise<any[]> {
		await this.initialize();
		const response = await this.request('/library/sections');
		const data = response.data as any;
		return data?.MediaContainer?.Directory || [];
	}

	// ── Movies ─────────────────────────────────────────────────────────

	async fetchMovies(): Promise<Movie[]> {
		await this.initialize();
		await this.ensureVideoSections();

		if (!this.movieSectionId) {
			throw new Error('No movie section found in library.');
		}

		const response = await this.request(`/library/sections/${this.movieSectionId}/all`, {
			type: '1',
			sort: 'titleSort:asc',
		});

		const data = response.data as any;
		const raw = data?.MediaContainer?.Metadata || [];
		const items = Array.isArray(raw) ? raw : [raw];
		return items.map((item) => this.formatMovie(item));
	}

	async fetchRecentlyAddedMovies(limit = 25): Promise<Movie[]> {
		await this.initialize();
		await this.ensureVideoSections();

		if (!this.movieSectionId) return [];

		const response = await this.request(`/library/sections/${this.movieSectionId}/recentlyAdded`, {
			type: '1',
			'X-Plex-Container-Start': '0',
			'X-Plex-Container-Size': String(limit),
		});

		const data = response.data as any;
		const raw = data?.MediaContainer?.Metadata || [];
		const items = Array.isArray(raw) ? raw : [raw];
		return items.map((item) => this.formatMovie(item));
	}

	// ── Shows ──────────────────────────────────────────────────────────

	async fetchShows(): Promise<Show[]> {
		await this.initialize();
		await this.ensureVideoSections();

		if (!this.showSectionId) {
			throw new Error('No TV show section found in library.');
		}

		const response = await this.request(`/library/sections/${this.showSectionId}/all`, {
			type: '2',
			sort: 'titleSort:asc',
		});

		const data = response.data as any;
		const raw = data?.MediaContainer?.Metadata || [];
		const items = Array.isArray(raw) ? raw : [raw];
		return items.map((item) => this.formatShow(item));
	}

	async fetchRecentlyAddedShows(limit = 25): Promise<Show[]> {
		await this.initialize();
		await this.ensureVideoSections();

		if (!this.showSectionId) return [];

		const response = await this.request(`/library/sections/${this.showSectionId}/recentlyAdded`, {
			type: '2',
			'X-Plex-Container-Start': '0',
			'X-Plex-Container-Size': String(limit),
		});

		const data = response.data as any;
		const raw = data?.MediaContainer?.Metadata || [];
		const items = Array.isArray(raw) ? raw : [raw];
		return items.map((item) => this.formatShow(item));
	}

	// ── Seasons & Episodes ─────────────────────────────────────────────

	async fetchSeasons(showId: string): Promise<Season[]> {
		await this.initialize();

		const response = await this.request(`/library/metadata/${showId}/children`);
		const data = response.data as any;
		const raw = data?.MediaContainer?.Metadata || [];
		const items = Array.isArray(raw) ? raw : [raw];
		return items
			.filter((item: any) => item.type === 'season')
			.map((item: any) => this.formatSeason(item, showId));
	}

	async fetchEpisodes(seasonId: string): Promise<Episode[]> {
		await this.initialize();

		const response = await this.request(`/library/metadata/${seasonId}/children`);
		const data = response.data as any;

		const showId = data?.MediaContainer?.grandparentRatingKey || '';

		const raw = data?.MediaContainer?.Metadata || [];
		const items = Array.isArray(raw) ? raw : [raw];
		return items.map((item: any) => this.formatEpisode(item, showId, seasonId));
	}

	// ── On Deck / Continue Watching ────────────────────────────────────

	async fetchOnDeck(limit = 20): Promise<(Movie | Episode)[]> {
		await this.initialize();

		const response = await this.request('/library/onDeck', {
			'X-Plex-Container-Start': '0',
			'X-Plex-Container-Size': String(limit),
		});

		const data = response.data as any;
		const raw = data?.MediaContainer?.Metadata || [];
		const items = Array.isArray(raw) ? raw : [raw];

		return items.map((item: any) => {
			if (item.type === 'movie') return this.formatMovie(item);
			return this.formatEpisode(
				item,
				item.grandparentRatingKey || '',
				item.parentRatingKey || '',
			);
		});
	}

	// ── Search ─────────────────────────────────────────────────────────

	async search(query: string, type?: string): Promise<any[]> {
		await this.initialize();

		const params: Record<string, string> = { query };
		if (type) params.type = type;

		const response = await this.request('/search', params);
		const data = response.data as any;
		return data?.MediaContainer?.Metadata || [];
	}

	// ── Timeline (progress reporting) ──────────────────────────────────

	async reportTimeline(
		ratingKey: string,
		state: 'playing' | 'paused' | 'stopped',
		timeMs: number,
		durationMs: number,
	): Promise<void> {
		await this.initialize();

		await this.request(
			'/:/timeline',
			{
				ratingKey,
				key: `/library/metadata/${ratingKey}`,
				state,
				time: String(Math.round(timeMs)),
				duration: String(Math.round(durationMs)),
				'X-Plex-Client-Identifier': 'yhmv-mobile',
			},
			{ retries: 0, timeout: 10000 },
		);
	}

	async scrobble(ratingKey: string): Promise<void> {
		await this.initialize();
		await this.request(
			'/:/scrobble',
			{ identifier: 'com.plexapp.plugins.library', key: ratingKey },
			{ retries: 0, timeout: 10000 },
		);
	}

	// ── Metadata Detail ────────────────────────────────────────────────

	async fetchMovieDetail(movieId: string): Promise<Movie | null> {
		await this.initialize();

		try {
			const response = await this.request(`/library/metadata/${movieId}`);
			const data = response.data as any;
			const item = data?.MediaContainer?.Metadata?.[0];
			if (!item || item.type !== 'movie') return null;
			return this.formatMovie(item);
		} catch {
			return null;
		}
	}

	async fetchEpisodeDetail(episodeId: string): Promise<Episode | null> {
		await this.initialize();

		try {
			const response = await this.request(`/library/metadata/${episodeId}`);
			const data = response.data as any;
			const item = data?.MediaContainer?.Metadata?.[0];
			if (!item || item.type !== 'episode') return null;
			return this.formatEpisode(item, item.grandparentRatingKey || '', item.parentRatingKey || '');
		} catch {
			return null;
		}
	}

	// ── UltraBlur Colors ───────────────────────────────────────────────

	async fetchUltraBlurColors(thumbUrl: string): Promise<string[] | null> {
		await this.initialize();

		let thumbPath: string;
		try {
			const parsed = new URL(thumbUrl);
			thumbPath = parsed.pathname;
		} catch {
			thumbPath = thumbUrl;
		}

		try {
			const response = await this.request<any>('/services/ultrablur/colors', { url: thumbPath }, { timeout: 5000, retries: 1 });
			const entry = response.data?.MediaContainer?.UltraBlurColors?.[0];
			if (!entry) return null;

			const colors: string[] = [];
			for (const key of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const) {
				const hex = entry[key];
				if (typeof hex === 'string' && hex.length === 6) colors.push(`#${hex}`);
			}
			return colors.length > 0 ? colors : null;
		} catch {
			return null;
		}
	}

	// ── Formatters ─────────────────────────────────────────────────────

	private formatMovie(raw: any): Movie {
		const media = raw.Media?.[0];
		const part = media?.Part?.[0];

		return {
			id: raw.ratingKey,
			title: raw.title || 'Unknown',
			year: raw.year ? Number.parseInt(raw.year) : undefined,
			duration: Number.parseInt(raw.duration || '0', 10),
			summary: raw.summary,
			posterUrl: raw.thumb ? this.buildMediaURL(raw.thumb) : undefined,
			backdropUrl: raw.art ? this.buildMediaURL(raw.art) : undefined,
			rating: raw.rating ? Number.parseFloat(raw.rating) : undefined,
			contentRating: raw.contentRating,
			genres: (raw.Genre || []).map((g: any) => g.tag),
			studio: raw.studio,
			addedAt: raw.addedAt ? Number.parseInt(raw.addedAt) : undefined,
			lastViewedAt: raw.lastViewedAt ? Number.parseInt(raw.lastViewedAt) : undefined,
			viewOffset: raw.viewOffset ? Number.parseInt(raw.viewOffset) : undefined,
			viewCount: raw.viewCount ? Number.parseInt(raw.viewCount) : undefined,
			mediaKey: part?.key,
		};
	}

	private formatShow(raw: any): Show {
		return {
			id: raw.ratingKey,
			title: raw.title || 'Unknown',
			year: raw.year ? Number.parseInt(raw.year) : undefined,
			summary: raw.summary,
			posterUrl: raw.thumb ? this.buildMediaURL(raw.thumb) : undefined,
			backdropUrl: raw.art ? this.buildMediaURL(raw.art) : undefined,
			rating: raw.rating ? Number.parseFloat(raw.rating) : undefined,
			contentRating: raw.contentRating,
			genres: (raw.Genre || []).map((g: any) => g.tag),
			studio: raw.studio,
			seasonCount: raw.childCount ? Number.parseInt(raw.childCount) : undefined,
			episodeCount: raw.leafCount ? Number.parseInt(raw.leafCount) : undefined,
			addedAt: raw.addedAt ? Number.parseInt(raw.addedAt) : undefined,
			lastViewedAt: raw.lastViewedAt ? Number.parseInt(raw.lastViewedAt) : undefined,
		};
	}

	private formatSeason(raw: any, showId: string): Season {
		return {
			id: raw.ratingKey,
			showId,
			title: raw.title || `Season ${raw.index || '?'}`,
			seasonNumber: Number.parseInt(raw.index || '0', 10),
			episodeCount: raw.leafCount ? Number.parseInt(raw.leafCount) : undefined,
			posterUrl: raw.thumb ? this.buildMediaURL(raw.thumb) : undefined,
		};
	}

	private formatEpisode(raw: any, showId: string, seasonId: string): Episode {
		const media = raw.Media?.[0];
		const part = media?.Part?.[0];

		return {
			id: raw.ratingKey,
			showId,
			seasonId,
			title: raw.title || 'Unknown',
			seasonNumber: Number.parseInt(raw.parentIndex || '0', 10),
			episodeNumber: Number.parseInt(raw.index || '0', 10),
			duration: Number.parseInt(raw.duration || '0', 10),
			summary: raw.summary,
			thumbUrl: raw.thumb ? this.buildMediaURL(raw.thumb) : undefined,
			rating: raw.rating ? Number.parseFloat(raw.rating) : undefined,
			addedAt: raw.addedAt ? Number.parseInt(raw.addedAt) : undefined,
			lastViewedAt: raw.lastViewedAt ? Number.parseInt(raw.lastViewedAt) : undefined,
			viewOffset: raw.viewOffset ? Number.parseInt(raw.viewOffset) : undefined,
			viewCount: raw.viewCount ? Number.parseInt(raw.viewCount) : undefined,
			mediaKey: part?.key,
		};
	}
}

export const plexClient = new PlexClient();

export const testPlexServer = () => plexClient.testConnectivity();
export const fetchMovies = () => plexClient.fetchMovies();
export const fetchShows = () => plexClient.fetchShows();
export const fetchSeasons = (showId: string) => plexClient.fetchSeasons(showId);
export const fetchEpisodes = (seasonId: string) => plexClient.fetchEpisodes(seasonId);
export const fetchOnDeck = (limit?: number) => plexClient.fetchOnDeck(limit);
export const fetchRecentlyAddedMovies = (limit?: number) => plexClient.fetchRecentlyAddedMovies(limit);
export const fetchRecentlyAddedShows = (limit?: number) => plexClient.fetchRecentlyAddedShows(limit);
export const fetchMovieDetail = (movieId: string) => plexClient.fetchMovieDetail(movieId);
export const fetchEpisodeDetail = (episodeId: string) => plexClient.fetchEpisodeDetail(episodeId);
export const fetchUltraBlurColors = (thumbUrl: string) => plexClient.fetchUltraBlurColors(thumbUrl);
export const reportTimeline = (ratingKey: string, state: 'playing' | 'paused' | 'stopped', timeMs: number, durationMs: number) =>
	plexClient.reportTimeline(ratingKey, state, timeMs, durationMs);
export const scrobble = (ratingKey: string) => plexClient.scrobble(ratingKey);
