/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 380:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.filterOutDeprecatedDistTags = void 0;
const child_process_1 = __nccwpck_require__(81);
const util = __importStar(__nccwpck_require__(837));
const execPromise = util.promisify(child_process_1.exec);
/**
 * Filters out deprecated versions from the distribution tags of a package.
 * @param {string} packageName - Name of the package.
 * @param {DistTagsObject} distTags - Object containing the distribution tags of a package and versions.
 * @returns {Promise<DistTagsObject>} A promise that resolves to an object containing non deprecated dist tags and versions.
 */
async function filterOutDeprecatedDistTags(packageName, distTags) {
    const nonDeprecatedVersionsObject = {};
    for (const [tag, version] of Object.entries(distTags)) {
        const deprecated = await isDeprecated(packageName, version);
        if (!deprecated) {
            nonDeprecatedVersionsObject[tag] = version;
        }
    }
    return nonDeprecatedVersionsObject;
}
exports.filterOutDeprecatedDistTags = filterOutDeprecatedDistTags;
/**
 * Checks if a specific version of a given npm package is deprecated.
 * @param {string} packageName - The name of the npm package.
 * @param {string} version - The version of the npm package.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the version is deprecated.
 * @throws Will throw an error if the execution of the npm view command fails.
 */
async function isDeprecated(packageName, version) {
    try {
        const deprecatedInfo = (await execPromise(`npm view ${packageName}@${version} deprecated --json`))?.stdout;
        return !!deprecatedInfo;
    }
    catch (error) {
        console.error(`Error checking if ${packageName}@${version} is deprecated:`, error);
        return false;
    }
}


/***/ }),

/***/ 706:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getDistTagsObject = void 0;
const child_process_1 = __nccwpck_require__(81);
const util = __importStar(__nccwpck_require__(837));
const execPromise = util.promisify(child_process_1.exec);
/**
 * Fetches the distribution tags for a given npm package.
 * @param {string} packageName - The name of the npm package.
 * @returns {Promise<DistTagsObject>} A promise that resolves to an object containing the distribution tags.
 * @throws Will throw an error if the execution of the npm view command fails.
 */
async function getDistTagsObject(packageName) {
    try {
        const { stdout } = await execPromise(`npm view ${packageName} dist-tags --json`);
        return JSON.parse(stdout);
    }
    catch (error) {
        console.error('Error fetching dist-tags:', error);
        return {};
    }
}
exports.getDistTagsObject = getDistTagsObject;


/***/ }),

/***/ 382:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.prepareShellVersionsOutput = void 0;
const EXACT_TAGS_SEPARATOR = ',';
/**
 * Selects versions of shell and creates list for workflow output.
 * By default, selects last three yearly releases. If there are less than three yearly releases, it will add the 1018.0-lts version.
 * @param {DistTagsObject} distTagsObject - Object containing the distribution tags of a package and it's versions.
 * @param includeLatest - Indicates if 'latest' tag version should be included in list.
 * @param outputMaxLength - Maximum length of shell versions list.
 * @param exactTags - Comma separated list of exact dist tags to include in the output
 * @returns {Promise<ShellVersionsOutput[]>} A promise that resolves to an array containing versions data.
 */
function prepareShellVersionsOutput(distTagsObject, includeLatest, outputMaxLength, exactTags) {
    let versions = [];
    if (exactTags) {
        const tags = exactTags.split(EXACT_TAGS_SEPARATOR);
        versions = tags
            .filter(tag => {
            const version = distTagsObject[tag];
            if (!version) {
                console.log(`Tag ${tag} is deprecated or does not exist!`);
            }
            return !!version;
        })
            .map(tag => getShellVersionOutputElement([tag, distTagsObject[tag]]));
        return versions;
    }
    if (includeLatest) {
        versions.push(getShellVersionOutputElement(['latest', distTagsObject['latest']]));
    }
    const yearlyReleasePattern = /^y\d{4}-lts$/;
    const yearlyReleaseKeys = Object.keys(distTagsObject)
        .filter(key => yearlyReleasePattern.test(key))
        .sort((a, b) => b.localeCompare(a));
    const legacyReleasePattern = /^101\d\.0-lts$/;
    const legacyReleaseKeys = Object.keys(distTagsObject)
        .filter(key => legacyReleasePattern.test(key))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    versions = [
        ...versions,
        ...[...yearlyReleaseKeys, ...legacyReleaseKeys].map(tag => getShellVersionOutputElement([tag, distTagsObject[tag]]))
    ];
    return versions.slice(0, outputMaxLength);
}
exports.prepareShellVersionsOutput = prepareShellVersionsOutput;
function getShellVersionOutputElement([tag, version]) {
    return {
        tag,
        version,
        major: version.split('.')[0]
    };
}


/***/ }),

/***/ 81:
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ 837:
/***/ ((module) => {

module.exports = require("util");

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
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
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
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.collectShellVersions = void 0;
const package_dist_tags_1 = __nccwpck_require__(706);
const filter_out_deprecated_dist_tags_1 = __nccwpck_require__(380);
const prepare_shell_versions_output_1 = __nccwpck_require__(382);
/**
 * Collects versions of the shell for the given package name.
 * @param {CollectShellVersionsParams} arg The parameters object for collecting shell versions.
 * @return {Promise<ShellVersionsOutput[]>} A promise that resolves to an array of shell versions.
 */
async function collectShellVersions({ includeLatest, exactTags, versionsLength, includeDeprecated, packageName }) {
    let distTagsObject = await (0, package_dist_tags_1.getDistTagsObject)(packageName);
    console.log('All dist tags:', distTagsObject);
    if (!includeDeprecated) {
        distTagsObject = await (0, filter_out_deprecated_dist_tags_1.filterOutDeprecatedDistTags)(packageName, distTagsObject);
        console.log('Non deprecated dist tags:', distTagsObject);
    }
    const shellVersions = (0, prepare_shell_versions_output_1.prepareShellVersionsOutput)(distTagsObject, includeLatest, versionsLength, exactTags);
    console.log('Collected versions of shell:', shellVersions);
    return shellVersions;
}
exports.collectShellVersions = collectShellVersions;

})();

module.exports = __webpack_exports__;
/******/ })()
;