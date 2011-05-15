var AppModule = require('app_module');
var Component = require('components/component');
var path      = require('path');
var fs        = require('fs');

var system_components = {
  'web_sockets'        : require( '../../client_connections/web_sockets/web_sockets_server' ),
  'users'              : require( '../../users/users_manager' ),
  'db'                 : require( '../../db/db_controller' ),
  'log_router'         : require( '../../logging/log_router' ),
  'tests'              : require( '../../tests/test_component' ),
  'mail'               : require( '../../mailing/mailer' )
};

module.exports = ComponentsManager.inherits( AppModule );


function ComponentsManager( params ) {
  this._init( params );
}


ComponentsManager.prototype._init = function( params ) {
  this.super_._init( params );

  this._components              = params.components;
  this._loaded_components       = {};
  this._user_components         = null;
  this._user_components_folder  = 'components';
};


ComponentsManager.prototype.load_components = function () {

  for ( var component_name in this._components ) {
    this.load_component( component_name );
  }
};


ComponentsManager.prototype.load_component = function ( component_name ) {
  if ( this._loaded_components[ component_name ] ) return false;

  this.log( 'Load component "%s"'.format( component_name ), 'trace' );
  var component_params = this._components[ component_name ];
  if ( !component_params ) return false;

  if ( typeof component_params != 'object' ) component_params = {};

  var component_class = system_components[ component_name ];

  if ( !component_class ) component_class = this.get_user_component( component_name );

  if ( !component_class || !( component_class.prototype instanceof Component ) ) {
    this.log( 'Try to load unknown component: "%s"'.format( component_name ), 'warning' );
    return false;
  }

  component_params.name = component_name;
  component_params.app  = this.app;

  var component = new component_class( component_params );
  this._loaded_components[ component_name ] = component;
  this.app.register_component( component );
};


ComponentsManager.prototype.get_user_component = function ( component_name ) {
  if ( !this._user_components ) {
    var components_path = path.join( this.app.base_dir, this._user_components_folder );

    this._user_components = {};
    if ( path.existsSync( components_path ) ) {
      this.log( 'Collecting user components in ' + components_path );
      this._collect_components_in_path( components_path, this._user_components );
    }
  }

  if ( typeof this._user_components[ component_name ] == "string" )
    this._user_components[ component_name ] = require( this._user_components[ component_name ] );

  return this._user_components[ component_name ];
};


ComponentsManager.prototype._collect_components_in_path = function ( components_path, components ) {
  if ( path.basename( components_path ) == 'lib' ) return;

  var stats = fs.statSync( components_path );

  if ( stats.isDirectory() ) fs.readdirSync( components_path ).forEach( function( file ) {
      this._collect_components_in_path( path.join( components_path, file ), components );
    }, this );

  else if ( stats.isFile() ) {
    var component_name = path.basename( components_path, '.js' );

    if ( this._user_components[ component_name ] )
      this.log( 'Two or more user components with same name "%s" are found'.format( component_name ), 'warning' );
    else {
      this._user_components[ component_name ] = components_path;
      this.log( 'User component is found: %s'.format( component_name ) );
    }
  }
};