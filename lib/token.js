var private_token;
var token_save_path = __dirname + '/.token.json';
var get_token = exports.get = function (){
	if(private_token === undefined){
		private_token = require(token_save_path).token;
		private_token = 'private_token='+ private_token;
	}
	return private_token;
};

var prompt_token = exports.prompt = function (cb) {
    if (private_token) {
        return cb(private_token);
    }
    if (fis.util.exists(token_save_path)) {
        private_token = require(token_save_path).token;
        return cb(private_token);
    }
    var prompt = require('prompt');

    openBrowser('https://git.xiaojukeji.com/profile/account')
    //
    // Start the prompt
    //
    prompt.start();

    //
    // Get two properties from the user: username and email
    //

    console.log('please input your gitlab private_token:\n');
    prompt.get(['private_token'], function(err, result) {
        if(err){
            throw err;
            process.exit(0);
        }
        //
        // Log the results.
        //
        private_token = result.private_token;
        fis.util.write(token_save_path, JSON.stringify({
            token: private_token
        }));
        cb(private_token);
    });
};
var openBrowser = exports.openBrowser = function(path, callback) {
    var child_process = require('child_process');
    fis.log.notice('browse ' + path.yellow.bold + '\n');
    var cmd = fis.util.escapeShellArg(path);
    if(fis.util.isWin()){
        cmd = 'start "" ' + cmd;
    } else {
        if(process.env['XDG_SESSION_COOKIE']){
            cmd = 'xdg-open ' + cmd;
        } else if(process.env['GNOME_DESKTOP_SESSION_ID']){
            cmd = 'gnome-open ' + cmd;
        } else {
            cmd = 'open ' + cmd;
        }
    }
    child_process.exec(cmd, callback);
};

exports.reset = function(){
    private_token = undefined;
}