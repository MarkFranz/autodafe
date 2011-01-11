var io                = require('./Socket.IO');
var http              = require('http');
var ClientConnection  = require('components/client_connection');

var WebSocketsServer = module.exports = function( config ) {
  this._init( config );
};


require( 'sys' ).inherits( WebSocketsServer, ClientConnection );


WebSocketsServer.prototype._init = function ( params ) {
  ClientConnection.prototype._init.call( this, params );
  
  this.__io     = null;

  this._server  = null;
  this._clients = {};

  var self = this;
  this.app.on( 'run', function() {
    self.run();
  } );
};


WebSocketsServer.prototype.run = function () {
  this._server = http.createServer();
  this._server.listen( 8080 );
  
  this.__io = io.listen( this._server );

  var self = this;
  this.__io.on( 'connection', function( client ) {
    self._on_connect( client );
  } );
};


WebSocketsServer.prototype._on_connect = function ( client ) {
  var session_id              = client.sessionId;
  this._clients[ session_id ] = client;

  var self = this;

  client.on( 'message', function( message ) {
    self._on_message( message, session_id );
  } );

  client.on( 'disconnect', function() {
    self._on_disconnect( session_id );
  } );

  ClientConnection.prototype._on_connect.call( this, session_id );
};


ClientConnection.prototype.get_client_by_session_id = function ( session_id ) {
  return this._clients[ session_id ];
};


WebSocketsServer.prototype._on_message = function ( message, session_id ) {
  var data = JSON.parse( message );

  if ( !data ) return console.log( 'Message: "' + message + '" is not in JSON' );

  console.log( 'WebSockets message has been received. session_id = ' + session_id );
  this.app.router.route( data.action, data.params, session_id );
};


WebSocketsServer.prototype._on_disconnect = function ( user_identity ) {

};