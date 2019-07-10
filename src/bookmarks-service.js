
const BookmarksService = {
  getAllBookmarks(knex) {
    return knex.select('*').from('bookmarks_list')
  },
  insertBookmark(knex,newBookmark) {
    return knex
      .insert(newBookmark)
      .into('bookmarks_list')
      .returning('*')
      .then(rows => {
        return rows[0]
      })
  },
  getById(knex,id) {
    return knex 
    .select('*')
    .from('bookmarks_list')
    .where('id', id)
    .first()
  },
  deleteBookmark(knex, id) {
    return knex('bookmarks_list')
      .where({ id })
      .delete()
  },
  updateBookmark(knex, id, newBookmarkFields) {
    return knex('bookmarks_list')
      .where({ id })
      .update(newBookmarkFields)
  },
}

module.exports = BookmarksService;