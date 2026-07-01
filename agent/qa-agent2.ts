import dotenv from "dotenv";
dotenv.config({path: ".env.dev"});

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ─── Config ───────────────────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TESTS_DIR = path.join(__dirname, "../tests");
const MODEL = "claude-sonnet-4-6";

// ─── Leer contexto del proyecto ───────────────────────────────────────────────
interface ProjectContext {
  specs: string[];
  pageObjects: string[];
  utils: string[];
}

function readProjectContext(): string {
  const ctx: ProjectContext = { specs: [], pageObjects: [], utils: [] };

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith(".ts") && !file.endsWith(".bk")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const relativePath = path.relative(TESTS_DIR, fullPath);

        // Clasificar el archivo según su ubicación/nombre
        if (fullPath.includes("pageobjects") || fullPath.includes("pageObjects") || file.includes("Page.ts")) {
          ctx.pageObjects.push(
            `\n### PAGE OBJECT: ${relativePath}\n\`\`\`typescript\n${content}\n\`\`\``
          );
        } else if (fullPath.includes("util") || fullPath.includes("helper") || fullPath.includes("fixture")) {
          ctx.utils.push(
            `\n### UTIL/HELPER: ${relativePath}\n\`\`\`typescript\n${content}\n\`\`\``
          );
        } else if (file.endsWith(".spec.ts")) {
          ctx.specs.push(
            `\n### SPEC TEST: ${relativePath}\n\`\`\`typescript\n${content}\n\`\`\``
          );
        }
      }
    });
  }

  scanDir(TESTS_DIR);

  const sections: string[] = [];

  if (ctx.pageObjects.length > 0) {
    sections.push(`\n## PAGE OBJECTS EXISTENTES (${ctx.pageObjects.length} archivo/s)\n${ctx.pageObjects.join("\n")}`);
  } else {
    sections.push(`\n## PAGE OBJECTS EXISTENTES\nNinguno encontrado aún. Solo existe LoginPage.ts por crear.`);
  }

  if (ctx.specs.length > 0) {
    sections.push(`\n## SPEC TESTS EXISTENTES (${ctx.specs.length} archivo/s)\n${ctx.specs.join("\n")}`);
  } else {
    sections.push(`\n## SPEC TESTS EXISTENTES\nNinguno encontrado aún.`);
  }

  if (ctx.utils.length > 0) {
    sections.push(`\n## UTILS/HELPERS (${ctx.utils.length} archivo/s)\n${ctx.utils.join("\n")}`);
  }

  return sections.join("\n") || "No se encontraron archivos de test aún.";
}

// ─── Contar archivos por tipo para el resumen de inicio ──────────────────────
function countProjectFiles(): { specs: number; pageObjects: number; utils: number } {
  const counts = { specs: 0, pageObjects: 0, utils: 0 };
  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) { scanDir(fullPath); return; }
      if (!file.endsWith(".ts") || file.endsWith(".bk")) return;
      if (fullPath.includes("pageobjects") || fullPath.includes("pageObjects") || file.includes("Page.ts")) counts.pageObjects++;
      else if (fullPath.includes("util") || fullPath.includes("helper")) counts.utils++;
      else if (file.endsWith(".spec.ts")) counts.specs++;
    });
  }
  scanDir(TESTS_DIR);
  return counts;
}

// ─── Guardar test generado ─────────────────────────────────────────────────────
function saveTest(filename: string, content: string): string {
  // Limpiar markdown si Claude lo incluye
  const clean = content.replace(/^```typescript\n?|^```ts\n?|^```\n?|```$/gm, "").trim();
  const filepath = path.join(TESTS_DIR, filename);
  fs.writeFileSync(filepath, clean, "utf-8");
  return filepath;
}

// ─── System prompt (aprende del proyecto) ────────────────────────────────────
function buildSystemPrompt(): string {
  const context = readProjectContext();
  return `Eres un QA Automation Engineer experto en Playwright TypeScript y Page Object Model (POM).
Trabajas en el proyecto de Esteban que prueba https://www.saucedemo.com.

CONTEXTO ACTUAL DEL PROYECTO:
${context}

REGLAS PARA SPECS (.spec.ts):
- Sigue EXACTAMENTE el estilo del proyecto (getByRole, console.log, expect)
- Usa test.use({storageState:{cookies:[],origins:[]}}) en tests de auth
- Usa page.getByRole() preferentemente sobre locators CSS
- Incluye console.log() para debugging
- Agrupa tests con test.describe()
- Si existe un Page Object para la página que estás probando, ÚSALO en el spec
- URL base: https://www.saucedemo.com

REGLAS PARA PAGE OBJECTS:
- Patrón: clase con constructor(private page: Page)
- Todos los locators como getters privados o métodos públicos
- Métodos públicos representan acciones del usuario (login(), addToCart(), etc.)
- Métodos de aserción con prefijo "expect" (expectInventoryVisible(), etc.)
- Importar desde "@playwright/test": import { Page, expect } from "@playwright/test"
- Seguir el estilo de LoginPage.ts existente como referencia

REGLAS GENERALES:
- Cuando generes código, responde SOLO con TypeScript válido sin markdown
- Responde siempre en español excepto el código TypeScript

COMANDOS DISPONIBLES:
- "analizar"                   → analiza saucedemo.com y devuelve reporte QA
- "planificar [foco]"          → genera plan de 8 casos de prueba
- "generar [descripción]"      → genera un test .spec.ts
- "generar todos"              → genera archivo con todos los casos del plan actual
- "guardar [nombre]"           → guarda el último código en tests/[nombre].spec.ts
- "revisar"                    → analiza specs y page objects, sugiere mejoras
- "revisar pageobjects"        → analiza SOLO los page objects y sugiere mejoras
- "mejorar pageobject [nombre]"→ sugiere versión mejorada de un Page Object específico
- "generar pageobject [página]"→ genera un nuevo Page Object para la página indicada
- "guardar pom [nombre]"       → guarda el último código en tests/pageobjects/[nombre].ts
- "ayuda"                      → muestra este menú`;
}

// ─── Conversación con memoria ─────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

const conversationHistory: Message[] = [];
let lastGeneratedCode = "";
let lastGeneratedType: "spec" | "pom" = "spec";

async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: buildSystemPrompt(), // re-lee el proyecto en cada mensaje
    messages: conversationHistory,
  });

  const assistantMessage = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  conversationHistory.push({ role: "assistant", content: assistantMessage });

  // Detectar si la respuesta contiene código para guardarlo automáticamente
  const isSpec = assistantMessage.includes("import { test") || assistantMessage.includes("test.describe(") || assistantMessage.includes("test(\"");
  const isPOM = assistantMessage.includes("export class") && assistantMessage.includes("Page)");

  if (isSpec || isPOM) {
    lastGeneratedCode = assistantMessage;
    lastGeneratedType = isPOM && !isSpec ? "pom" : "spec";
  }

  return assistantMessage;
}

// ─── CLI interactivo ──────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║     QA Agent — Playwright Test Generator   ║");
  console.log("║     Proyecto: SauceDemo | TypeScript       ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Verificar API Key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ Error: ANTHROPIC_API_KEY no encontrada.");
    console.error("   Agrégala a tu .env.dev: ANTHROPIC_API_KEY=sk-ant-...");
    console.error("   Luego ejecuta: npx ts-node -r dotenv/config agent/qa-agent.ts dotenv_config_path=.env.dev\n");
    process.exit(1);
  }

  // Mostrar contexto cargado
  const counts = countProjectFiles();
  console.log(`📁 Proyecto cargado:`);
  console.log(`   ├── ${counts.specs} spec(s) encontrado(s)`);
  console.log(`   ├── ${counts.pageObjects} page object(s) encontrado(s)`);
  console.log(`   └── ${counts.utils} util(s) encontrado(s)`);
  console.log(`📂 Directorio tests: ${TESTS_DIR}`);
  console.log(`🤖 Modelo: ${MODEL}`);
  console.log('\n💬 Escribe tu mensaje o "ayuda" para ver comandos. Ctrl+C para salir.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("🧑 Tú: ", async (input) => {
      const userInput = input.trim();
      if (!userInput) { prompt(); return; }

      // Comando guardar POM en pageobjects/
      if (userInput.toLowerCase().startsWith("guardar pom ")) {
        const filename = userInput.slice(12).trim().replace(/\.ts$/, "") + ".ts";
        if (!lastGeneratedCode) {
          console.log("\n⚠️  No hay código generado aún.\n");
        } else {
          const pomDir = path.join(TESTS_DIR, "pageobjects");
          if (!fs.existsSync(pomDir)) fs.mkdirSync(pomDir, { recursive: true });
          const clean = lastGeneratedCode.replace(/^```typescript\n?|^```ts\n?|^```\n?|```$/gm, "").trim();
          const filepath = path.join(pomDir, filename);
          fs.writeFileSync(filepath, clean, "utf-8");
          console.log(`\n✅ Page Object guardado en: ${filepath}\n`);
        }
        prompt();
        return;
      }

      // Comando guardar spec en tests/
      if (userInput.toLowerCase().startsWith("guardar ")) {
        const filename = userInput.slice(8).trim().replace(/\.spec\.ts$/, "") + ".spec.ts";
        if (!lastGeneratedCode) {
          console.log("\n⚠️  No hay código generado aún. Pide al agente que genere un test primero.\n");
        } else {
          const saved = saveTest(filename, lastGeneratedCode);
          console.log(`\n✅ Test guardado en: ${saved}\n`);
          console.log(`   Ejecuta con: npx playwright test tests/${filename}\n`);
          if (lastGeneratedType === "pom") {
            console.log(`   💡 Tip: Este parece ser un Page Object. Usa "guardar pom ${filename.replace('.spec.ts','')}" para guardarlo en pageobjects/\n`);
          }
        }
        prompt();
        return;
      }

      try {
        process.stdout.write("\n🤖 Agente: ");
        const response = await chat(userInput);
        console.log(response);

        // Si guardó código, avisar
        if (lastGeneratedCode && userInput.toLowerCase().includes("generar")) {
          console.log('\n💾 Tip: escribe "guardar [nombre]" para guardar el código en tests/\n');
        } else {
          console.log("");
        }
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status === 401) {
          console.error("\n❌ API Key inválida. Verifica ANTHROPIC_API_KEY en .env.dev\n");
        } else {
          console.error("\n❌ Error:", err.message, "\n");
        }
      }

      prompt();
    });
  };

  prompt();
}

main();