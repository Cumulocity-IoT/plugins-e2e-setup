import { getInput, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { createTenant } from './index';

/**
 * This action downloads the shell app, extracts it to dist/apps folder.
 */
const performAction = async () => {
	const domainPrefix = getInput('domain-prefix');
	const user = getInput('cy-user');
	const password = getInput('cy-password');
	const email = getInput('cy-email');
	const managementUser = getInput('cy-management-user');
	const managementPassword = getInput('cy-management-password');
	const managementUrl = getInput('cy-management-url');
	const appsToSubscribe = getInput('apps-to-subscribe');

	if (!domainPrefix) {
		setFailed('domain-prefix property is required.');
	}
	if (!user) {
		setFailed('user property is required.');
	}
	if (!password) {
		setFailed('password property is required.');
	}
	if (!managementUser) {
		setFailed('managementUser property is required.');
	}
	if (!managementPassword) {
		setFailed('managementPassword property is required.');
	}
	if (!managementUrl) {
		setFailed('managementUrl property is required.');
	}

	const contactName = context.actor;
	const companyName = `uic8y-cy-${context.runId}`;

	const tenantId = await createTenant({
		tenantName: domainPrefix,
		managementUrl,
		user,
		password,
		email,
		managementUser,
		managementPassword,
		isManagement: true,
		noTenantSuffix: true,
		companyName,
		contactName,
		numberOfTenants: 1,
		appsToSubscribe
	});
	console.log('Tenant ID:', tenantId);

	setOutput('tenant-id', tenantId);
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
