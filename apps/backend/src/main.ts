import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

// Express's default body-parser caps requests at 100kb — well under the
// configurable event-payload limit (256kb default). Disable Nest's built-in
// parser and re-add it sized above that limit, so a legitimate ~200kb event
// reaches EventPayloadSizeValidatorService instead of being rejected first
// by body-parser's own, unrelated default.
const MAX_REQUEST_BODY_BYTES =
  parseInt(process.env.EVENTS_MAX_PAYLOAD_BYTES ?? String(256 * 1024), 10) +
  16 * 1024;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: MAX_REQUEST_BODY_BYTES }));
  app.use(urlencoded({ extended: true, limit: MAX_REQUEST_BODY_BYTES }));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
