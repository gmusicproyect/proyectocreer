// Servidor local que imita la aplicación web de Apps Script usando los .gs reales
// sobre una planilla en memoria. Sirve para probar el panel sin tocar la planilla de Gmusic.
//
//   node integrations/google-apps-script/catalogo-lucas/dev/servidor-simulado.mjs
//
// y en otra terminal:
//   CREER_ADMIN_PREVIEW=true GOOGLE_QUOTE_WEB_APP_URL=http://127.0.0.1:8787/exec \
//   GOOGLE_QUOTE_API_TOKEN=read GOOGLE_ADMIN_WRITE_TOKEN=write npm run dev
//
// Los datos se pierden al detenerlo. Tokens de prueba: "read" y "write".
import { createServer } from "node:http";

import { crearSimulador } from "../tests/planilha-simulada.mjs";

const puerto = Number(process.env.PORT || 8787);
const sim = crearSimulador();

createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }
  let cuerpo = "";
  req.on("data", (parte) => {
    cuerpo += parte;
    if (cuerpo.length > 8 * 1024 * 1024) req.destroy();
  });
  req.on("end", () => {
    let respuesta;
    try {
      respuesta = sim.doPost(JSON.parse(cuerpo || "{}"));
    } catch (error) {
      respuesta = { ok: false, error: String(error && error.message) };
    }
    const accion = (() => { try { return JSON.parse(cuerpo).accion; } catch { return "?"; } })();
    console.log(new Date().toISOString().slice(11, 19), accion, respuesta.ok ? "ok" : `ERROR ${respuesta.codigo || ""} ${respuesta.error || ""}`);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(respuesta));
  });
}).listen(puerto, "127.0.0.1", () => console.log(`Apps Script simulado en http://127.0.0.1:${puerto}/exec`));
