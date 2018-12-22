import express from 'express';
import logger from 'morgan';
import helmet from 'helmet';

export const app = express();

app.set('json spaces', 2);

/* Middlewares */
app.use(logger('dev'));
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded());

app.get('*', (req, res) => {
  res.send({
    message: 'Welcome to the Questioner API'
  });
});

// catch 404 error and forward to
// error handler
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

// Development error handler
// This will print stacktraces

if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// Production error handler
// no stacktraces leaked to user
app.use((err, req, res) => {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});

export default app;
