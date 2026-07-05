// Optimiza los modelos 3D del laboratorio: geometría Draco + texturas WebP (máx 2048px).
// Genera un `scene.opt.glb` autocontenido junto a cada `scene.gltf` original.
//
//   npm run optimize:models
//
// Requiere el decodificador Draco vendorizado en /vendor/ (ya wireado en juego.js)
// y `blob:`/`data:` en la CSP de connect-src (server.cjs) para que las texturas
// embebidas carguen.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODELOS_DIR = join(raiz, 'assets', '3d_models');

// Carpetas de modelos (cada una con su scene.gltf).
const MODELOS = [
  'computer_case_based_off_of_nzxt_510b',
  'rog_strix_x370-f_motherboard',
  'amd_ryzen',
  'amd_wraith_stealth_cpu_cooler',
  'ram_ddr4_g.skill_trident_z_neo',
  'm.2_nvme_ssd_samsung_990_pro_1tb_3d_model',
  'nvidia_geforce_rtx_3090',
  'psu_power_supply_unit',
  'computer_desk'
];

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

let ok = 0;
for (const nombre of MODELOS) {
  const entrada = join(MODELOS_DIR, nombre, 'scene.gltf');
  const salida = join(MODELOS_DIR, nombre, 'scene.opt.glb');
  if (!existsSync(entrada)) {
    console.warn(`⚠ saltado (no existe): ${nombre}/scene.gltf`);
    continue;
  }
  console.log(`▶ optimizando ${nombre}…`);
  execFileSync(npx, [
    'gltf-transform', 'optimize', entrada, salida,
    '--compress', 'draco',
    '--texture-compress', 'webp',
    '--texture-size', '2048'
  ], { stdio: 'inherit' });
  ok++;
}

console.log(`\n✔ ${ok}/${MODELOS.length} modelos optimizados.`);
