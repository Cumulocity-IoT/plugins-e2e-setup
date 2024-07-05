import { getInput, setFailed } from '@actions/core';
import * as core from '@actions/core';
import { getDistTagsObject } from './package-dist-tags';
import { filterOutDeprecatedDistTags } from './filter-out-deprecated-dist-tags';
import { prepareShellVersionsOutput } from './prepare-shell-versions-output';

/**
 * Action collects the last three versions of the shell for the @c8y/ngx-components package and sets the output for use in workflow.
 */
const performAction = async () => {
	const includeLatest: boolean = getInput('include-latest') === 'true';
	console.log('Inputs: include-latest', getInput('include-latest'));
	// const exactTags: string = getInput('exact-tags');
	const versionsLength: number = parseInt(getInput('versions-length'), 10);
	console.log('Inputs: versions-length', getInput('versions-length'));
	console.log('typeof versionsLength', typeof versionsLength);
	// const includeDeprecated: boolean = getInput('include-deprecated') === 'true';

	const packageName = '@c8y/ngx-components';
	const distTagsObject = await getDistTagsObject(packageName);
	console.log('All dist tags:', distTagsObject);

	const nonDeprecatedDistTagsObject = await filterOutDeprecatedDistTags(
		packageName,
		distTagsObject
	);
	console.log('Non deprecated dist tags:', nonDeprecatedDistTagsObject);

	const shellVersions = prepareShellVersionsOutput(
		nonDeprecatedDistTagsObject,
		includeLatest,
		versionsLength
	);
	console.log('Last three versions of shell:', shellVersions);
	core.setOutput('shell_versions', JSON.stringify(shellVersions));
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
