import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Div, Text } from '@/components';
import { Main } from '@/components/Main';
import { useColors, useThemedStyles } from '@/hooks/useColors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { plexClient } from '@/utils/plex-client';

interface SearchResult {
	id: string;
	title: string;
	type: string;
	year?: string;
	thumbUrl?: string;
	subtitle?: string;
}

export default function SearchScreen() {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [searching, setSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const router = useRouter();
	const themedStyles = useThemedStyles();
	const colors = useColors();
	const backgroundColor = useThemeColor({}, 'background');

	const doSearch = useCallback(async (text: string) => {
		if (text.trim().length < 2) {
			setResults([]);
			return;
		}

		setSearching(true);
		try {
			const raw = await plexClient.search(text);
			const mapped: SearchResult[] = raw
				.filter((item: any) => ['movie', 'show', 'episode'].includes(item.type))
				.map((item: any) => ({
					id: item.ratingKey,
					title: item.title,
					type: item.type,
					year: item.year ? String(item.year) : undefined,
					thumbUrl: item.thumb ? plexClient.buildMediaURL(item.thumb) : undefined,
					subtitle:
						item.type === 'episode'
							? `${item.grandparentTitle ?? ''} · S${item.parentIndex ?? '?'}E${item.index ?? '?'}`
							: item.type === 'show'
								? `${item.childCount ?? '?'} Seasons`
								: undefined,
				}));
			setResults(mapped);
		} catch (err) {
			console.error('Search failed:', err);
		} finally {
			setSearching(false);
		}
	}, []);

	const onChangeText = useCallback(
		(text: string) => {
			setQuery(text);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => doSearch(text), 400);
		},
		[doSearch],
	);

	const onPressResult = (item: SearchResult) => {
		if (item.type === 'movie') {
			router.push(`/(tabs)/(movies)/${item.id}`);
		} else if (item.type === 'show') {
			router.push(`/(tabs)/(shows)/${item.id}`);
		} else if (item.type === 'episode') {
			router.push(`/player/${item.id}`);
		}
	};

	return (
		<Div style={{ flex: 1, backgroundColor }}>
			<FlatList
				data={results}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
				keyboardDismissMode='on-drag'
				ListHeaderComponent={
					<Main scrollEnabled={false} style={{ paddingHorizontal: 0 }}>
						<Div transparent style={styles.header}>
							<Text type='h1'>Search</Text>
						</Div>
						<TextInput
							style={themedStyles.input}
							placeholder='Movies, Shows, Episodes...'
							placeholderTextColor={colors.textMuted}
							value={query}
							onChangeText={onChangeText}
							autoCapitalize='none'
							autoCorrect={false}
							clearButtonMode='while-editing'
						/>
					</Main>
				}
				renderItem={({ item }) => (
					<TouchableOpacity style={styles.resultRow} onPress={() => onPressResult(item)} activeOpacity={0.7}>
						{item.thumbUrl ? (
							<Image source={{ uri: item.thumbUrl }} style={styles.resultThumb} />
						) : (
							<View style={[styles.resultThumb, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
								<Text type='bodyXS' colorVariant='muted'>?</Text>
							</View>
						)}
						<Div transparent style={styles.resultInfo}>
							<Text type='body' numberOfLines={1}>{item.title}</Text>
							<Text type='bodyXS' colorVariant='muted' numberOfLines={1}>
								{item.subtitle ?? item.type.charAt(0).toUpperCase() + item.type.slice(1)}
								{item.year ? ` · ${item.year}` : ''}
							</Text>
						</Div>
					</TouchableOpacity>
				)}
				ListEmptyComponent={
					query.length > 0 && !searching ? (
						<Text type='body' colorVariant='muted' style={{ textAlign: 'center', marginTop: 40 }}>
							No results
						</Text>
					) : null
				}
			/>
		</Div>
	);
}

const styles = StyleSheet.create({
	list: { paddingHorizontal: 16, paddingBottom: 100 },
	header: { marginBottom: 12 },
	resultRow: {
		flexDirection: 'row',
		gap: 12,
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#222',
	},
	resultThumb: { width: 60, height: 90, borderRadius: 6 },
	resultInfo: { flex: 1, justifyContent: 'center', gap: 2 },
});
