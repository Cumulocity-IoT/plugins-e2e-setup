import { getInput, setFailed } from '@actions/core';
import { deleteTenant } from './index';

/**
 * This action downloads the shell app, extracts it to dist/apps folder.
 */
const performAction = async () => {
	const url = getInput('cy-url');
	const managementUser = getInput('cy-management-user');
	const managementPassword = getInput('cy-management-password');
	const companyName = getInput('cy-company');

	if (!url) {
		setFailed('url property is required.');
	}
	if (!managementUser) {
		setFailed('managementUser property is required.');
	}
	if (!managementPassword) {
		setFailed('managementPassword property is required.');
	}
	if (!companyName) {
		setFailed('company property is required.');
	}

	await deleteTenant({
		url,
		managementUser,
		managementPassword,
		companyName
	});
};

performAction().catch(error => {
	console.error('An error occurred', error);
	setFailed(error.message);
});
