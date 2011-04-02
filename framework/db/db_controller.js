var Component         = require('components/component');
var MysqlDbConnection = require('./mysql/mysql_db_connection');

module.exports = DbController.inherits( Component );

function DbController( params ) {
  this._init( params );
}


DbController.prototype._init = function( params ) {
  this.super_._init( params );

  this._db          = null;
  this.__db_config  = params;
};


DbController.prototype._define_getter = function () {
  var self = this;
  this.app.__defineGetter__( 'db', function() {
    return self._db ? self._db : self._init_database();
  } );
};


DbController.prototype._init_database = function () {
  var db_type = this.__db_config.type;
  delete this.__db_config.type;

  this.__db_config.app = this.app;

  switch ( db_type ) {
    case 'mysql':
      this._db = new MysqlDbConnection( this.__db_config );
      break;

    default :
      this.log( 'You must specify data base type ( db.type ) in your configuration file', 'error' );
      break;
  }

  return this._db;
};