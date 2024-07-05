import { exec } from 'child_process';
import * as util from 'util';
const execPromise = util.promisify(exec);

type DistTag = string;
type Version = string;
export type DistTagsObject = Record<DistTag, Version>;
/**
 * Fetches the distribution tags for a given npm package.
 * @param {string} packageName - The name of the npm package.
 * @returns {Promise<DistTagsObject>} A promise that resolves to an object containing the distribution tags.
 * @throws Will throw an error if the execution of the npm view command fails.
 */
export async function getDistTagsObject(
	packageName: string
): Promise<DistTagsObject> {
	try {
		const { stdout } = await execPromise(
			`npm view ${packageName} dist-tags --json`
		);
		return JSON.parse(stdout);
	} catch (error) {
		console.error('Error fetching dist-tags:', error);
		return {};
	}
}
