import { getInput, setFailed, setOutput } from '@actions/core';
import { collectShellVersions } from './index';

/**
 * Action collects versions of the shell for the @c8y/ngx-components package and sets the output for use in workflow.
 */
const performAction = async () => {
	const includeLatest: boolean = getInput('include-latest') === 'true';
	const exactTags: string = getInput('exact-tags');
	const versionsLength: number = parseInt(getInput('versions-length'), 10);
	const includeDeprecated: boolean = getInput('include-deprecated') === 'true';
	const packageName = getInput('package-name');

	const shellVersions = await collectShellVersions({
		includeLatest,
		exactTags,
		versionsLength,
		includeDeprecated,
		packageName
	});

	setOutput('shell_versions', JSON.stringify(shellVersions));
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
