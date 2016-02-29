'use strict';

var token = require('../token');
var hostName = 'git.' + ['x','i','a','o','j','u','k','e','j','i'].join('') + '.com';

module.exports = {
	name: 'xiao'+ 'ju',
	file: function(repo, ref, path) {
		var url = 'https://'+ hostName +'/' + repo + '/raw/' + ref + '/' + path + '?private_token=' + token.get();

		return url;
	},
	archiveExt: '.tar.gz',
	archive: function(repo, ref) {
		var url = 'https://'+ hostName +'/' + repo + '/repository/archive.tar.gz?ref=' + ref + '&private_token=' + token.get();
		return url;
	}
};


