import { setFailed } from '@actions/core';
import * as core from '@actions/core';
import { getDistTagsObject } from './package-dist-tags';
import { filterOutDeprecatedDistTags } from './filter-out-deprecated-dist-tags';
import { prepareShellVersionsOutput } from './prepare-shell-versions-output';

/**
 * Action collects the last three versions of the shell for the @c8y/ngx-components package and sets the output for use in workflow.
 */
const performAction = async () => {
	const packageName = '@c8y/ngx-components';
	const distTagsObject = await getDistTagsObject(packageName);
	console.log('All dist tags:', distTagsObject);

	const nonDeprecatedDistTagsObject = await filterOutDeprecatedDistTags(
		packageName,
		distTagsObject
	);
	console.log('Non deprecated dist tags:', nonDeprecatedDistTagsObject);

	const shellVersions = await prepareShellVersionsOutput(
		nonDeprecatedDistTagsObject
	);
	console.log('Last three versions of shell:', shellVersions);
	core.setOutput('shell_versions', JSON.stringify(shellVersions));
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});