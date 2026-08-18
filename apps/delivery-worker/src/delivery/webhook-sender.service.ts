import { Injectable } from '@nestjs/common';
import { WebhookRequest } from './webhook-request.builder';

export interface WebhookSendResult {
  succeeded: boolean;
  statusCode?: number;
}

@Injectable()
export class WebhookSenderService {
  async send(request: WebhookRequest): Promise<WebhookSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });
      return {
        succeeded: response.status >= 200 && response.status < 300,
        statusCode: response.status,
      };
    } catch {
      return { succeeded: false };
    } finally {
      clearTimeout(timeout);
    }
  }
}
