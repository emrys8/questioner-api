import { Router } from 'express';
import rsvpController from '../controllers/rsvp';
import schemaValidator from '../middlewares/schema/schemaValidator';

const router = Router();
const validateResult = schemaValidator();

router
  .route('/meetups/:meetupId/rsvps')
  .post(validateResult, rsvpController.makeRsvp);

router
  .route('/meetups/:meetupId/rsvps/:rsvpId')
  .get(rsvpController.getRsvp)
  .patch(rsvpController.updateRsvp);

export default router;
