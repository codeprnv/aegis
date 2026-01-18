import { expressMiddleware } from 'cls-rtracer';

export const requestTracer = expressMiddleware({
  useHeader: true,
  headerName: 'X-Correlation-ID',
});
