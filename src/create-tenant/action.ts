import { getInput, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { createTenant } from './index';

/**
 * This action downloads the shell app, extracts it to dist/apps folder.
 */
const performAction = async () => {
	const c8yEnv = getInput('c8y-environment');
	const user = getInput('cy-user');
	const password = getInput('cy-password');
	const managementUser = getInput('cy-management-user');
	const managementPassword = getInput('cy-management-password');

	const domainPrefix = `uic8y-cy-${context.runId}-${context.runNumber}`;
	console.log('Domain prefix:', domainPrefix);
	const contactName = context.actor;
	const companyName = `uic8y-cy-${context.runId}`;

	const tenantId = await createTenant({
		tenantName: domainPrefix,
		managementUrl: `https://management.${c8yEnv}`,
		user,
		password,
		managementUser,
		managementPassword,
		isManagement: true,
		noTenantSuffix: true,
		companyName,
		contactName,
		numberOfTenants: 1
	});
	console.log('Tenant ID:', tenantId);

	setOutput('domain-prefix', domainPrefix);
	setOutput('tenant-id', tenantId);
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
