import 'dotenv/config';
import type { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: 'yhmv',
	slug: 'yhmv',
	version: '1.0.0',
	orientation: 'default',
	icon: './assets/images/icon.png',
	scheme: 'yhmv',
	userInterfaceStyle: 'automatic',
	splash: {
		image: './assets/images/splash.png',
		resizeMode: 'contain',
		backgroundColor: '#000000',
	},
	backgroundColor: '#080808',
	ios: {
		supportsTablet: true,
		bundleIdentifier: 'com.yhprod.yhmv',
		backgroundColor: '#080808',
	},
	web: {
		bundler: 'metro',
		output: 'static',
		favicon: './assets/images/favicon.png',
	},
	plugins: [
		'expo-router',
		[
			'expo-splash-screen',
			{
				image: './assets/images/splash-icon.png',
				imageWidth: 200,
				resizeMode: 'contain',
				backgroundColor: '#000',
				preventAutoHide: true,
			},
		],
		'expo-video',
		'expo-web-browser',
	],
	experiments: {
		typedRoutes: true,
	},
	extra: {
		...config.extra,
	},
});
