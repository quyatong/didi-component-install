'use strict';

var remotes = require('../lib/remotes'),
    remote = require('../lib/remotes/github'),
    token = require('../lib/token')
    ;

describe('remotes', function () {
    beforeEach(function (done) {
        token.prompt(function(){
            done();
        });
    });

    it('should be an Object with two default items', function () {
        Object.keys(remotes).should.have.length(2);
    });

    describe('#register()', function () {
        it('should register a remote to remotes', function () {
            remote.name = 'github2';
            remotes.register(remote);
            remotes['github2'].should.eql(remote);
        });
    });

    describe('#resolve()', function () {
        it('should return an instance with remote\'s name', function () {
            remotes.resolve('github2').should.eql(remote);
        });
    });
});