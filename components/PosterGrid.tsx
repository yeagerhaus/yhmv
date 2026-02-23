import { Dimensions, FlatList, StyleSheet, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface PosterGridProps<T> {
	data: T[];
	renderItem: (item: T, width: number) => React.ReactElement;
	keyExtractor: (item: T) => string;
	ListHeaderComponent?: React.ReactElement;
}

export function PosterGrid<T>({ data, renderItem, keyExtractor, ListHeaderComponent }: PosterGridProps<T>) {
	return (
		<FlatList
			data={data}
			numColumns={NUM_COLUMNS}
			keyExtractor={keyExtractor}
			renderItem={({ item }) => <View style={styles.item}>{renderItem(item, ITEM_WIDTH)}</View>}
			columnWrapperStyle={styles.row}
			contentContainerStyle={styles.container}
			showsVerticalScrollIndicator={false}
			ListHeaderComponent={ListHeaderComponent}
		/>
	);
}

const styles = StyleSheet.create({
	container: { paddingHorizontal: GRID_PADDING, paddingBottom: 100 },
	row: { gap: GRID_GAP, marginBottom: GRID_GAP },
	item: { width: ITEM_WIDTH },
});

export { ITEM_WIDTH as POSTER_ITEM_WIDTH };
