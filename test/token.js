'use strict';
require('fis-kernel');
var token = require('../lib/token');
var fs = require('fs');
var path = require('path');
var token_path = path.join( __dirname , '../lib/.token.json' );
describe('token', function () {
    describe('#prompt()', function(){
        beforeEach(function(){
            token.reset();
            fs.existsSync(token_path) && fs.unlinkSync(token_path);
        });
        it('should specify [prompt] method ', function (done) {
            token.prompt.should.be.a.function;
            token.prompt(function(tokenString){
                tokenString.should.match(/\w+/);
                done()
            });
                   
        });
        afterEach(function(){
            fs.existsSync(token_path) && fs.unlinkSync(token_path);
        });

    });

    describe('#get()', function(){
        beforeEach(function(done){
            token.reset();
            token.prompt(function(){
                done();
            });
        });

        it('should specify an [get] method', function () {
            token.get.should.be.a.function;
            token.get().should.match(/\w+/);;
        });

        afterEach(function(){
            fs.existsSync(token_path) && fs.unlinkSync(token_path);
        });
    });
});