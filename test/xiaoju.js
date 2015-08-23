'use strict';
require('fis-kernel');
var remotes = require('../lib/remotes'),
    remote = remotes['xiaoju'];
var token = require('../lib/token');
describe('xiaoju', function () {
    beforeEach(function(done){
        token.prompt(function(){
            done();
        });
    });

    it('should specify a file method', function () {
        remote.file.should.be.a.funciton;
        remote.file('elf/event', 'master', 'component.json')
            .should.match(/^https\:\/\/git\.xiaojukeji\.com\/elf\/event\/raw\/master\/component.json\?private_token\=\w+$/i);
               
    });

    it('should specify an archive method', function () {
        remote.archive.should.be.a.funciton;
        remote.archive('elf/event', '0.1.0')
            .should.match(/^https\:\/\/git\.xiaojukeji\.com\/elf\/event\/repository\/archive\.tar\.gz\?ref\=0\.1\.0\&private_token=\w+$/);
               
    });

    it('should specify an archiveExt property', function () {
        remote.archiveExt.should.equal('.tar.gz');
    });
});