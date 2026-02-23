import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Animated, InteractionManager, LogBox, StyleSheet, useColorScheme } from 'react-native';

LogBox.ignoreAllLogs();

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Div } from '@/components';
import { Colors } from '@/constants';
import { RootScaleProvider, useRootScale } from '@/ctx/RootScaleContext';
import { useAppearanceStore } from '@/hooks/useAppearanceStore';
import { useDevSettingsStore } from '@/hooks/useDevSettingsStore';
import { useOfflineModeStore } from '@/hooks/useOfflineModeStore';
import { useVideoLibraryStore } from '@/hooks/useVideoLibraryStore';
import { rehydrateLibraryStore, saveLibraryToCache } from '@/utils';
import { fetchMovies, fetchShows, fetchOnDeck, fetchRecentlyAddedMovies, fetchRecentlyAddedShows, testPlexServer } from '@/utils/plex';
import { plexAuthService } from '@/utils/plex-auth';

const CustomDarkTheme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		background: Colors.dark.background,
		card: Colors.dark.background,
	},
};

const CustomLightTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: Colors.light.background,
		card: Colors.light.background,
	},
};

function AnimatedStack() {
	const { scale } = useRootScale();
	const colorScheme = useColorScheme();
	const screenBackground = colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;

	const translateY = scale.interpolate({
		inputRange: [0, 1],
		outputRange: [-150, 0],
	});

	return (
		<Div style={{ flex: 1, backgroundColor: screenBackground }}>
			<Animated.View style={[styles.stackContainer, { transform: [{ scale }, { translateY }] }]}>
				<Stack screenOptions={{ contentStyle: { backgroundColor: screenBackground } }}>
					<Stack.Screen name='(tabs)' options={{ headerShown: false, contentStyle: { backgroundColor: screenBackground } }} />
					<Stack.Screen
						name='player/[id]'
						options={{
							presentation: 'fullScreenModal',
							headerShown: false,
							contentStyle: { backgroundColor: '#000' },
							autoHideHomeIndicator: true,
						}}
					/>
					<Stack.Screen name='_not-found' />
				</Stack>
			</Animated.View>
		</Div>
	);
}

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const hydrateAppearance = useAppearanceStore((state) => state.hydrate);
	const hydrateDevSettings = useDevSettingsStore((state) => state.hydrate);
	const hydrateOfflineMode = useOfflineModeStore((state) => state.hydrate);

	useEffect(() => {
		const bg = colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;
		SystemUI.setBackgroundColorAsync(bg);
	}, [colorScheme]);

	useEffect(() => {
		hydrateAppearance();
		hydrateDevSettings();
		hydrateOfflineMode();
	}, [hydrateAppearance, hydrateDevSettings, hydrateOfflineMode]);

	useEffect(() => {
		const init = async () => {
			try {
				const authLoaded = await plexAuthService.loadAuthState();

				let hydrated = false;
				if (authLoaded && plexAuthService.isAuthenticated()) {
					console.log('✅ Using existing Plex authentication');
					const selectedServer = plexAuthService.getSelectedServer();
					if (selectedServer) {
						console.log(`📡 Connected to: ${selectedServer.name}`);
					}

					hydrated = await rehydrateLibraryStore();
					if (hydrated) {
						console.log('✅ Loaded cached library data');
					}
				}

				if (authLoaded && plexAuthService.isAuthenticated()) {
					const store = useVideoLibraryStore.getState();

					const fetchAll = async () => {
						try {
							const [movies, shows, onDeck, recentMovies, recentShows] = await Promise.all([
								fetchMovies(),
								fetchShows(),
								fetchOnDeck(15),
								fetchRecentlyAddedMovies(15),
								fetchRecentlyAddedShows(15),
							]);
							if (movies.length > 0) store.setMovies(movies);
							if (shows.length > 0) store.setShows(shows);
							store.setOnDeck(onDeck);
							store.setRecentlyAddedMovies(recentMovies);
							store.setRecentlyAddedShows(recentShows);
							console.log(`✅ Library loaded: ${movies.length} movies, ${shows.length} shows`);

							InteractionManager.runAfterInteractions(() => {
								saveLibraryToCache().catch((err) => console.warn('Cache save failed:', err));
							});
						} catch (err) {
							console.error('❌ Failed to fetch library:', err);
							testPlexServer().catch(() => console.warn('⚠️ Cannot connect to Plex server'));
						}
					};

					if (!hydrated) {
						fetchAll();
					} else {
						setTimeout(fetchAll, 5 * 60 * 1000);
					}
				} else {
					console.log('🔐 No existing authentication found. Please sign in through Settings.');
				}
			} catch (error) {
				console.error('Failed to initialize app:', error);
			}
		};

		init();
	}, []);

	return (
		<GestureHandlerRootView style={styles.container}>
			<ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
				<RootScaleProvider>
					<AnimatedStack />
				</RootScaleProvider>
			</ThemeProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#000' },
	stackContainer: { flex: 1, overflow: 'hidden', borderRadius: 50 },
});
