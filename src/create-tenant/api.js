'use strict';
let request = require('request'),
	Q = require('q'),
	_ = require('lodash'),
	_request = Q.denodeify(request);

module.exports = function (host, auth) {
	function setAuth(user, pass) {
		auth = {
			user: user,
			pass: pass,
			sendImmediately: true
		};
	}

	function onError(resp, reqObj) {
		let res = resp[1];
		if (res && res.error) {
			if (
				res.message === undefined ||
				(!res.message.includes('already has authority') &&
					!res.message.includes('is already assigned to the tenant'))
			) {
				console.error('error in api.js: ' + res.error);
				console.error('message: ' + res.message);
				console.info('api request:\n', reqObj);
				return resp[0]; // Can be used to check response statusCode.
			}
		} else {
			return resp[1];
		}
	}

	function req(path, params) {
		let reqObj = {
			url: host + path,
			auth: auth,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			},
			json: true,
			body: {},
			timeout: 15000
		};
		_.assign(reqObj, params);
		return _request(reqObj)
			.then(res => {
				return onError(res, reqObj);
			})
			.catch(err => {
				console.log(`error in api.js: ${err.message}`);
				console.info('api request:\n', reqObj);
				process.exitCode = 1;
				throw err;
			});
	}

	return {
		setAuth: setAuth,
		req: req
	};
};
