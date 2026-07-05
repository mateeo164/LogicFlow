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
import { dirname, join, basename } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODELOS_DIR = join(raiz, 'assets', '3d_models');

// Carpetas de modelos (cada una con su scene.gltf) → scene.opt.glb.
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

// Modelos del taller entregados como .glb sueltos → <nombre>.opt.glb.
// Se optimizan con `--simplify false` para NO alterar la geometría: varios
// tienen animaciones (fans, SSD, monitor) y submallas nombradas que deben
// sobrevivir intactas (el SSD se desarma en SSD_Case_1/Board/Screws/Case_2).
const MODELOS_GLB = [
  'workbench_low-poly',
  'bar_stool',
  'basket_shelving_for_store_or_warehouse',
  'tool_storage_board',
  'desk_lamp',
  'phillips_screwdriver.',
  'cc0_-_wooden_spatula',
  'clean_paint_brush',
  'fluck__probs',
  'syringe',
  'pc_monitor',
  'keyboard',
  'mouse',
  'liquid_cpu_cooling',
  'rgb_fan',
  'rgb_pc_fan',
  'ssd_solid-state_drive',
  'wd_green_1tb_hard_disk_hdd',
  'sata_cable'
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

let okGlb = 0;
for (const base of MODELOS_GLB) {
  const entrada = join(MODELOS_DIR, `${base}.glb`);
  const salida = join(MODELOS_DIR, `${base}.opt.glb`);
  if (!existsSync(entrada)) {
    console.warn(`⚠ saltado (no existe): ${base}.glb`);
    continue;
  }
  console.log(`▶ optimizando ${basename(entrada)}…`);
  execFileSync(npx, [
    'gltf-transform', 'optimize', entrada, salida,
    '--compress', 'draco',
    '--texture-compress', 'webp',
    '--texture-size', '2048',
    '--simplify', 'false'
  ], { stdio: 'inherit' });
  okGlb++;
}

console.log(`\n✔ ${ok}/${MODELOS.length} componentes + ${okGlb}/${MODELOS_GLB.length} props del taller optimizados.`);
