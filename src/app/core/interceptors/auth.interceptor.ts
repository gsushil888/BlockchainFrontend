import { HttpInterceptorFn, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const cryptoService = inject(CryptoService);

  const token = authService.getToken();

  // ── DEV: skip all encryption — attach plain Authorization header only ──
  if (!environment.encryption) {
    const devReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;
    return next(devReq);
  }

  // ── PROD: full encrypt/decrypt pipeline ───────────────────────────────
  return from(buildEncryptedRequest(req, token, cryptoService)).pipe(
    switchMap(finalReq =>
      next(finalReq).pipe(
        switchMap(async event => {
          if (!(event instanceof HttpResponse)) return event;

          let updatedEvent = event;

          // 1. Decrypt response body
          if ((event.body as any)?.payload) {
            try {
              const decrypted = await cryptoService.decrypt((event.body as any).payload);
              updatedEvent = updatedEvent.clone({ body: JSON.parse(decrypted) });
            } catch (e) {
              console.warn('[AUTH-INTERCEPTOR] Response body decryption failed', e);
            }
          }

          // 2. Decrypt X-Auth-Token response header (token refresh)
          const encryptedRespToken = event.headers.get('X-Auth-Token');
          if (encryptedRespToken) {
            try {
              await cryptoService.decrypt(encryptedRespToken);
            } catch (e) {
              console.warn('[AUTH-INTERCEPTOR] X-Auth-Token header decryption failed', e);
            }
          }

          return updatedEvent;
        })
      )
    )
  );
};

async function buildEncryptedRequest(
  req: HttpRequest<unknown>,
  token: string | null,
  cryptoService: CryptoService
): Promise<HttpRequest<unknown>> {

  const headers: Record<string, string> = {};

  // Encrypt JWT → X-Auth-Token (never send plain Authorization in prod)
  if (token) {
    headers['X-Auth-Token'] = await cryptoService.encrypt(token);
  }

  // Encrypt body → { payload: "<encrypted>" }
  if (req.body) {
    const encryptedBody = await cryptoService.encrypt(JSON.stringify(req.body));
    return req.clone({ setHeaders: headers, body: { payload: encryptedBody } });
  }

  return req.clone({ setHeaders: headers });
}
