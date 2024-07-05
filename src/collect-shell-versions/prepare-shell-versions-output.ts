import { DistTagsObject } from './package-dist-tags';

export type ShellVersionsOutput = {
	tag: string;
	version: string;
	major: string;
};
/**
 * Selects last three yearly releases. If there are less than three yearly releases, it will add the 1018.0-lts version.
 * @param {DistTagsObject} distTagsObject - Object containing the distribution tags of a package and it's versions.
 * @returns {Promise<ShellVersionsOutput[]>} A promise that resolves to an array containing versions data.
 */
export async function prepareShellVersionsOutput(
	distTagsObject: DistTagsObject
): Promise<ShellVersionsOutput[]> {
	const yearlyReleasePattern = /^y\d{4}-lts$/;
	const yearlyReleaseVersions = Object.entries(distTagsObject)
		.filter(([key, _]) => yearlyReleasePattern.test(key))
		.slice(0, 3);
	if (yearlyReleaseVersions.length < 3 && distTagsObject['1018.0-lts']) {
		yearlyReleaseVersions.push(['1018.0-lts', distTagsObject['1018.0-lts']]);
	}

	return yearlyReleaseVersions.map(([tag, version]) => ({
		tag,
		version,
		major: version.split('.')[0]
	}));
}
