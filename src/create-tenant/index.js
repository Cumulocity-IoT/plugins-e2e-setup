'use strict';
const _ = require('lodash');
const Q = require('q');
const crypto = require('crypto');

// Sleep function
function msleep(n) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
function sleep(n) {
	msleep(n * 1000);
}

// https://cumulocity.atlassian.net/browse/CD-3730
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const applicationsToBeSubscribed = [
	'user-notification',
	'user-notification-w',
	'user-notification-ui-plugin'
];

function executePromisesInOrder(fns) {
	return _.reduce(fns, (promise, fn) => promise.then(fn), Q.resolve());
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
		pass: managementPassword,
		sendImmediately: true
	});

	const uuidv4 = () => {
		return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
			(
				+c ^
				(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
			).toString(16)
		);
	};

	const reqObj = {
		method: 'POST',
		body: {
			company: companyName,
			contactName: contactName,
			contactPhone: '+48123456789',
			adminName: user,
			adminPass: password,
			adminEmail: `${uuidv4()}@sharklasers.com`
		},
		timeout: 300000
	};

	const createTenants = tenantNumber => {
		let arr = [];
		let url = '/tenant/tenants';
		return executePromisesInOrder(
			_.times(tenantNumber, index => {
				let modifiedObj = _.cloneDeep(reqObj);
				modifiedObj.body.domain = `${tenantName}${
					noTenantSuffix === false ? index + 1 : ''
				}.${domain}`;
				return arr.push(
					c8yapi.req(url, modifiedObj).then(res => {
						return res.id;
					})
				);
			})
		)
			.then(() => Q.all(arr))
			.then(arr =>
				!isManagement || isManagement === 'false'
					? Promise.resolve(arr)
					: updateTenants(arr)
			)
			.then(() => arr);
	};

	const updateTenants = tenantIds => {
		return executePromisesInOrder(
			tenantIds.map(tenantId => {
				let url = `/tenant/tenants/${tenantId}`;
				let body = {
					method: 'PUT',
					body: {
						allowCreateTenants: true,
						customProperties: {
							gainsightEnabled: true
						}
					},
					timeout: 120000
				};
				return () => c8yapi.req(url, body);
			})
		);
	};

	const getApplicationCollection = () => {
		let url =
			'/application/applicationsByOwner/management?pageSize=1000&withTotalPages=true';
		return c8yapi
			.req(url)
			.then(resp =>
				resp.applications.map(elem => _.pick(elem, ['owner', 'name', 'id']))
			);
	};

	const getListOfPermissions = tenantId => {
		let url = '/user/roles?pageSize=100&withTotalPages=true';
		let auth = {
			user: `${tenantId}/${user}`,
			pass: password
		};
		return c8yapi
			.req(url, { auth: auth })
			.then(res => res.roles.map(elem => elem.id));
	};

	const getAdminRoleId = tenantId => {
		let url = `/user/${tenantId}/groups?pageSize=100&withTotalPages=true`;
		let obj = {
			auth: {
				user: `${tenantId}/${user}`,
				pass: password,
				sendImmediately: true
			},
			method: 'GET',
			headers: {
				'content-type': 'application/json'
			},
			json: true
		};
		return c8yapi
			.req(url, obj)
			.then(resp => _.find(resp.groups, { name: 'admins' }))
			.then(resp => resp.id);
	};

	const addPermissionsToRole = tenantId => {
		let roleId;
		return getAdminRoleId(tenantId)
			.then(id => {
				roleId = id;
			})
			.then(() => getListOfPermissions(tenantId))
			.then(permissionsList =>
				executePromisesInOrder(
					permissionsList.map(permission => {
						let url = `/user/${tenantId}/groups/${roleId}/roles`;
						let obj = {
							auth: {
								user: `${tenantId}/${user}`,
								pass: password
							},
							method: 'POST',
							headers: {
								'Content-Type':
									'application/vnd.com.nsn.cumulocity.roleReference+json'
							},
							json: true,
							body: {
								role: {
									id: permission,
									name: permission,
									self: `https://${tenantId}.${domain}/user/roles/${permission}`
								}
							}
						};
						return () => c8yapi.req(url, obj);
					})
				)
			);
	};

	const findSubscriptionsIds = () => {
		return getApplicationCollection().then(apps => {
			let results = [];
			apps.forEach(app => {
				const matchingName = applicationsToBeSubscribed.find(
					a => a === app.name && app.owner.tenant.id === 'management'
				);
				if (matchingName) {
					results.push(app.id);
				}
			});
			return results;
		});
	};

	const subscribeMicroservice = (idsToSubscribe, tenantId) => {
		return executePromisesInOrder(
			idsToSubscribe.map(id => {
				let url = `/tenant/tenants/${tenantId}/applications`;
				let obj = {
					auth: {
						user: managementUser,
						pass: managementPassword
					},
					method: 'POST',
					headers: {
						'content-type': 'application/json'
					},
					json: true,
					body: {
						application: {
							id: `${id}`
						}
					},
					timeout: 150000
				};
				return () => c8yapi.req(url, obj);
			})
		);
	};

	try {
		const tenantIds = await createTenants(numberOfTenants);

		if (
			!_.includes(tenantIds, undefined) &&
			tenantIds.length === numberOfTenants
		) {
			const prepareTenant = tenantIds.map(tenantId => {
				return () =>
					findSubscriptionsIds()
						.then(idsToSubscribe =>
							subscribeMicroservice(idsToSubscribe, tenantId)
						)
						.then(() => sleep(11))
						.then(() => addPermissionsToRole(tenantId));
			});
			await executePromisesInOrder(prepareTenant);
			return tenantIds[0]; // Return the first tenant ID
		} else {
			throw new Error('Some or all of the tenant creation failed!');
		}
	} catch (ex) {
		console.error(ex);
		throw ex;
	}
}

module.exports = { createTenant };
