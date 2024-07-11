import { getDistTagsObject } from './package-dist-tags';
import { filterOutDeprecatedDistTags } from './filter-out-deprecated-dist-tags';
import {
	prepareShellVersionsOutput,
	ShellVersionsOutput
} from './prepare-shell-versions-output';

type CollectShellVersionsParams = {
	includeLatest: boolean;
	exactTags: string;
	versionsLength: number;
	includeDeprecated: boolean;
	packageName: string;
};

/**
 * Collects versions of the shell for the given package name.
 * @param {CollectShellVersionsParams} arg The parameters object for collecting shell versions.
 * @return {Promise<ShellVersionsOutput[]>} A promise that resolves to an array of shell versions.
 */
export async function collectShellVersions({
	includeLatest,
	exactTags,
	versionsLength,
	includeDeprecated,
	packageName
}: CollectShellVersionsParams): Promise<ShellVersionsOutput[]> {
	let distTagsObject = await getDistTagsObject(packageName);
	console.log('All dist tags:', distTagsObject);

	if (!includeDeprecated) {
		distTagsObject = await filterOutDeprecatedDistTags(
			packageName,
			distTagsObject
		);
		console.log('Non deprecated dist tags:', distTagsObject);
	}

	const shellVersions = prepareShellVersionsOutput(
		distTagsObject,
		includeLatest,
		versionsLength,
		exactTags
	);
	console.log('Collected versions of shell:', shellVersions);
	return shellVersions;
}
