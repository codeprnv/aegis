import { HTTP_HEADERS } from '@aegis/common';
import { expressMiddleware } from 'cls-rtracer';

export const requestTracer = expressMiddleware({
  useHeader: true,
  headerName: HTTP_HEADERS.CORRELATION_ID,
});
