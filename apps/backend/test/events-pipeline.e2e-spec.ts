import * as http from 'http';
import { AddressInfo } from 'net';
import { INestApplication, INestApplicationContext, ValidationPipe } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { NestFactory } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EventEntity } from '../src/events/entities/event.entity';
import { DeliveryEntity } from '../src/deliveries/entities/delivery.entity';
import { RouteEventCommand } from '../src/deliveries/commands/impl/route-event.command';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule: DeliveryWorkerAppModule } = require('../../delivery-worker/src/app.module');

interface ReceivedRequest {
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** A local HTTP server standing in for a customer's webhook endpoint. Path suffix controls the response. */
class TestWebhookServer {
  private readonly server: http.Server;
  readonly received: Map<string, ReceivedRequest[]> = new Map();
  port: number;

  constructor() {
    this.server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const path = req.url ?? '/';
        const list = this.received.get(path) ?? [];
        list.push({ headers: req.headers, body: Buffer.concat(chunks).toString() });
        this.received.set(path, list);

        if (path.includes('fail')) {
          res.writeHead(500);
        } else {
          res.writeHead(200);
        }
        res.end();
      });
    });
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve) => this.server.listen(0, resolve));
    this.port = (this.server.address() as AddressInfo).port;
  }

  urlFor(path: string): string {
    // "webhook.localhost" (not the bare "localhost" literal) resolves to loopback per
    // RFC 6761, but passes EndpointUrlValidatorService's exact-match blocklist check —
    // the only way to point a registered endpoint at this test's own local receiver.
    return `http://webhook.localhost:${this.port}${path}`;
  }

  countFor(path: string): number {
    return this.received.get(path)?.length ?? 0;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 15000,
  intervalMs = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('Events pipeline (e2e)', () => {
  let app: INestApplication;
  let workerApp: INestApplicationContext;
  let dataSource: DataSource;
  let webhookServer: TestWebhookServer;

  async function registerAndLogin(): Promise<string> {
    const email = `test-${randomUUID()}@example.com`;
    const password = 'correct-horse-battery';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    return res.body.accessToken;
  }

  async function createProject(token: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Project ${randomUUID()}` })
      .expect(201);
    return res.body.id;
  }

  async function generateApiKey(token: string, projectId: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pipeline key' })
      .expect(201);
    return res.body.key;
  }

  async function createEndpoint(
    token: string,
    projectId: string,
    path: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Webhook', url: webhookServer.urlFor(path) })
      .expect(201);
    return res.body.id;
  }

  async function disableEndpoint(token: string, endpointId: string): Promise<void> {
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/disable`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
  }

  async function subscribe(
    token: string,
    endpointId: string,
    eventPattern: string,
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ eventPattern })
      .expect(201);
  }

  async function ingestEvent(apiKey: string, eventType: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ event: eventType, data: { orderId: randomUUID() } })
      .expect(202);
    return res.body.id;
  }

  async function setupProjectWithKey(): Promise<{ token: string; projectId: string; apiKey: string }> {
    const token = await registerAndLogin();
    const projectId = await createProject(token);
    const apiKey = await generateApiKey(token, projectId);
    return { token, projectId, apiKey };
  }

  beforeAll(async () => {
    webhookServer = new TestWebhookServer();
    await webhookServer.start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);

    workerApp = await NestFactory.createApplicationContext(DeliveryWorkerAppModule, {
      logger: false,
    });
  }, 30000);

  afterAll(async () => {
    await workerApp.close();
    await app.close();
    await webhookServer.stop();
  }, 30000);

  it('delivers a matching event to a subscribed, enabled endpoint end to end', async () => {
    const { token, projectId, apiKey } = await setupProjectWithKey();
    const path = `/success-${randomUUID()}`;
    const endpointId = await createEndpoint(token, projectId, path);
    await subscribe(token, endpointId, 'order.completed');

    const eventId = await ingestEvent(apiKey, 'order.completed');

    await waitFor(async () => {
      const event = await dataSource
        .getRepository(EventEntity)
        .findOne({ where: { id: eventId } });
      return event?.status === 'COMPLETED';
    });

    const deliveries = await dataSource
      .getRepository(DeliveryEntity)
      .find({ where: { eventId } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe('SUCCEEDED');
    expect(deliveries[0].endpointId).toBe(endpointId);

    expect(webhookServer.countFor(path)).toBe(1);
    const [received] = webhookServer.received.get(path)!;
    expect(received.headers['x-relayforge-event']).toBe('order.completed');
    expect(received.headers['x-relayforge-delivery-id']).toBe(deliveries[0].id);
    expect(JSON.parse(received.body).event).toBe('order.completed');
  }, 20000);

  it('does not deliver to a disabled endpoint even if subscribed', async () => {
    const { token, projectId, apiKey } = await setupProjectWithKey();
    const path = `/disabled-${randomUUID()}`;
    const endpointId = await createEndpoint(token, projectId, path);
    await subscribe(token, endpointId, 'order.completed');
    await disableEndpoint(token, endpointId);

    const eventId = await ingestEvent(apiKey, 'order.completed');

    await waitFor(async () => {
      const event = await dataSource
        .getRepository(EventEntity)
        .findOne({ where: { id: eventId } });
      return event?.status === 'COMPLETED';
    });

    const deliveries = await dataSource
      .getRepository(DeliveryEntity)
      .find({ where: { eventId } });
    expect(deliveries).toHaveLength(0);
    expect(webhookServer.countFor(path)).toBe(0);
  }, 20000);

  it('reaches PARTIALLY_FAILED when one endpoint succeeds and another fails', async () => {
    const { token, projectId, apiKey } = await setupProjectWithKey();
    const successPath = `/mixed-success-${randomUUID()}`;
    const failPath = `/mixed-fail-${randomUUID()}`;
    const successEndpointId = await createEndpoint(token, projectId, successPath);
    const failEndpointId = await createEndpoint(token, projectId, failPath);
    await subscribe(token, successEndpointId, 'order.completed');
    await subscribe(token, failEndpointId, 'order.completed');

    const eventId = await ingestEvent(apiKey, 'order.completed');

    await waitFor(async () => {
      const event = await dataSource
        .getRepository(EventEntity)
        .findOne({ where: { id: eventId } });
      return event?.status === 'PARTIALLY_FAILED';
    });

    const deliveries = await dataSource
      .getRepository(DeliveryEntity)
      .find({ where: { eventId } });
    expect(deliveries).toHaveLength(2);
    const bySuccess = deliveries.find((d) => d.endpointId === successEndpointId);
    const byFail = deliveries.find((d) => d.endpointId === failEndpointId);
    expect(bySuccess?.status).toBe('SUCCEEDED');
    expect(byFail?.status).toBe('FAILED');
  }, 20000);

  it('reaches FAILED when every matching delivery fails', async () => {
    const { token, projectId, apiKey } = await setupProjectWithKey();
    const failPath = `/all-fail-${randomUUID()}`;
    const endpointId = await createEndpoint(token, projectId, failPath);
    await subscribe(token, endpointId, 'order.completed');

    const eventId = await ingestEvent(apiKey, 'order.completed');

    await waitFor(async () => {
      const event = await dataSource
        .getRepository(EventEntity)
        .findOne({ where: { id: eventId } });
      return event?.status === 'FAILED';
    });
  }, 20000);

  it('does not create a duplicate delivery when the routing consumer reprocesses the same event', async () => {
    const { token, projectId, apiKey } = await setupProjectWithKey();
    const path = `/dedup-${randomUUID()}`;
    const endpointId = await createEndpoint(token, projectId, path);
    await subscribe(token, endpointId, 'order.completed');

    const eventId = await ingestEvent(apiKey, 'order.completed');

    await waitFor(async () => {
      const count = await dataSource
        .getRepository(DeliveryEntity)
        .count({ where: { eventId } });
      return count === 1;
    });

    const commandBus = app.get(CommandBus);
    await commandBus.execute(new RouteEventCommand(eventId));
    await commandBus.execute(new RouteEventCommand(eventId));

    const deliveries = await dataSource
      .getRepository(DeliveryEntity)
      .find({ where: { eventId } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].endpointId).toBe(endpointId);
  }, 20000);
});
