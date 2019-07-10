const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe.only('Bookmarks Endpoints', function () {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db)
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('bookmarks_list').truncate());

  afterEach('cleanup', () => db('bookmarks_list').truncate());

  describe('GET /bookmarks', () => {
    context('Given no bookmarks', () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_list')
          .insert(testBookmarks)
      });

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  });

  describe('GET /bookmarks/:bookmarks_id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark does not exist` } })
      })
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_list')
          .insert(testBookmarks)
      });

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      });
    });
  });

  describe(`POST /bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function () {
      this.retries(3);
      const newBookmark = {
        title: 'Optimizing Google Fonts Performance',
        url: 'https://www.smashingmagazine.com/2019/06/designing-ar-apps-guide/',
        description: 'This is a test description',
        rating: 4.5
      }

      return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(Number(res.body.rating)).to.eql(Number(newBookmark.rating))
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
        })
        .then(postRes =>
          supertest(app)
            .get(`/bookmarks/${postRes.body.id}`)
            .expect(postRes.body)
        )
    });

    const requiredFields = ['title', 'url', 'rating']
    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Google',
        url: 'http://www.google.com',
        rating: 4.1
      }
      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newBookmark[field]
        return supertest(app)
          .post('/bookmarks')
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })

    context(`Given an XSS attack bookmark`, () => {
      it(`removes any XSS attack content and creates a bookmark, responding with 201`, function () {
        const maliciousBookmark = {
          title: 'Naughty naughty very naughty <script>alert("pwned");</script>',
          url: 'https://hack-you.com <script>alert("i haxd you");</script>',
          rating: 4.2,
          description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
        }
        return supertest(app)
          .post('/bookmarks')
          .send(maliciousBookmark)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"pwned\");&lt;/script&gt;')
            expect(res.body.url).to.eql('https://hack-you.com &lt;script&gt;alert(\"i haxd you\");&lt;/script&gt;')
            expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })
});