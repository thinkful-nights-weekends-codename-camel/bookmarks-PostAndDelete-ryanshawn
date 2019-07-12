const express = require('express');
const bodyParser = express.json();
const bookmarksRouter = express.Router();
const uuid = require('uuid/v4');
const logger = require('./logger');
const BookmarksService = require('./bookmarks-service');
const xss = require('xss')
const path = require('path')

const sanitizeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title), // sanitize title
  url: xss(bookmark.url), // sanitize url
  rating: bookmark.rating,
  description: xss(bookmark.description) // sanitize description
});

bookmarksRouter
  .route('/api/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        // Make sure bookmarks that are sanitized of
        // content that could be used for XSS attack
        let xssSafeBookmarks = bookmarks.map(bookmark => sanitizeBookmark(bookmark));
        // Bookmarks is safe to send now
        // that its content is sanitized
        res.json(xssSafeBookmarks);
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, rating, description } = req.body
    const newBookmark = { title, url, rating, description }
    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }
    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
          .json(sanitizeBookmark(bookmark))
      })
      .catch(next)

    if (!Number(rating) || rating < 1 || rating > 5) {
      logger.error(`The rating must be a number, greater than 0, and less than 6.`)
      return res.status(400).send('Rating should be a number greater than 0 and less than 6');
    }
    const regexURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%\+.~#?&//=]*)/;

    if (!url.match(regexURL)) {
      logger.error(`The URL entered is not a valid URL.`)
      return res
        .status(400)
        .send('Must be a valid URL');
    }
  })

bookmarksRouter
  .route('/api/bookmarks/:id')
  .all((req, res, next) => {
    BookmarksService.getById(
      req.app.get('db'),
      req.params.id
    )
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
        res.bookmark = bookmark // save the bookmark for the next middleware
        next() // don't forget to call next so the next middleware happens!
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(sanitizeBookmark(res.bookmark))
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.id
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
    const { title, content, style } = req.body
    const articleToUpdate = { title, content, style }

    const numberOfValues = Object.values(articleToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'style' or 'content'`
        }
      })
    }

    ArticlesService.updateArticle(
      req.app.get('db'),
      req.params.article_id,
      articleToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })
  


module.exports = bookmarksRouter;