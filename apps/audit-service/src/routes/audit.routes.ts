import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';

const router = Router();

router.get('/logs', (req, res) => auditController.getLogs(req, res));
router.get('/devices', (req, res) => auditController.getDevices(req, res));
router.delete('/devices/:id', (req, res) =>
  auditController.deleteDevice(req, res)
);

export default router;
