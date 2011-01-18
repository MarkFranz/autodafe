var DBCriteria    = require('./db_criteria');
var DBExpression  = require('./db_expression');

var CommandBuilder = module.exports = function( params ) {
  this._init( params );
};


CommandBuilder.prototype.PARAM_PREFIX = ':atdf';


CommandBuilder.prototype._init = function( params ) {
  this._schema      = params.schema;
  this._connection  = this._schema.get_db_connection();
};


CommandBuilder.prototype.get_db_connection = function () {
  return this._connection;
};


CommandBuilder.prototype.get_schema = function () {
  return this._schema;
};


CommandBuilder.prototype._ensure_table = function( table ) {
  var table_name;

  if ( typeof table == "string" && (table = this._schema.get_table( table_name = table )) === null )
    throw new Error( 'Table ' + table_name + ' does not exist.' );
}


CommandBuilder.prototype.create_find_command = function( table, criteria, alias ) {
  this._ensure_table( table );

  var select = criteria.select instanceof Array ? criteria.select.join(',') : criteria.select;

  alias = criteria.alias != '' ? criteria.alias : alias || 't';
  alias = this._schema.quote_table_name( alias );

  var sql = ( criteria.distinct ? 'SELECT DISTINCT ' : 'SELECT ' ) +
            select + " FROM " + table.raw_name + " AS "  + alias;
  sql = this.apply_join(      sql, criteria.join      );
  sql = this.apply_condition( sql, criteria.condition );
  sql = this.apply_group(     sql, criteria.group     );
  sql = this.apply_having(    sql, criteria.having    );
  sql = this.apply_order(     sql, criteria.order     );
  sql = this.apply_limit(     sql, criteria.limit, criteria.offset );

  var command = this._connection.create_command( sql );
  this.bind_values( command, criteria.params );
  return command;
}


CommandBuilder.prototype.create_count_command = function( table, criteria, alias ) {
  this._ensure_table( table );
  
  alias = criteria.alias != '' ? criteria.alias : alias || 't';
  alias = this._schema.quote_table_name( alias );

  var sql = ( criteria.distinct ? 'SELECT DISTINCT' : 'SELECT' ) +
            " COUNT(*) FROM " + table.raw_name + " AS " + alias;
  sql = this.apply_join( sql, criteria.join );
  sql = this.apply_condition( sql, criteria.condition );

  var command = this._connection.create_command( sql );
  this.bind_values( command, criteria.params );
  return command;
}


CommandBuilder.prototype.create_delete_command = function( table, criteria ) {
  this._ensure_table( table );

  var sql = "DELETE FROM " +table.raw_name;
  sql = this.apply_join(      sql, criteria.join      );
  sql = this.apply_condition( sql, criteria.condition );
  sql = this.apply_group(     sql, criteria.group     );
  sql = this.apply_having(    sql, criteria.having    );
  sql = this.apply_order(     sql, criteria.order     );
  sql = this.apply_limit(     sql, criteria.limit, criteria.offset );

  var command = this._connection.create_command( sql );
  this.bind_values( command, criteria.params );
  return command;
}


CommandBuilder.prototype.create_insert_command = function( table, data ) {
  this._ensure_table( table );

  var fields        = [];
  var values        = {};
  var placeholders  = [];

  var i = 0;

  for ( var name in data ) {
    var value   = data[ name ];
    var column  = table.get_column( name );

    if ( column != null && ( value != null || column.allow_null ) ) {
      fields.push( column.raw_name );

      if ( value instanceof DBExpression ) {
        placeholders.push( value.expression );

        for ( var n in value.params ) {
          values[ n ] = value.params[ n ];
        }
      }
      else {
        placeholders.push( this.PARAM_PREFIX + i );
        values[ this.PARAM_PREFIX + i ] = column.typecast( value );
        i++;
      }
    }
  }

  if ( !fields.length ) {
    var pks = table.primary_key instanceof Array ? table.primary_key : [ table.primary_key ];

    for ( var p = 0, p_ln = pks.length; p < p_ln; p++ ) {
      fields.push( table.get_column( pks[ p ] ).raw_name );
      placeholders.push( 'NULL' );
    }
  }

  var sql = "INSERT INTO " + table.raw_name + " (" + fields.join(', ') + ') ' +
            'VALUES (' + placeholders.join(', ') + ')';

  var command = this._connection.create_command( sql );
  command.get_last_insert_id_on_success( true );

  for ( name in values ) {
    command.bind_value( name, values[ name ] );
  }

  return command;
}


CommandBuilder.prototype.create_update_command = function( table, data, criteria ) {
  this._ensure_table( table );

  var fields = [];
  var values = {};
  var i      = 0;
  var v      = 0;

  var bind_by_position = criteria.params[0] != undefined;

  for ( var name in data ) {
    var value   = data[ name ];
    var column  = table.get_column( name );

    if ( column != null ) {

      if ( value instanceof DBExpression ) {
        fields.push( column.raw_name + '=' + value.expression );

        for ( var n in value.params ) {
          values[ n ] = value.params[ n ];
        }
      }
      else if ( bind_by_position ) {
        fields.push( column.raw_name + '=?' );
        values[ v++ ] = column.typecast( value );
      }
      else {
        fields.push( column.raw_name + '=' + this.PARAM_PREFIX + i );
        values[ this.PARAM_PREFIX + i ] = column.typecast( value );
        i++;
      }
    }
  }

  if ( !fields.length ) throw new Error( 'No columns are being updated for table ' + table.name );

  var sql = "UPDATE " + table.raw_name + " SET " + fields.join( ', ' );
  sql = this.apply_join(      sql, criteria.join      );
  sql = this.apply_condition( sql, criteria.condition );
  sql = this.apply_order(     sql, criteria.order     );
  sql = this.apply_limit(     sql, criteria.limit, criteria.offset );

  var command = this._connection.create_command( sql );
  command.get_last_insert_id_on_success( true );

  this.bind_values( command, Object.merge( values, criteria.params ) );
  return command;
}


CommandBuilder.prototype.create_update_counter_command = function( table, counters, criteria ) {
  this._ensure_table( table );

  var fields = [];

  for ( var name in counters ) {
    var value   = counters[ name ];
    var column  = table.get_column( name );

    if ( column != null ) {
      if ( value < 0 ) fields.push( column.raw_name + '=' + column.raw_name + value );
      else             fields.push( column.raw_name + '=' + column.raw_name + '+' + value );
    }
  }

  if ( fields.length ) {
    var sql = "UPDATE " + table.raw_name + " SET " + fields.join(', ');
    sql = this.apply_join(      sql, criteria.join      );
    sql = this.apply_condition( sql, criteria.condition );
    sql = this.apply_order(     sql, criteria.order     );
    sql = this.apply_limit(     sql, criteria.limit, criteria.offset );

    var command = this._connection.create_command( sql );
    this.bind_values( command, criteria.params );
    return command;
  }
  else throw new Error( 'No counter columns are being updated for table ' + table.name );
}


CommandBuilder.prototype.create_sql_command = function( sql, params ) {
  var command = this._connection.create_command( sql );
  this.bind_values( command, params );
  return command;
}


CommandBuilder.prototype.apply_join = function( sql, join ) {
  return join != '' ? sql + ' ' + join : sql;
};


CommandBuilder.prototype.apply_condition = function( sql, condition ) {
  return condition != '' ? sql + ' WHERE ' + condition : sql;
};


CommandBuilder.prototype.apply_order = function( sql, order_by ) {
  return order_by != '' ? sql + ' ORDER BY ' + order_by : sql;
};


CommandBuilder.prototype.apply_limit = function( sql, limit, offset ) {
  if ( limit >= 0 ) sql += ' LIMIT ' + Math.round( limit );
  if ( offset > 0 ) sql += ' OFFSET ' + Math.round( offset );

  return sql;
}


CommandBuilder.prototype.apply_group = function( sql, group ) {
  return group != '' ? sql + ' GROUP BY ' + group : sql;
}


CommandBuilder.prototype.apply_having = function( sql, having ) {
  return having != '' ? sql + ' HAVING ' + having : sql;
};


CommandBuilder.prototype.bind_values = function( command, values ) {
  if ( Object.empty( values ) ) return;

  if ( values instanceof Array ) { // question mark placeholders
    for ( var i = 0, i_ln = values.length; i < i_ln; i++ )
      command.bind_value( i, values[ i ] );
  }
  else {// named placeholders
    for ( var name in values ) {
      var true_name = name[0] == ':' ? name : ':' + name;
      command.bind_value( true_name, values[ name ] );
    }
  }
}


CommandBuilder.prototype.create_criteria = function( condition, params ) {
  condition = condition || '';
  params    = params    || {};

  //todo: реакция на undefined в параметрах

  var criteria;
  if ( condition instanceof Object ) criteria = new DBCriteria( condition );
  else if ( condition instanceof DBCriteria ) criteria = condition.clone();
  else criteria = new DBCriteria({
    condition : condition,
    params    : params
  });

  return criteria;
}


CommandBuilder.prototype.create_pk_criteria = function( table, pk, condition, params, prefix ) {
  this._ensure_table( table );

  var criteria = this.create_criteria( condition, params );
  if ( criteria.alias != '' ) prefix = this._schema.quote_table_name( criteria.alias ) + '.';
  if ( !( pk instanceof Array ) ) pk = [ pk ];
  if ( table.primary_key instanceof Array && pk[0] == undefined && !Object.empty( pk ) ) // single composite key
    pk = [ pk ];

  condition = this.create_in_condition( table, table.primary_key, pk, prefix );

  if ( criteria.condition != '' ) criteria.condition = condition + ' AND (' + criteria.condition + ')';
  else criteria.condition = condition;

  return criteria;
}


CommandBuilder.prototype.create_pk_condition = function( table, values, prefix ) {
  this._ensure_table( table );
  return this.create_in_condition( table, table.primary_key, values, prefix );
}


CommandBuilder.prototype.create_column_criteria = function( table, columns, condition, params, prefix ) {
  this._ensure_table( table );

  var criteria = this.create_criteria( condition, params );
  if ( criteria.alias != '' ) prefix = this._schema.quote_table_name( criteria.alias ) + '.';

  var bind_by_position = ( criteria.params[0] != undefined );
  var conditions  = [];
  var values      = [];
  var i = 0;

  if ( prefix == null ) prefix = table.raw_name + '.';
  for ( var name in columns ) {
    var value   = columns[ name ];
    var column  = table.get_column( name );

    if ( column == null ) throw new Error( 'Table ' + table.name + ' does not have a column named ' + name );

    if ( value instanceof Array )
      conditions.push( this.create_in_condition( table, name, value, prefix ) );
    else if ( value != null ) {
      if ( bind_by_position ) {
        conditions.push( prefix + column.raw_name + '=?' );
        values.push( value );
      }
      else {
        conditions.push( prefix + column.raw_name + '=' + this.PARAM_PREFIX + i );
        values[ this.PARAM_PREFIX + i ] = value;
        i++;
      }
    }
    else
      conditions.push( prefix + column.raw_name + ' IS NULL' );
  }

  criteria.params = Object.merge( values, criteria.params );
  if ( conditions[0] != undefined ) {
    if ( criteria.condition != '' )
      criteria.condition = conditions.join( ' AND ' ) + ' AND (' + criteria.condition + ')';
    else
      criteria.condition = conditions.join( ' AND ' )
  }
  return criteria;
}


//CommandBuilder.prototype.create_search_condition = function( table, columns, keywords, prefix = null, case_sensitive = true ) {
//  this._ensure_table( table );
//  if ( !keywords instanceof Array )
//    keywords = preg_split( '/\s+/u', keywords, -1, _p_r_e_g__s_p_l_i_t__n_o__e_m_p_t_y );
//  if ( empty( keywords ) )
//    return '';
//  if ( prefix === null )
//    prefix = table.raw_name.
//  '.';
//  conditions = array();
//  foreach( columns
//  as
//  name
//)
//  {
//    if ( (column = table.get_column( name )) === null )
//      throw new _c_db_exception( _yii::t( 'yii', '_table "{table}" does not have a column named "{column}".',
//        array( '{table}' = > table.name, '{column}' = > name )
//  ))
//    ;
//    condition = array();
//    foreach( keywords
//    as
//    keyword
//  )
//    {
//      if ( case_sensitive )
//        condition[] = prefix.column.raw_name.
//      ' _l_i_k_e '.
//      this._connection.quote_value( '%'.keyword.
//      '%'
//    )
//      ;
//    else
//      condition[] = '_l_o_w_e_r('.prefix.column.raw_name.
//      ') _l_i_k_e _l_o_w_e_r('.
//      this._connection.quote_value( '%'.keyword.
//      '%'
//    ).
//      ')';
//    }
//    conditions[] = implode( ' _a_n_d ', condition );
//  }
//  return '('.implode( ' _o_r ', conditions ).
//  ')';
//}
//

CommandBuilder.prototype.create_in_condition = function( table, column_name, values, prefix ) {
  if ( Object.empty( values ) ) return '0=1';

  this._ensure_table( table );

  if ( !prefix ) prefix = table.raw_name + '.';

  var db = this._connection;

  var column, value, name;

  if ( typeof column_name == "string" ) {// simple key
    column = table.columns[ column_name ];

    if ( !column ) throw new Error( 'Table ' + table.name + ' does not have a column named ' + column_name + '.' );

    for ( var v = 0, v_ln = values.length; v < v_ln; v++ ) {
      value = values[ v ];

      value = column.typecast( value );
      if ( typeof value == "string" )
        value = db.quote_value( value );

      values[ v ] = value;
    }

    if ( values.length == 1 ) return prefix + column.raw_name + ( values[0] === null ? ' IS NULL' : '=' + values[0] );
    else return prefix + column.raw_name + ' IN (' + values.join(', ') + ')';
  }
  else if ( column_name instanceof Array ) {// composite key: values=array(array('pk1'=>'v1','pk2'=>'v2'),array(...))

    for ( var c = 0, c_ln = column_name.length; c < c_ln; c++ ) {
      name    = column_name[ c ];
      column  = table.columns[ name ];

      if ( !column ) throw new Error( 'Table ' + table.name + ' does not have a column named ' + name + '.' );

      for ( var i = 0; i < n; ++i ) {
        if ( values[i][name] != undefined ) {

          value = column.typecast( values[i][name] );

          if ( typeof value == "string" ) values[i][name] = db.quote_value( value );
          else values[i][name] = value;
        }
        else throw new Error( 'The value for the column ' + name + 
                              ' is not supplied when querying the table ' + table.name );
      }
    }

    if ( values.length == 1 ) {
      var entries = [];
      for ( name in values[0] ) {
        value = values[0][ name ];
        entries.push( prefix + table.columns[name].raw_name + ( value == null ? ' IS NULL' : '=' + value ) );
      }

      return entries.join( 'AND ' );
    }

    return this._create_composite_in_condition( table, values, prefix );
  }
  else
    throw new Error( 'Column name must be either a string or an array.' );
}


CommandBuilder.prototype._create_composite_in_condition = function( table, values, prefix ) {
  var key_names = [];
  for ( var name in values[0] ) key_names.push( prefix + table.columns[name].raw_name );

  var vs = [];
  for ( var v = 0, v_ln = values.length; v < v_ln; v++ ) {
    vs.push( '(' + values[v].join( ', ' ) + ')' );
  }

  return '(' + key_names.join( ', ' ) + ') IN (' + vs.join(', ') + ')';
}
