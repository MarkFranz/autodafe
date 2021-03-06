module.exports = Category.inherits( autodafe.db.ActiveRecord );

function Category( params ) {
  this._init( params );
}


Category.prototype.get_table_name = function(){
  return 'categories';
}


Category.prototype.relations = function(){
  return {
    posts    : this.many_many( 'post' ).by( 'post_category( category_id, post_id )' ),
    parent   : this.belongs_to( 'category' ).by( 'parent_id' ),
    children : this.has_many( 'category' ).by( 'parent_id' ),
    nodes    : this.has_many( 'category' ).by( 'parent_id', {
      With : [ 'parent', 'children' ]
    } ),
    post_count : this.stat( 'post' ).by( 'post_category( category_id, post_id )' )
  }
}