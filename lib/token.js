var private_token;
var token_save_path = __dirname + '/.token.json';
var token_reg = /[a-z0-9_\-]{20}/i;
exports.saveToken = saveToken;

var get_token = exports.get = function (){
    if(private_token === undefined && fis.util.exists(token_save_path) ){
        private_token = require(token_save_path).token;
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

    openBrowser('https://git.xiao' + 'ju' + 'ke' + 'ji.com/profile/account')
    promyToken(cb);

};
function promyToken(cb){
    var prompt = require('prompt');
    //
    // Start the prompt
    //
    prompt.start();
    console.log('please input your gitlab private_token:\n');
    prompt.get(['private_token'], function(err, result) {
        if(err){
            throw err;
            process.exit(0);
        }
        if(token_reg.test(result.private_token) === false){
            console.log('Incorrect Token!!\n');
            promyToken(cb);
            return;
        } 
        private_token = result.private_token;

        cb(private_token);
    });
}
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
/*
* 保存token
*
*/
function saveToken(token){
    if(token_reg.test(token)){
        private_token = token;
    }
    if(private_token){
        fis.util.write(token_save_path, JSON.stringify({
            token: private_token
        }));    
        return true;
    }
    return false;
}