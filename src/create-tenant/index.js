// index.js
'use strict';
const _ = require('lodash');
const crypto = require('crypto');

function sleep(n) {
	return new Promise(resolve => setTimeout(resolve, n * 1000));
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const applicationsToBeSubscribed = [
	'user-notification',
	'user-notification-w',
	'user-notification-ui-plugin'
];

async function executePromisesInOrder(fns) {
	const results = [];
	for (const fn of fns) {
		results.push(await fn());
	}
	return results;
}

async function createTenant({
	tenantName,
	managementUrl,
	user,
	password,
	managementUser,
	managementPassword,
	isManagement = true,
	noTenantSuffix = false,
	companyName = 'e2eTesting tenant',
	contactName = 'Mr. Smith',
	numberOfTenants = 1
}) {
	if (!managementUrl || !managementUser || !managementPassword || !tenantName) {
		throw new Error('Required parameters are missing');
	}

	const domain = managementUrl.match(/\.([a-z0-9.-]*)/)[1];

	const c8yapi = require('./api.js')(managementUrl, {
		user: managementUser,
		pass: managementPassword
	});

	const uuidv4 = () => {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
			(
				+c ^
				(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
			).toString(16)
		);
	};

	const createTenants = async tenantNumber => {
		const url = '/tenant/tenants';
		const tenantIds = [];

		for (let index = 0; index < tenantNumber; index++) {
			try {
				const body = {
					company: companyName,
					contactName: contactName,
					contactPhone: '+48123456789',
					domain: `${tenantName}${
						noTenantSuffix === false ? index + 1 : ''
					}.${domain}`,
					adminName: user,
					adminPass: password,
					adminEmail: `${uuidv4()}@sharklasers.com`
				};

				const response = await c8yapi.req(url, {
					method: 'POST',
					body,
					timeout: 300000,
					headers: { Accept: 'application/json' }
				});

				if (response && response.id) {
					console.log(`Tenant created with ID: ${response.id}`);
					tenantIds.push(response.id);
				} else {
					throw new Error('No tenant ID in response');
				}
			} catch (error) {
				console.error(`Failed to create tenant ${index + 1}:`, error);
				throw error;
			}
		}

		if (isManagement && isManagement !== 'false') {
			await updateTenants(tenantIds);
		}

		return tenantIds;
	};

	const updateTenants = async tenantIds => {
		for (const tenantId of tenantIds) {
			try {
				const url = `/tenant/tenants/${tenantId}`;
				await c8yapi.req(url, {
					method: 'PUT',
					body: {
						allowCreateTenants: true,
						customProperties: {
							gainsightEnabled: true
						}
					},
					timeout: 120000
				});
			} catch (error) {
				console.error(`Failed to update tenant ${tenantId}:`, error);
				throw error;
			}
		}
	};

	const getApplicationCollection = async () => {
		const url =
			'/application/applicationsByOwner/management?pageSize=1000&withTotalPages=true';
		const resp = await c8yapi.req(url);
		return resp.applications.map(elem => _.pick(elem, ['owner', 'name', 'id']));
	};

	const getListOfPermissions = async tenantId => {
		const url = '/user/roles?pageSize=100&withTotalPages=true';
		const res = await c8yapi.req(url, {
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${tenantId}/${user}:${password}`
				).toString('base64')}`
			}
		});
		return res.roles.map(elem => elem.id);
	};

	const getAdminRoleId = async tenantId => {
		const url = `/user/${tenantId}/groups?pageSize=100&withTotalPages=true`;
		const resp = await c8yapi.req(url, {
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${tenantId}/${user}:${password}`
				).toString('base64')}`
			}
		});
		const adminGroup = _.find(resp.groups, { name: 'admins' });
		if (!adminGroup) throw new Error('Admin group not found');
		return adminGroup.id;
	};

	const addPermissionsToRole = async tenantId => {
		try {
			const roleId = await getAdminRoleId(tenantId);
			const permissionsList = await getListOfPermissions(tenantId);

			for (const permission of permissionsList) {
				const url = `/user/${tenantId}/groups/${roleId}/roles`;
				await c8yapi.req(url, {
					method: 'POST',
					headers: {
						Authorization: `Basic ${Buffer.from(
							`${tenantId}/${user}:${password}`
						).toString('base64')}`,
						'Content-Type':
							'application/vnd.com.nsn.cumulocity.roleReference+json'
					},
					body: {
						role: {
							id: permission,
							name: permission,
							self: `https://${tenantId}.${domain}/user/roles/${permission}`
						}
					}
				});
			}
		} catch (error) {
			console.error(`Failed to add permissions for tenant ${tenantId}:`, error);
			throw error;
		}
	};

	const findSubscriptionsIds = async () => {
		const apps = await getApplicationCollection();
		return apps
			.filter(
				app =>
					applicationsToBeSubscribed.includes(app.name) &&
					app.owner.tenant.id === 'management'
			)
			.map(app => app.id);
	};

	const subscribeMicroservice = async (idsToSubscribe, tenantId) => {
		for (const id of idsToSubscribe) {
			try {
				const url = `/tenant/tenants/${tenantId}/applications`;
				await c8yapi.req(url, {
					method: 'POST',
					headers: {
						Authorization: `Basic ${Buffer.from(
							`${managementUser}:${managementPassword}`
						).toString('base64')}`
					},
					body: {
						application: {
							id: `${id}`
						}
					},
					timeout: 150000
				});
			} catch (error) {
				console.error(
					`Failed to subscribe microservice ${id} for tenant ${tenantId}:`,
					error
				);
				throw error;
			}
		}
	};

	try {
		const tenantIds = await createTenants(numberOfTenants);

		if (
			!_.includes(tenantIds, undefined) &&
			tenantIds.length === numberOfTenants
		) {
			for (const tenantId of tenantIds) {
				const idsToSubscribe = await findSubscriptionsIds();
				await subscribeMicroservice(idsToSubscribe, tenantId);
				await sleep(11);
				await addPermissionsToRole(tenantId);
			}
			return tenantIds[0];
		} else {
			throw new Error('Some or all of the tenant creation failed!');
		}
	} catch (ex) {
		console.error('Creation process failed:', ex);
		throw ex;
	}
}

module.exports = { createTenant };
