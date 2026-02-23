import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS } from 'react-native';
import { Colors } from '@/constants';

export default function TabLayout() {
	return (
		<NativeTabs
			minimizeBehavior='onScrollDown'
			labelStyle={{
				color: DynamicColorIOS({
					dark: 'white',
					light: 'black',
				}),
			}}
		>
			<NativeTabs.Trigger name='(home)'>
				<Icon sf={{ default: 'house', selected: 'house.fill' }} selectedColor={Colors.brandPrimary} />
				<Label>Home</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name='(movies)'>
				<Icon sf={{ default: 'film', selected: 'film.fill' }} selectedColor={Colors.brandPrimary} />
				<Label>Movies</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name='(shows)'>
				<Icon sf={{ default: 'tv', selected: 'tv.fill' }} selectedColor={Colors.brandPrimary} />
				<Label>Shows</Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name='(settings)'>
				<Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} selectedColor={Colors.brandPrimary} />
				<Label>Settings</Label>
			</NativeTabs.Trigger>

			{/* biome-ignore lint/a11y/useSemanticElements: NativeTabs.Trigger does not support semantic <search>; role=search is intentional for a11y */}
			<NativeTabs.Trigger name='search' role='search'>
				<Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} selectedColor={Colors.brandPrimary} />
				<Label>Search</Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
