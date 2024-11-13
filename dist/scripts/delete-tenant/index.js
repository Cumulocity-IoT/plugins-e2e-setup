/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 460:
/***/ ((module) => {

module.exports = require("timers/promises");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deleteTenant = void 0;
const promises_1 = __nccwpck_require__(460);
const sleep = async (seconds) => {
    await (0, promises_1.setTimeout)(seconds * 1000);
};
async function deleteTenant(config) {
    // Disable SSL verification (not recommended for production)
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const auth = Buffer.from(`management/${config.managementUser}:${config.managementPassword}`).toString('base64');
    try {
        // Fetch tenants
        const response = await fetch(`${config.url}/tenant/tenants?pageSize=1000&withApps=false`, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to retrieve subtenants. Status: ${response.status}`);
        }
        const data = (await response.json());
        const tenants = data.tenants;
        // Filter tenants by company name
        const filteredTenants = tenants.filter(t => t.company.includes(config.companyName));
        // Delete each filtered tenant
        for (const tenant of filteredTenants) {
            try {
                const deleteResponse = await fetch(`${config.url}/tenant/tenants/${tenant.id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (deleteResponse.status === 204) {
                    console.log(`Deleted tenant with id ${tenant.id}`);
                }
                else {
                    console.warn(`Failed to delete tenant with id ${tenant.id}, returned with status: ${deleteResponse.status}`);
                }
                // Wait 500ms between requests
                await sleep(0.5);
            }
            catch (error) {
                console.error(`Error deleting tenant ${tenant.id}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Error in deleteTenant:', error);
        throw error;
    }
}
exports.deleteTenant = deleteTenant;

})();

module.exports = __webpack_exports__;
/******/ })()
;