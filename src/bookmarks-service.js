
const BookmarksService = {
  getAllBookmarks(knex) {
    return knex.select('*').from('bookmarks_links')
  },
  insertBookmark(knex,newBookmark) {
    return knex
      .insert(newBookmark)
      .into('bookmarks_links')
      .returning('*')
      .then(rows => {
        return rows[0]
      })
  },
  getById(knex,id) {
    return knex 
    .select('*')
    .from('bookmarks_links')
    .where('id', id)
    .first()
  },
  deleteBookmark(knex, id) {
    return knex('bookmarks_links')
      .where({ id })
      .delete()
  },
  updateBookmark(knex, id, newBookmarkFields) {
    return knex('bookmarks_links')
      .where({ id })
      .update(newBookmarkFields)
  },
}

module.exports = BookmarksService;