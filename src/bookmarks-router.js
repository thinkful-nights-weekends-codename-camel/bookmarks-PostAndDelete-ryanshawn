const express = require('express');
const bodyParser = express.json();
const bookmarksRouter = express.Router();
const uuid = require('uuid/v4');
const logger = require('./logger');
const BookmarksService = require('./bookmarks-service');
const xss = require('xss')
const store = [
  {
    id: 0,
    title: 'Google',
    url: 'http://www.google.com',
    rating: '3',
    desc: 'Internet-related services and products.'
  },
  {
    id: 1,
    title: 'Thinkful',
    url: 'http://www.thinkful.com',
    rating: '5',
    desc: '1-on-1 learning to accelerate your way to a new high-growth tech career!'
  },
  {
    id: 2,
    title: 'Github',
    url: 'http://www.github.com',
    rating: '4',
    desc: 'brings together the world\'s largest community of developers.'
  }
];
const sanitizeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title), // sanitize title
  url: xss(bookmark.url), // sanitize content
  rating: bookmark.rating,
  description: xss(bookmark.description)
});

bookmarksRouter
  .route('/bookmarks')
  .get((req,res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks);
      })
      .catch(next)
  })
  /*.post(bookmarksJson, (req, res) => {
    for(let entry of ["title","url","rating"]) {
      if (!req.body[entry]){
        logger.error(`Title, URL, and Rating are required.`)
        return res.status(400).send('Invalid data');
      }
    }*/
  .post(bodyParser, (req, res, next) => {
      const { title, url, rating } = req.body
      const newBookmark = { title, url, rating }
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
            .location(`/bookmarks/${bookmark.id}`)
            .json(sanitizeBookmark(bookmark))
        })
        .catch(next)
    
    if (!Number(rating) || rating < 0 || rating > 5) {
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
  .route('/bookmarks/:id')
  .get((req,res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getById(knexInstance, req.params.id)
      .then(bookmark => {
        if(!bookmark) {
          logger.error(`Bookmark with id ${req.params.id} was not found.`);
          return res.status(404).json({
            error: { message: `Bookmark does not exist`}
          })
        }
        res.json(bookmark)
      })
      .catch(next)
  })
  .delete((req,res) => {
    const { id } = req.params;
    const bookmarks = store.findIndex(bookmark => bookmark.id == id);
    store.splice(bookmarks, 1);
    logger.info(`Bookmark with id ${id} deleted.`)
    res.status(201).send('Bookmark deleted.')
  })

module.exports = bookmarksRouter;