var libs = ['installer', 'package', 'remotes', 'token' ,'util'];
libs.forEach(function(val){
	exports[val] = require('./lib/' + val);
});