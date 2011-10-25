var ActiveRecord = require('db/ar/active_record');

module.exports = Comment.inherits( ActiveRecord );

function Comment( params ) {
  this._init( params );
}

Comment.prototype.get_table_name = function(){
  return 'testbase_ar.comments';
}

Comment.prototype.relations = function(){
  return {
    post    : this.belongs_to( 'post' ).by( 'post_id' ),
    author  : this.belongs_to( 'user' ).by( 'author_id' )
  }
}