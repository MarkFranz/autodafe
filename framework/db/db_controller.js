var Component = require('components/component');
var MysqlDBConnection = require('./mysql/mysql_db_connection');

var DBController = module.exports = function( params ) {
  this._init( params );
};


require('sys').inherits( DBController, Component );


DBController.prototype._init = function( params ) {
  Component.prototype._init.call( this, params );

  this._db          = null;

  this.__db_config  = params;
};


DBController.prototype._define_getter = function () {
  var self = this;
  this.app.__defineGetter__( 'db', function() {
    return self._db ? self._db : self._init_database();
  } );
};


DBController.prototype._init_database = function () {
  switch ( this.__db_config.type ) {
    case 'mysql':
      this._db = new MysqlDBConnection( this.__db_config );
      break;

    default :
      console.log( 'Warning! You must specify data base type ( db.type ) in your config file' );
      break;
  }

  return this._db;
};