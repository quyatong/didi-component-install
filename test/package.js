'use strict';

require('fis-kernel');
var path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
    Package = require('../lib/package'),
    repo = 'scrat-team/event',
    ref = 'master',
    remote = 'github',
    pkg,
    repo2 = 'zhangnan03/imgcliper',
    remote2 = 'xiaoju',
    pkg2,
    ref2 = '1.0.2',
    token = require('../lib/token')

    ;

function clean(done) {
    exec('rm -rf component_modules component.json', done);
}

describe('Package', function () {
    before(clean);
    afterEach(clean);
    beforeEach(function (done) {
        fs.writeFileSync('component.json', JSON.stringify({
            repo: 'scrat-team/event',
            version: '0.1.0',
            dependencies: {
                'scrat-team/type': '0.1.0',
                'scrat-team/each': '0.1.0',
                'scrat-team/extend': '0.1.0'
            }
        }));

        pkg = new Package(repo, '*');

        pkg2 = new Package(repo2, ref2);
         


        token.prompt(function(){
            done();
        });
    });

    it('should initiate instance\'s properties', function () {
        pkg.repo.should.equal(repo);
        pkg.name.should.equal('scrat-team-event');
        pkg.orgiRef.should.equal(ref);
        pkg.ref.should.equal(ref);
        pkg.root.should.equal(path.resolve('component_modules'));

    });

    describe('#resolve()', function () {
        it('should resolve github component\'s meta info', function (done) {
            pkg.resolve(true, function (err, meta) {
                if (err) throw err;
                meta.should.be.an.Object;
                pkg.ref.should.equal(meta.version);
                pkg.remote.name.should.equal(remote);
                pkg.manifest.should.equal('https://raw.githubusercontent.com/scrat-team/event/master/component.json');
                pkg.archive.should.equal('https://codeload.github.com/scrat-team/event/tar.gz/master');
                done();
            });

        });
        it('should resolve xiaoju component\'s meta info', function (done) {
            pkg2.resolve(true, function(){
                pkg2.manifest.should.match(/^https\:\/\/git\.xiaojukeji\.com\/zhangnan03\/imgcliper\/raw\/1\.0\.2\/component.json\?private_token\=\w+$/i);
                pkg2.archive.should.match(/^https\:\/\/git\.xiaojukeji\.com\/zhangnan03\/imgcliper\/repository\/archive\.tar\.gz\?ref\=1\.0\.2\&private_token=\w+$/);
                pkg2.remote.name.should.equal(remote2);
                done();
            }); 
        });

    });

    describe('#install()', function () {
        it('should install a component', function (done) {
            pkg.install(function (err) {
                if (err) throw err;
                var dir = path.join(pkg.root, pkg.name, pkg.ref);
                fs.existsSync(dir).should.be.true;
                done();
            });
        });
    });
});