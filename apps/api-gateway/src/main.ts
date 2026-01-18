import { apiGatewayEnvSchema } from '@aegis/common';
import dotenv from 'dotenv';

dotenv.config({
  path: '../../../.env',
});

const env = apiGatewayEnvSchema.parse(process.env);

Object.freeze(env);

import {
  accessLogger,
  errorMiddleware,
  extractAuthContext,
  logger,
  requestTracer,
} from '@aegis/common';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'express-async-errors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const { HOST: host, API_GATEWAY_PORT: port, ORIGIN_HOST_1: origin } = env;
const app = express();

app.use(requestTracer);
app.use(accessLogger);

app.use(
  cors({
    origin: [origin],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Correlation-Id'],
  })
);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(extractAuthContext);
app.set('trust proxy', 1);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  legacyHeaders: true,
  keyGenerator: (req, res) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return ipKeyGenerator(ip);
  },
});

app.use(rateLimiter);

app.get('/gateway-health', (req, res) => {
  res.send({ message: 'Welcome to api-gateway!' });
});

app.use(errorMiddleware);

const server = app.listen(port, () => {
  logger.info(`Listening at ${host}:${port}`);
});
server.on('error', (err) => logger.error(err));
