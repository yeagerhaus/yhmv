import { Div, Text } from '@/components';
import { Main } from '@/components/Main';

export default function AppearanceScreen() {
	return (
		<Main style={{ paddingHorizontal: 16 }}>
			<Div transparent>
				<Text type='h1' style={{ marginBottom: 16 }}>
					Appearance
				</Text>
			</Div>

			<Div transparent>
				<Text type='body' colorVariant='muted'>
					Appearance settings will be available in a future update.
				</Text>
			</Div>
		</Main>
	);
}
