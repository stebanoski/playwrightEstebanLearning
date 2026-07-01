import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// ─── Config ───────────────────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TESTS_DIR = path.join(__dirname, "../tests");
const MODEL = "claude-sonnet-4-6";

// ─── Leer estilo actual del proyecto ─────────────────────────────────────────
function readProjectStyle(): string {
  const mainTest = path.join(TESTS_DIR, "auxexampleEsteban.spec.ts");
  if (fs.existsSync(mainTest)) {
    return fs.readFileSync(mainTest, "utf-8");
  }
  return "";
}

// ─── Generar tests para cada categoría ───────────────────────────────────────
const TEST_CATEGORIES = [
  {
    file: "auth.spec.ts",
    prompt: `Genera un archivo auth.spec.ts completo con estos casos de prueba para SauceDemo:
1. Login exitoso con standard_user
2. Login fallido con credenciales inválidas (mensaje "Epic sadface")
3. Login con locked_out_user (mensaje de bloqueo)
4. Login con performance_glitch_user (timeout extendido a 10s)
5. Logout desde el menú burger`,
  },
  {
    file: "inventory.spec.ts",
    prompt: `Genera un archivo inventory.spec.ts completo con estos casos para SauceDemo:
1. Verificar que se muestran 6 productos en el inventario
2. Ordenar productos por precio ascendente (lohi) y verificar orden
3. Ordenar productos por precio descendente (hilo) y verificar orden
4. Ordenar por nombre A-Z y verificar orden alfabético
5. Navegar al detalle de un producto y volver al inventario`,
  },
  {
    file: "cart.spec.ts",
    prompt: `Genera un archivo cart.spec.ts completo con estos casos para SauceDemo:
1. Agregar un producto al carrito y verificar badge = 1
2. Agregar múltiples productos y verificar badge acumulado
3. Eliminar producto del carrito desde la página del carrito
4. Eliminar producto desde el inventario con botón Remove
5. Verificar que los detalles del producto (nombre, precio, descripción) son correctos en el carrito`,
  },
  {
    file: "checkout.spec.ts",
    prompt: `Genera un archivo checkout.spec.ts completo con estos casos para SauceDemo:
1. Flujo E2E completo: login → agregar producto → checkout → confirmación
2. Checkout sin completar First Name (validación de campo requerido)
3. Checkout sin completar Last Name
4. Checkout sin completar Postal Code
5. Verificar resumen de orden (precio total, tax, total con tax) antes de confirmar`,
  },
];

async function generateTestFile(category: {
  file: string;
  prompt: string;
}): Promise<void> {
  const style = readProjectStyle();

  console.log(`\n⚙️  Generando: ${category.file}...`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Eres QA Automation Engineer experto en Playwright TypeScript trabajando en SauceDemo (https://www.saucedemo.com).

Estilo de código del proyecto (sigue esto exactamente):
\`\`\`typescript
${style}
\`\`\`

${category.prompt}

Reglas:
- test.use({storageState:{cookies:[],origins:[]}}) al inicio
- Usa page.getByRole() preferentemente
- beforeEach para login cuando aplique
- console.log() para debugging
- Agrupa con test.describe()
- Responde SOLO con TypeScript válido, sin markdown ni explicaciones`,
      },
    ],
  });

  let code = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Limpiar markdown
  code = code.replace(/^```typescript\n?|^```ts\n?|^```\n?|```$/gm, "").trim();

  const filepath = path.join(TESTS_DIR, category.file);
  fs.writeFileSync(filepath, code, "utf-8");
  console.log(`   ✅ Guardado: ${filepath}`);
}

async function main() {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║   QA Agent — Generador Batch de Tests         ║");
  console.log("║   Genera todos los specs de una vez           ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY no encontrada en .env.dev");
    process.exit(1);
  }

  console.log(`📂 Destino: ${TESTS_DIR}`);
  console.log(`🤖 Modelo: ${MODEL}`);
  console.log(`📝 Archivos a generar: ${TEST_CATEGORIES.map((c) => c.file).join(", ")}\n`);

  for (const category of TEST_CATEGORIES) {
    await generateTestFile(category);
    // Pequeña pausa entre llamadas para no saturar la API
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║   ✅ Todos los tests generados exitosamente   ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log("\nEjecuta todos con:");
  console.log("  npx playwright test\n");
  console.log("O por archivo:");
  console.log("  npx playwright test tests/auth.spec.ts");
  console.log("  npx playwright test tests/inventory.spec.ts");
  console.log("  npx playwright test tests/cart.spec.ts");
  console.log("  npx playwright test tests/checkout.spec.ts\n");
}

main().catch(console.error);
