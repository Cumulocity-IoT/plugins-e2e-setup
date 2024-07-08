import { getInput, setFailed } from '@actions/core';
import * as core from '@actions/core';
import { getDistTagsObject } from './package-dist-tags';
import { filterOutDeprecatedDistTags } from './filter-out-deprecated-dist-tags';
import { prepareShellVersionsOutput } from './prepare-shell-versions-output';

/**
 * Action collects versions of the shell for the @c8y/ngx-components package and sets the output for use in workflow.
 */
const performAction = async () => {
	const includeLatest: boolean = getInput('include-latest') === 'true';
	// const exactTags: string = getInput('exact-tags');
	const versionsLength: number = parseInt(getInput('versions-length'), 10);
	const includeDeprecated: boolean = getInput('include-deprecated') === 'true';

	const packageName = '@c8y/ngx-components';
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
		versionsLength
	);
	console.log('Collected versions of shell:', shellVersions);
	core.setOutput('shell_versions', JSON.stringify(shellVersions));
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
