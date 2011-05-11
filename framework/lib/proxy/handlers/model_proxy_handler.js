var FunctionProxyHandler = require('./function_proxy_handler');

module.exports = ModelProxyHandler.inherits( FunctionProxyHandler );

function ModelProxyHandler( params ) {
  this._init( params );
}


ModelProxyHandler.prototype._init = function( params ) {
  this.super_._init( params );

  this._instance    = params.instance || null;
};


ModelProxyHandler.prototype.get = function ( receiver, name ) {
  if ( name == 'prototype' || name in Function.prototype && name != 'constructor' )
    return this.target[ name ];

  if ( !this._instance ) this._instance = this.target();
  if ( name == 'constructor' ) return this._instance.constructor;
  
  return name == '__origin__' ? this._instance : this._instance.get_attribute( name );
};


ModelProxyHandler.prototype.set = function ( receiver, name, value ) {
  if ( !this._instance ) this._instance = this.target();
  return this._instance.set_attribute( name, value );
};


ModelProxyHandler.prototype.get_object_proxy = function () {
  return FunctionProxyHandler.super_.prototype.get_proxy.call( this );
};