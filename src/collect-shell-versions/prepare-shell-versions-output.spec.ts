import { prepareShellVersionsOutput } from './prepare-shell-versions-output';

const distTagObject = {
	'1011.0-lts': '1011.0.38',
	'1013.0-lts': '1013.0.437',
	'1014.0-lts': '1014.0.427',
	'1015.0-lts': '1015.0.536',
	'1016.0-lts': '1016.0.484',
	'y2025-lts': '1020.0.19',
	'1018.0-lts': '1018.0.267',
	latest: '1020.0.19',
	'1017.0-lts': '1017.0.534',
	'y2024-lts': '1018.503.100',
	'1018.503-lts': '1018.503.100',
	next: '1020.0.22'
};

describe('prepareShellVersionsOutput', () => {
	test('when default values are applied', () => {
		const result = prepareShellVersionsOutput(distTagObject, false, 3);

		expect(result).toEqual([
			{ tag: 'y2025-lts', version: '1020.0.19', major: '1020' },
			{ tag: 'y2024-lts', version: '1018.503.100', major: '1018' },
			{ tag: '1018.0-lts', version: '1018.0.267', major: '1018' }
		]);
	});

	test('when include latest is true', () => {
		const result = prepareShellVersionsOutput(distTagObject, true, 3);

		expect(result).toEqual([
			{ tag: 'latest', version: '1020.0.19', major: '1020' },
			{ tag: 'y2025-lts', version: '1020.0.19', major: '1020' },
			{ tag: 'y2024-lts', version: '1018.503.100', major: '1018' }
		]);
	});

	test('when include latest is true and outputMaxLength is 5', () => {
		const result = prepareShellVersionsOutput(distTagObject, true, 5);

		expect(result).toEqual([
			{ tag: 'latest', version: '1020.0.19', major: '1020' },
			{ tag: 'y2025-lts', version: '1020.0.19', major: '1020' },
			{ tag: 'y2024-lts', version: '1018.503.100', major: '1018' },
			{ tag: '1018.0-lts', version: '1018.0.267', major: '1018' },
			{ tag: '1017.0-lts', version: '1017.0.534', major: '1017' }
		]);
	});

	test('when include latest is false and outputMaxLength is 5', () => {
		const result = prepareShellVersionsOutput(distTagObject, false, 5);

		expect(result).toEqual([
			{ tag: 'y2025-lts', version: '1020.0.19', major: '1020' },
			{ tag: 'y2024-lts', version: '1018.503.100', major: '1018' },
			{ tag: '1018.0-lts', version: '1018.0.267', major: '1018' },
			{ tag: '1017.0-lts', version: '1017.0.534', major: '1017' },
			{ tag: '1016.0-lts', version: '1016.0.484', major: '1016' }
		]);
	});
});
