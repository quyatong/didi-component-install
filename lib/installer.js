'use strict';

var debug = require('debug')('didi:install:installer'),
    semver = require('semver'),
    rimraf = require('rimraf'),
    path = require('path'),
    fs = require('fs'),
    Package = require('./package'),
    util = require('./util'),
    empty = function () {},
    token = require('./token.js'),
    proto = Installer.prototype;

Installer.remotes = require('./remotes');
Installer.clean = function () {
    rimraf.sync(fis.project.getTempPath('install'));
};

function Installer() {
    this.depFields = ['dependencies'];
    this.manifest = path.join(util.getRoot() || process.cwd(), 'component.json');
    if (!this.manifest || !fs.existsSync(this.manifest)) {

        util.fatal(new Error(' install within project folder: cannot find a `component.json` file'));
    }

    this.meta = JSON.parse(fs.readFileSync(this.manifest, 'utf-8') || '{}');
    this.local = path.join(util.getRoot(), 'component_modules');
    this.remotes = ['github'].map(Installer.remotes.resolve);
    debug('[initialize] %s@%s', this.meta.name, this.meta.version);
}

proto.calcDeps = function (packages, callback, result) {
    if (typeof packages === 'function') {
        result = callback;
        callback = packages;
        packages = Object.create(Package.prototype);
        packages.repo = '-';
        packages.meta = this.meta;
    }

    if (!Array.isArray(packages)) packages = [packages];
    callback = callback || empty;
    result = result || {};

    var that = this;
    util.eachAsync(packages, function (pkg, done) {
        if (pkg.meta) return done();
        if (!pkg.repo || !pkg.ref) util.fatal('invalid component');

        // resolve each component if not resolving or resolved
        debug('[calcDeps] resolve %s@%s', pkg.repo, pkg.ref);
        var local = path.join(that.local, pkg.name, pkg.ref),
            manifest = path.join(local, 'component.json');
        if (fs.existsSync(manifest)) {
            pkg.getMetaFromFile(manifest, function (err, meta) {
                if (err) done.traceback.push(err);
                else {
                    pkg.local = local;
                    pkg.meta = meta;
                }
                debug('[calcDeps] %s@%s found at local', pkg.repo, pkg.ref);
                done();
            });
        } else {
            pkg.resolve(!semver.valid(pkg.ref), function (err) {
                if (err) done.traceback.push(err);
                done();
            });
        }
    }, function (traceback) {
        if (traceback.length) {
            var err = new Error('failed to resolve components');
            err.stack = traceback.reduce(function (stack, err) {
                return stack += '\n' + err.stack;
            }, 'Error: ' + err.message);
            return callback.call(that, err);
        }

        // process dependencies
        util.eachAsync(packages, function (pkg, done) {
            var deps = that.depFields.reduce(function (deps, field) {
                util.each(pkg.meta[field], function (ref, repo) {
                    deps.push(new Package(repo, ref));
                });
                return deps;
            }, []);

            debug('[calcDeps] %s@%s - %o', pkg.repo, pkg.ref,
            deps.map(function (pkg) { return pkg.repo + '@' + pkg.ref; }));
            that.calcDeps(deps, function (err, result) {
                if (err) {
                    done.traceback.push(err);
                    return done();
                }
                // didi-component/debug
                var existsPkg = result[pkg.repo];
                if (pkg.repo !== '-') {// if not exists
                    if (!existsPkg){
                        // save multiple version
                        result[pkg.repo] = [pkg];
                    }else{
                        result[pkg.repo].push(pkg) ;
                    }
                    /*
                     if( semver.valid(existsPkg.ref) &&       // or existsPkg isn't master
                        semver.lt(existsPkg.ref, pkg.ref) || // and pkg is newer
                        !semver.valid(pkg.ref)) {            // or pkg is master
                    }
                    */
                }
                done();
            }, result);
        }, function (traceback) {
            if (traceback.length) {
                var err = new Error('failed to calculate dependencies');
                err.stack = traceback.reduce(function (stack, err) {
                    return stack += '\n' + err.stack;
                }, 'Error: ' + err.message);
                return callback.call(that, err);
            }
            callback.call(that, null, result);
        });
    });
};

proto.install = function () {
    var that = this, pkg,
        repo, ref, save, callback;
    util.each(arguments, function (arg) {
        switch (typeof arg) {
        case 'string':
            if (!repo) repo = arg;
            else if (!ref) ref = arg;
            break;
        case 'boolean':
            save = arg;
            break;
        case 'function':
            callback = arg;
            break;
        }
    });
    ref = ref || '*';
    callback = callback || empty;

    util.log('install', 'preparing...');
    if (repo && ref) {
        pkg = new Package(repo, ref);
        this.calcDeps(pkg, function (err, result) {
            if (err) return callback.call(that, err);

            var existsPkg = result[pkg.repo];
            // if (existsPkg && existsPkg.ref !== pkg.ref) result[pkg.repo] = pkg;
            if(existsPkg === undefined){
                result[pkg.repo] = [pkg];
            }else{
                result[pkg.repo].push(pkg);
            }

            var callbackBak = callback;
            callback = function (err, result) {
                callbackBak.call(that, err);
                if (!err && save) {
                    that.depFields.forEach(function (field) {
                        that.meta[field] = that.meta[field] || {};
                        delete that.meta[field][pkg.repo];
                    });
                    // that.meta.dependencies[pkg.repo] = pkg.ref;
                    util.each(result, function(rpkg){
                        that.meta.dependencies[rpkg.repo] = rpkg.ref;
                    });
                    debug('[install] write back component.json: %s@%s', pkg.repo, pkg.ref);
                    fs.writeFile(that.manifest,
                        JSON.stringify(that.meta, null, '  '), function (err) {
                        if (err) {
                            util.error('install',
                                'failed to write back to component.json\n' + err.stack);
                        }
                    });
                }
            };
            processor(err, result);
        });
    } else {
        this.calcDeps(processor);
    }

    function processor(err, result) {
        if (err) return callback.call(that, err);
        var projectDep = that.meta.dependencies || {};
        util.eachAsync(result, function(pkgAry, repo, done){
            var versionMap = {};
            var versionAry;
            // 去重
            util.each(pkgAry, function(pkg){
                versionMap[pkg.meta.version] = pkg;
            });
            // 没有重复的
            if(Object.keys(versionMap).length === 1 && !(repo in projectDep)){
                for(var k in versionMap){
                    done.result.push(versionMap[k]);
                }
                done();
            // 只有2个或一个版本待选择,其中本地已经安装某个待安装的版本
            }else if(Object.keys(versionMap).length <= 2 && versionMap[projectDep[repo]]){
                delete versionMap[projectDep[repo]];
                versionAry = Object.keys(versionMap);
                for(var i in versionMap){
                    done.result.push(versionMap[i]);
                }
                done();
            }else if(repo in projectDep){
                var localDepFrom = [];
                if(versionMap[projectDep[repo]]){
                    delete versionMap[projectDep[repo]];
                    versionAry = Object.keys(versionMap);
                    versionAry = forMatSelectRepo(repo, versionAry);
                    that.prompt(repo, versionAry, function(version){
                        done.result.push(versionMap[version]);
                        done();
                    });
                }else{
                    that.localpkg(function(err, result){
                        result.forEach(function(localpkg){
                            if(localpkg.dependencies && repo in localpkg.dependencies ){
                                localDepFrom.push(localpkg.name);
                            }
                        });
                        versionAry = Object.keys(versionMap);
                        versionAry = forMatSelectRepo(repo, versionAry);
                        versionAry.value.unshift(projectDep[repo]);
                        versionAry.description.unshift(projectDep[repo] + ' --> Local dependencies from [' + localDepFrom.join('] & [') + ']');
                        // todo: 确认版本后,清理掉,不使用的pkg
                        that.prompt(repo, versionAry, function(version){
                            // 本地
                            if(version !== projectDep[repo]){
                                done.result.push(versionMap[version]);
                            }
                            done();
                        });
                    });
                }
            }else{
                versionAry = forMatSelectRepo(repo, versionAry);
                that.prompt(repo, versionAry , function(version){
                    done.result.push(versionMap[version]);
                    done();
                });
            }

        }, function(traceback, result){
            util.eachAsync(result, function (pkg, done) {
                // pass if installed
                if (pkg.local) return done();

                util.log('install', 'installing ' + pkg.repo + '@' + pkg.ref + '...');
                pkg.install(function (err) {
                    if (err) done.traceback.push(err);
                    done();
                });
            }, function (traceback) {
                if (traceback.length) {
                    var err = new Error('failed to install components');
                    err.stack = traceback.reduce(function (stack, err) {
                        return stack += '\n' + err.stack;
                    }, 'Error: ' + err.message);
                    return callback.call(that, err);
                }
                callback.call(that, null, result);
                util.log('install', 'finished');
                token.saveToken();
            })
        });

        // 寻找 repo 的依赖者
        function forMatSelectRepo(repo, versionAry){
            var description = [];
            var ret = {
                value: versionAry,
                description: description
            };

            if(typeof  versionAry === 'string'){
                versionAry = [versionAry];
            }
            versionAry.sort(function(a, b){
                if(semver.valid(a) === false){
                    return 1;
                }else{
                    return semver.gt(a, b) ? 1 : semver.eq(a, b) ? 0 : -1;
                }
            });
            util.each(versionAry, function(version, index){
                var names = [];
                util.each(result, function(pkgs){
                    util.each(pkgs, function(pkg){
                        var dependencies = pkg.meta.dependencies;
                        if( dependencies
                            && (dependencies[repo] === version || index === 0 && dependencies[repo] == '*')
                            && names.indexOf(pkg.repo) === -1
                        ){
                            names.push(pkg.repo);
                        }
                    });
                });
                description.push(version + ' --> Installing dependencies from [' + names.join('] & [') + ']');
            });
            return ret;
        }
        function collectiongarbarge(){

        }
    }
};

proto.localpkg = function(next){
    var that = this;
    var deps = that.meta.dependencies || {};
    if(that._localpkgs){
        return next(null, that._localpkgs);
    }
    var pkgs = [];
    util.each(deps, function(ref, repo){
        pkgs.push(new Package(repo, ref));
    });
    util.eachAsync(pkgs, function(pkg, done){
        pkg.getMetaFromFile();
        var localComponent = path.join(pkg.root, pkg.name, 'component.json');
        pkg.getMetaFromFile(localComponent, function(err, meta){
            if(err){
                done.traceback.push(err);
            }else{
                done.result.push(meta);
            }
            done();
        });
    }, function(traceback, result){
        if(traceback.length){
            next(traceback);
        }else{
            that._localpkgs = result;
            next(null, result);
        }
    });
};

proto.prompt = function(repo, select, cb){
    'use strict';
    var inquirer = require('inquirer');
    // 有个坑,用了这个之后报错不再抛出来了
    inquirer.prompt([
        {
            type: 'list',
            name: 'version',
            message: 'Which version of ['+ repo +'] do you need?',
            choices: select.description,
            filter: function (val) {
                return val;
            }
        }
    ]).then(function (answers) {
        var v = select.value[select.description.indexOf(answers.version)];
        cb(v);
    });
};
module.exports = Installer;