import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db';
import { omitProps } from '../utils';
import userHelpers from './helpers/user';

const userHelper = userHelpers(db, jwt);


export default {
  /**
   * @func signUpUser
   * @param {*} req
   * @param {*} res
   * @returns {*}  JSON object indicating a successful or failed sign up request
   */
  async signUpUser(req, res) {
    const {
      email, password, firstname, lastname = ''
    } = req.body;

    const getUserQuery = {
      text: 'SELECT * FROM "User" WHERE email=$1',
      values: [email]
    };

    try {
      const result = await db.queryDb(getUserQuery);
      if (result.rows.length > 0) {
        // user exist
        return res.status(422).send({
          status: 422,
          error: 'A user with this email already exist'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newTableResult = await db.queryDb({
        text: `INSERT INTO "User" (email,password,firstname,lastname)
                         VALUES ($1, $2, $3, $4) RETURNING *`,
        values: [email, hashedPassword, firstname, lastname]
      });
      const userRecord = newTableResult.rows[0];

      const userAuthToken = userHelper.obtainToken({
        payload: {
          email, admin: userRecord.isadmin
        }
      });

      return res.status(201).send({
        status: 201,
        data: [{
          token: userAuthToken,
          user: omitProps(newTableResult.rows[0], ['password'])
        }]
      });
    } catch (e) {
      return res.status(400)
        .send({
          status: 400,
          error: 'Invalid request, please check your email and try again'
        });
    }
  },

  /**
   * @func loginUser
   * @param {Request} req
   * @param {Response} res
   * @returns {*} JSON object indicating a successful or failed request
   */
  async loginUser(req, res) {
    try {
      const { email, password, username } = req.body;

      /**
       * @const emailRegExp
       * @author https://emailregex.com/
       * @description This regex was obtained at https://email.regex.com
       */
      const emailRegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (emailRegExp.test(email)) {
        // user provided a valid email address
        const userResult = await db.queryDb({
          text: 'SELECT * FROM "User" WHERE email=$1',
          values: [email]
        });

        if (userResult.rows.length > 0) {
          // user with this email exist
          const result = await userHelper.getUserPassword({ condition: 'email', value: email });
          const { encryptedpassword } = result.rows[0];

          const match = await bcrypt.compare(password, encryptedpassword);

          const userAuthToken = userHelper.obtainToken({
            payload: {
              email,
              admin: userResult.rows[0].isadmin
            }
          });

          if (match) {
            return res.status(201)
              .send({
                status: 201,
                data: [{
                  token: userAuthToken,
                  user: omitProps(userResult.rows[0], ['password'])
                }]
              });
          }
          throw userHelper.createUserError('You entered an incorrect password, please check and try again');
        } else {
          throw userHelper.createUserError('A user with this email does not exist. Please check and try again. you can create an account at: http://localhost:9999/api/v2/auth/signup');
        }
      } else if (username || !emailRegExp.test(email)) {
        // ===========================================================
        /* Assumption: the Frontend UI allows a user to
         * enter either an email or a username in the provided email field
         *
         * Making request using an HTTP Client besides a browser,
         * a user can enter an additional username field.
         * (Either email or the username) will be used.
        */
        // ===========================================================
        const userName = username || email;
        const userResult = await db.queryDb({
          text: 'SELECT * FROM "User" WHERE username=$1',
          values: [userName]
        });

        if (userResult.rows.length > 0) {
          const result = await userHelper.getUserPassword({
            condition: 'username',
            value: userName
          });
          const { encryptedpassword } = result.rows[0];
          const userRecord = userResult.rows[0];

          const match = await bcrypt.compare(password, encryptedpassword);

          const userAuthToken = userHelper.obtainToken({
            email, admin: userRecord.isadmin
          });

          if (match) {
            return res.status(201)
              .send({
                status: 201,
                data: [{
                  token: userAuthToken,
                  user: omitProps(userResult.rows[0], ['password'])
                }]
              });
          }
          throw userHelper.createUserError('You entered an incorrect password, please check and try again');
        } else {
          throw userHelper.createUserError('A user with this username does not exist. If you don`t have a username yet, you can login using your email');
        }
      }
    } catch (e) {
      return res.status(422)
        .send({
          status: 422,
          error: e.message
        });
    }
  }
};
