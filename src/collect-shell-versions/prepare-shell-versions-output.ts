import { DistTagsObject } from './package-dist-tags';

export type ShellVersionsOutput = {
	tag: string;
	version: string;
};
const EXACT_TAGS_SEPARATOR = ',';

/**
 * Selects versions of shell and creates list for workflow output.
 * By default, selects last three yearly releases. If there are less than three yearly releases, it will add the 1018.0-lts version.
 * @param {DistTagsObject} distTagsObject - Object containing the distribution tags of a package and it's versions.
 * @param includeLatest - Indicates if 'latest' tag version should be included in list.
 * @param outputMaxLength - Maximum length of shell versions list.
 * @param exactTags - Comma separated list of exact dist tags to include in the output
 * @returns {Promise<ShellVersionsOutput[]>} A promise that resolves to an array containing versions data.
 */
export function prepareShellVersionsOutput(
	distTagsObject: DistTagsObject,
	includeLatest: boolean,
	outputMaxLength: number,
	exactTags: string
): ShellVersionsOutput[] {
	let versions: ShellVersionsOutput[] = [];

	if (exactTags) {
		const tags: string[] = exactTags.split(EXACT_TAGS_SEPARATOR);
		versions = tags
			.filter(tag => {
				const version = distTagsObject[tag];
				if (!version) {
					console.log(`Tag ${tag} is deprecated or does not exist!`);
				}
				return !!version;
			})
			.map(tag => getShellVersionOutputElement([tag, distTagsObject[tag]]));
		return versions;
	}

	if (includeLatest) {
		versions.push(
			getShellVersionOutputElement(['latest', distTagsObject['latest']])
		);
	}
	const yearlyReleasePattern = /^y\d{4}-lts$/;
	const yearlyReleaseKeys: string[] = Object.keys(distTagsObject)
		.filter(key => yearlyReleasePattern.test(key))
		.sort((a, b) => b.localeCompare(a));

	const legacyReleasePattern = /^101\d\.0-lts$/;
	const legacyReleaseKeys: string[] = Object.keys(distTagsObject)
		.filter(key => legacyReleasePattern.test(key))
		.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

	versions = [
		...versions,
		...[...yearlyReleaseKeys, ...legacyReleaseKeys].map(tag =>
			getShellVersionOutputElement([tag, distTagsObject[tag]])
		)
	];

	return versions.slice(0, outputMaxLength);
}

function getShellVersionOutputElement([tag, version]: [
	string,
	string
]): ShellVersionsOutput {
	return {
		tag,
		version
	};
}
