import { exec } from 'child_process';
import * as util from 'util';
import { DistTagsObject } from './package-dist-tags';
const execPromise = util.promisify(exec);

/**
 * Filters out deprecated versions from the distribution tags of a package.
 * @param {string} packageName - Name of the package.
 * @param {DistTagsObject} distTags - Object containing the distribution tags of a package and versions.
 * @returns {Promise<DistTagsObject>} A promise that resolves to an object containing non deprecated dist tags and versions.
 */
export async function filterOutDeprecatedDistTags(
	packageName: string,
	distTags: DistTagsObject
): Promise<DistTagsObject> {
	const nonDeprecatedVersionsObject: Record<string, string> = {};

	for (const [tag, version] of Object.entries(distTags)) {
		const deprecated = await isDeprecated(packageName, version);
		if (!deprecated) {
			nonDeprecatedVersionsObject[tag] = version;
		}
	}
	return nonDeprecatedVersionsObject;
}

/**
 * Checks if a specific version of a given npm package is deprecated.
 * @param {string} packageName - The name of the npm package.
 * @param {string} version - The version of the npm package.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the version is deprecated.
 * @throws Will throw an error if the execution of the npm view command fails.
 */
async function isDeprecated(
	packageName: string,
	version: string
): Promise<boolean> {
	try {
		const deprecatedInfo = (
			await execPromise(`npm view ${packageName}@${version} deprecated --json`)
		)?.stdout;
		return !!deprecatedInfo;
	} catch (error) {
		console.error(
			`Error checking if ${packageName}@${version} is deprecated:`,
			error
		);
		return false;
	}
}
