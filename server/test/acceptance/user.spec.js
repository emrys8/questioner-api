import 'chai/register-should';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../../app';
import db from '../../db';

describe.only('User API', () => {
  const testUser = {
    email: 'testuser@gmail.com',
    password: 'testuser1234',
    firstname: 'Test',
    lastname: 'User'
  };

  before('Setup', async () => {
    await db.dropTable({ tableName: 'Comment', });
    await db.dropTable({ tableName: 'Rsvp' });
    await db.dropTable({ tableName: 'Question' });
    await db.dropTable({ tableName: '"User"' });

    await db.createTable('User');
  });

  describe('POST /auth/signup', () => {
    beforeEach(async () => {

    });

    describe('handle valid/complete data', () => {
      it('should create a new user', (done) => {
        request(app)
          .post('/api/v1/auth/signup')
          .send(testUser)
          .expect(201)
          .end((err, res) => {
            if (err) return done(err);
            res.body.status.should.equal(201);
            res.body.data.should.be.an('array');
            res.body.data[0].user.email.should.equal('testuser@gmail.com');
            done();
          });
      });
    });

    afterEach(async () => {
    });

    describe('handle invalid/incomplete data', () => {
      beforeEach(async () => {
        await db.queryDb({
          text: `INSERT INTO "User" (firstname,lastname,email,password)
                 VALUES ($1, $2, $3, $4)
                `,
          values: ['user1', 'user1', 'user1@email.com', 'user1234']
        });
      });

      it('should return an error if user already exist', (done) => {
        request(app)
          .post('/api/v1/auth/signup')
          .send({
            email: 'user1@email.com',
            password: 'user1234',
            firstname: 'user1',
            lastname: 'user1'
          })
          .expect(409)
          .end((err, res) => {
            if (err) return done(err);
            res.body.status.should.equal(409);
            res.body.should.have.property('error');
            res.body.error.should.equal('The email you provided is already used by another user');
            done();
          });
      });
    });
  });

  describe('POST /auth/login', () => {
    beforeEach('Add Test User', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('testuser1234', salt);

      const query = {
        text: `INSERT INTO "User" (firstname, lastname, email, password)
        VALUES ('testuser', 'testuser', 'testuser@gmail.com', $1)`,
        values: [hashedPassword]
      };

      await db.queryDb(query);
    });
    it('should login a user', (done) => {
      request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@gmail.com',
          password: 'testuser1234'
        })
        .expect(201, done);
    });

    it('should not login an unregistered user', (done) => {
      request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonuser1@gmail.com',
          password: 'testuser1234'
        })
        .expect(409)
        .end((err, res) => {
          if (err) return done(err);
          res.body.status.should.equal(409);
          res.body.should.have.property('error');
          done();
        });
    });

    afterEach(async () => {

    });
  });
  after('Teardown', async () => {
    await db.dropTable({ tableName: 'Comment', });
    await db.dropTable({ tableName: 'Rsvp' });
    await db.dropTable({ tableName: 'Question' });
    await db.dropTable({ tableName: '"User"' });
  });
});
