# Despliegue

Anter es una web estática. `deploy/build.sh` la construye en `dist/`, y ese mismo `dist/` se publica en todos los sitios:

| Dónde | URL | Cómo se actualiza |
|---|---|---|
| GitHub Pages | https://taridepaco.github.io/anter/ | Solo, con cada push a `main` (`.github/workflows/pages.yml`). |
| Servidor propio | `anter.taridepaco.com.es` (previsto, aún sin publicar) | A mano: `deploy/build.sh && sudo deploy/install.sh`. |

`deploy/install.sh` y `.github/workflows/pages.yml` son comunes a todas las webs de taridepaco. Se copian desde [taridepaco.github.io](https://github.com/taridepaco/taridepaco.github.io): no se editan aquí.

## Construir

```sh
deploy/build.sh                                   # npm ci && npm run build → dist/
python3 -m http.server 8000 --directory dist      # para probar el resultado
```

`dist/` no se sube a git. Vite pone un hash en el nombre de los ficheros que compila, así que con cada cambio cambian sus URLs y ninguna caché mezcla dos versiones: GitHub Pages guarda los ficheros 10 minutos y Cloudflare guarda CSS y JS durante horas. Los de `public/` (`css/system.css`, `js/theme.js`, `favicon.svg`) se copian tal cual, sin hash: si cambian, pueden tardar en llegar.

Todas las rutas son relativas (`base: './'` en `vite.config.ts`), así que `dist/` funciona igual en la raíz de un dominio que bajo una subruta como `/anter/`.

## GitHub Pages

- En cada PR, el workflow pasa los tests y construye la web, pero no la publica.
- En cada push a `main`, o a mano desde *Actions → Pages → Run workflow*, además publica `dist/`.
- Si fallan los tests o la construcción, no se publica nada.

`deploy/test.sh` ejecuta `npm ci` y `npm test` (contabilidad de la colonia, con Vitest).

Configuración, una sola vez: *Settings → Pages → Build and deployment → Source: GitHub Actions*.

## Servidor propio (túnel de Cloudflare en WSL)

```
Navegador ── HTTPS ── Cloudflare ── túnel ──► cloudflared (WSL) ──► http://localhost:8005
                                                                    python3 -m http.server en 127.0.0.1
```

- **Servicio:** `deploy/anter.service`. Usuario de sistema `anter` y aislamiento de systemd.
- **Ficheros servidos:** `/opt/anter`, una copia de `dist/`. Son de root y el servicio solo puede leerlos.
- **Puerto:** `8005`, solo en `127.0.0.1`.

### Instalar o actualizar

Desde WSL, en la raíz del repo:

```sh
git pull
deploy/build.sh && sudo deploy/install.sh
```

`install.sh` crea el usuario y la unidad la primera vez. Después solo sustituye los ficheros y reinicia el servicio.

### Primera vez: túnel y DNS

Sustituye `<túnel>` por el nombre de tu túnel (`cloudflared tunnel list`).

1. Comprueba que el puerto está libre con `ss -ltn | grep ':8005 ' || echo libre`. Si está ocupado, elige otro y cámbialo en `deploy/anter.service` y en la entrada del túnel.
2. Añade la entrada en `/etc/cloudflared/config.yml` **antes** de la regla 404, sin tocar las demás:

   ```yaml
   ingress:
     # ...tus otras entradas...
     - hostname: anter.taridepaco.com.es
       service: http://localhost:8005
     - service: http_status:404
   ```

3. Valida, crea el DNS (como tu usuario, sin sudo) y reinicia el túnel:

   ```sh
   cloudflared tunnel ingress validate --config /etc/cloudflared/config.yml
   cloudflared tunnel route dns <túnel> anter.taridepaco.com.es
   sudo systemctl restart cloudflared
   curl -sI https://anter.taridepaco.com.es/ | head -1
   ```

### Retirar

1. Quita la entrada `anter` de `/etc/cloudflared/config.yml` y ejecuta `sudo systemctl restart cloudflared`.
2. `sudo systemctl disable --now anter && sudo rm /etc/systemd/system/anter.service`
3. `sudo rm -rf /opt/anter && sudo userdel anter`
4. Borra el registro DNS de `anter.taridepaco.com.es` en el panel de Cloudflare.

Los scripts de `deploy/` se quedan en el repo: sirven para volver a instalarlo en esta u otra máquina.
