import * as http from 'http';
import { AddressInfo } from 'net';
import {
  INestApplication,
  INestApplicationContext,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { DeliveryEntity } from '../src/deliveries/entities/delivery.entity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule: DeliveryWorkerAppModule } = require('../../delivery-worker/src/app.module');

class TestWebhookServer {
  private readonly server: http.Server;
  port: number;

  constructor() {
    this.server = http.createServer((req, res) => {
      const status = req.url?.includes('fail') ? 500 : 200;
      req.on('data', () => {});
      req.on('end', () => {
        res.writeHead(status);
        res.end();
      });
    });
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve) => this.server.listen(0, resolve));
    this.port = (this.server.address() as AddressInfo).port;
  }

  urlFor(path: string): string {
    return `http://webhook.localhost:${this.port}${path}`;
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

describe('Deliveries read API (e2e)', () => {
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

  async function generateApiKey(
    token: string,
    projectId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ingestion key' })
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
      .send({ event: eventType, data: {} })
      .expect(202);
    return res.body.id;
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

    workerApp = await NestFactory.createApplicationContext(
      DeliveryWorkerAppModule,
      { logger: false },
    );
  }, 30000);

  afterAll(async () => {
    await workerApp.close();
    await app.close();
    await webhookServer.stop();
  });

  let ownerToken: string;
  let otherToken: string;
  let projectId: string;
  let apiKey: string;
  let successEndpointId: string;
  let failEndpointId: string;
  let eventId: string;

  beforeAll(async () => {
    ownerToken = await registerAndLogin();
    otherToken = await registerAndLogin();
    projectId = await createProject(ownerToken);
    apiKey = await generateApiKey(ownerToken, projectId);
    successEndpointId = await createEndpoint(ownerToken, projectId, '/success');
    failEndpointId = await createEndpoint(ownerToken, projectId, '/fail');
    await subscribe(ownerToken, successEndpointId, 'order.completed');
    await subscribe(ownerToken, failEndpointId, 'order.completed');

    eventId = await ingestEvent(apiKey, 'order.completed');

    await waitFor(async () => {
      const count = await dataSource
        .getRepository(DeliveryEntity)
        .count({ where: { eventId } });
      return count === 2;
    });
    // Let both deliveries fully resolve (status + http_status_code written).
    await waitFor(async () => {
      const deliveries = await dataSource
        .getRepository(DeliveryEntity)
        .find({ where: { eventId } });
      return deliveries.every((d) => d.status !== 'PENDING');
    });
  }, 20000);

  it('lists deliveries for the caller-owned project, paginated', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/deliveries`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(25);
  });

  it('filters deliveries by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/deliveries?status=SUCCEEDED&eventId=${eventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].endpointId).toBe(successEndpointId);
  });

  it('filters deliveries by endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/deliveries?endpointId=${failEndpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items.every((d: any) => d.endpointId === failEndpointId)).toBe(
      true,
    );
  });

  it('filters deliveries by HTTP status code', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/deliveries?httpStatusCode=500&eventId=${eventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].endpointId).toBe(failEndpointId);
    expect(res.body.items[0].httpStatusCode).toBe(500);
  });

  it('filters deliveries by event', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/deliveries?eventId=${eventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(2);
  });

  it('404s listing deliveries for another workspace project', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/deliveries`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });
});
