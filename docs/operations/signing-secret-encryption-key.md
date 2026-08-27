# Deploying `SIGNING_SECRET_ENCRYPTION_KEY`

`apps/backend` and `apps/delivery-worker` share one AES-256-GCM key used to encrypt every endpoint's webhook signing secret at rest. The backend also needs it when running the `AddEndpointSigningSecrets` migration, since that migration provisions signing material for every pre-existing endpoint.

The development-only value committed to `docker-compose.yml` and the `.env.example` files (32 zero bytes, base64-encoded) exists only so a fresh checkout runs without extra setup. Never use it, or any key that has appeared in a repository, ticket, or chat, outside local development.

## Generate a production key

The key must be exactly 32 random bytes, base64-encoded. Either of these produces a canonical value:

```bash
openssl rand -base64 32
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate a fresh key per deployment environment (production, staging, ...). Do not reuse a key across environments and do not derive it from another secret.

## Inject it without logging it

- Provide the same value to the backend, the delivery worker, and whatever job runs the backend's database migrations — all three must decrypt/encrypt with the identical key. A mismatch makes every existing endpoint's signing secret undecryptable.
- Inject the value through your deployment platform's secret store (e.g. a Kubernetes `Secret`, Docker/Swarm secret, or your cloud provider's secrets manager) as the `SIGNING_SECRET_ENCRYPTION_KEY` environment variable. Do not commit it to source control, bake it into an image layer, or pass it as a plain build argument.
- Do not print, log, or echo the key value in deploy scripts, CI output, or shell history. Both `apps/backend/src/config/configuration.ts` and `apps/delivery-worker/src/config/configuration.ts` reject a missing or malformed key at startup with a message that never echoes the offending value — keep any wrapper scripts equally quiet.
- Outside `NODE_ENV=production`, both apps fall back to the shared development-only key so local `pnpm start:dev` and tests keep working without extra configuration. In production, a missing or malformed key fails startup instead of silently falling back.

## Rotating this key

This key itself has no rotation workflow yet — the envelope format (`v1.<nonce>.<ciphertext>.<tag>`) is versioned so a future change can add re-encryption under a new key or an external KMS. Until then, treat a compromised `SIGNING_SECRET_ENCRYPTION_KEY` as requiring a full endpoint signing-secret rotation for every affected endpoint (`POST /api/v1/endpoints/:id/signing-secret/rotate`), since the key itself cannot be swapped without also re-encrypting every stored secret.
