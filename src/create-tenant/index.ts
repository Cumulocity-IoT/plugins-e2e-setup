import _ from 'lodash';
import crypto from 'crypto';
import { C8yApi } from './api';

// Disable SSL verification
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

interface CreateTenantParams {
	tenantName: string;
	managementUrl: string;
	user: string;
	password: string;
	managementUser: string;
	managementPassword: string;
	isManagement: boolean;
	noTenantSuffix: boolean;
	companyName: string;
	contactName: string;
	numberOfTenants: number;
	appsToSubscribe: string;
}

let applicationsToBeSubscribed = [
	'actility',
	'apama-ctrl-smartrulesmt',
	'cloud-remote-access',
	'connectivity-agent-server',
	'feature-branding',
	'feature-broker',
	'databroker-agent-server',
	'feature-fieldbus4',
	'feature-opcua-legacy',
	'feature-user-hierarchy',
	'loriot-agent',
	'lwm2m-agent',
	'opcua-mgmt-service',
	'sigfox-agent',
	'smartrule',
	'snmp-mib-parser',
	'sslmanagement'
];

function uuidv4(): string {
	return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string) =>
		(
			+c ^
			(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
		).toString(16)
	);
}

async function executePromisesInOrder(
	fns: Array<() => Promise<any>>
): Promise<any> {
	return fns.reduce((promise, fn) => promise.then(fn), Promise.resolve());
}

export async function createTenant(
	params: CreateTenantParams
): Promise<string> {
	if (params.appsToSubscribe) {
		applicationsToBeSubscribed = params.appsToSubscribe.split(',');
	}
	const domain = params.managementUrl.match(/\.([a-z0-9.-]*)/)![1];

	const c8yapi = new C8yApi(params.managementUrl, {
		user: params.managementUser,
		pass: params.managementPassword,
		sendImmediately: true
	});

	const reqObj = {
		method: 'POST',
		body: {
			company: params.companyName,
			contactName: params.contactName,
			contactPhone: '+48123456789',
			adminName: params.user,
			adminPass: params.password,
			adminEmail: `${uuidv4()}@sharklasers.com`,
			domain: `${params.tenantName}.${domain}`
		},
		timeout: 300000
	};

	async function createTenants(tenantNumber: number): Promise<string[]> {
		const tenantIds: string[] = [];
		const url = '/tenant/tenants';

		for (let i = 0; i < tenantNumber; i++) {
			const response = await c8yapi.req(url, reqObj);
			tenantIds.push(response.id);
		}

		if (params.isManagement) {
			await updateTenants(tenantIds);
		}

		return tenantIds;
	}

	async function updateTenants(tenantIds: string[]): Promise<void> {
		await executePromisesInOrder(
			tenantIds.map(tenantId => async () => {
				const url = `/tenant/tenants/${tenantId}`;
				const body = {
					method: 'PUT',
					body: {
						allowCreateTenants: true,
						customProperties: {
							gainsightEnabled: true
						}
					},
					timeout: 120000
				};
				return c8yapi.req(url, body);
			})
		);
	}

	async function getApplicationCollection(): Promise<any[]> {
		const url =
			'/application/applicationsByOwner/management?pageSize=1000&withTotalPages=true';
		const response = await c8yapi.req(url);
		return response.applications.map((elem: any) =>
			_.pick(elem, ['owner', 'name', 'id'])
		);
	}

	async function getListOfPermissions(tenantId: string): Promise<string[]> {
		const url = '/user/roles?pageSize=100&withTotalPages=true';
		const auth = {
			user: `${tenantId}/${params.user}`,
			pass: params.password
		};
		const response = await c8yapi.req(url, { auth });
		return response.roles.map((elem: any) => elem.id);
	}

	async function getAdminRoleId(tenantId: string): Promise<string> {
		const url = `/user/${tenantId}/groups?pageSize=100&withTotalPages=true`;
		const response = await c8yapi.req(url, {
			auth: {
				user: `${tenantId}/${params.user}`,
				pass: params.password,
				sendImmediately: true
			}
		});
		const adminGroup = _.find(response.groups, { name: 'admins' });
		return adminGroup.id;
	}

	async function addPermissionsToRole(tenantId: string): Promise<void> {
		const roleId = await getAdminRoleId(tenantId);
		const permissionsList = await getListOfPermissions(tenantId);

		await executePromisesInOrder(
			permissionsList.map(permission => async () => {
				const url = `/user/${tenantId}/groups/${roleId}/roles`;
				try {
					await c8yapi.req(url, {
						auth: {
							user: `${tenantId}/${params.user}`,
							pass: params.password
						},
						method: 'POST',
						headers: {
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
				} catch (error: any) {
					if (error.statusCode === 409) {
						console.log(
							`Permission ${permission} already exists for tenant ${tenantId}`
						);
					} else {
						throw error;
					}
				}
			})
		);
	}

	async function findSubscriptionsIds(): Promise<string[]> {
		const apps = await getApplicationCollection();
		const results: string[] = [];
		apps.forEach(app => {
			const matchingName = applicationsToBeSubscribed.find(
				a => a === app.name && app.owner.tenant.id === 'management'
			);
			if (matchingName) {
				results.push(app.id);
			}
		});
		return results;
	}

	async function subscribeMicroservice(
		idsToSubscribe: string[],
		tenantId: string
	): Promise<void> {
		await executePromisesInOrder(
			idsToSubscribe.map(id => async () => {
				const url = `/tenant/tenants/${tenantId}/applications`;
				try {
					return await c8yapi.req(url, {
						auth: {
							user: params.managementUser,
							pass: params.managementPassword
						},
						method: 'POST',
						body: {
							application: {
								id: `${id}`
							}
						},
						timeout: 150000
					});
				} catch (err) {
					if (err?.statusCode === 409) {
						console.log(`App ${id} is already subscribed.`);
					}
				}
			})
		);
	}

	const tenantIds = await createTenants(params.numberOfTenants);

	if (
		!_.includes(tenantIds, undefined) &&
		tenantIds.length === params.numberOfTenants
	) {
		await Promise.all(
			tenantIds.map(async tenantId => {
				try {
					const idsToSubscribe = await findSubscriptionsIds();
					await subscribeMicroservice(idsToSubscribe, tenantId);
					await new Promise(resolve => setTimeout(resolve, 11000));
					await addPermissionsToRole(tenantId);
				} catch (ex) {
					console.error(ex);
					throw ex;
				}
			})
		);
	} else {
		throw new Error('Some or all of the tenant creation failed!');
	}

	return tenantIds[0];
}
