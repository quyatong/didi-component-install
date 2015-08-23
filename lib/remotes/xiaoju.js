'use strict';

var token = require('../token');
module.exports = {
	name: 'xiaoju',
	file: function(repo, ref, path) {
		var url = 'https://git.xiaojukeji.com/' + repo + '/raw/' + ref + '/' + path + '?private_token=' + token.get();

		return url;
	},
	archiveExt: '.tar.gz',
	archive: function(repo, ref) {
		var url = 'https://git.xiaojukeji.com/' + repo + '/repository/archive.tar.gz?ref=' + ref + '&private_token=' + token.get();
		return url;
	}
};


