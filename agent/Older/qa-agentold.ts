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
function readProjectContext(): string {
  const files: string[] = [];

  // Leer todos los .ts de tests/ (excluye .bk)
  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith(".ts") && !file.endsWith(".bk")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        files.push(`\n### Archivo: ${fullPath}\n\`\`\`typescript\n${content}\n\`\`\``);
      }
    });
  }

  scanDir(TESTS_DIR);

  if (files.length === 0) return "No se encontraron archivos de test aún.";
  return files.join("\n");
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
  return `Eres un QA Automation Engineer experto en Playwright TypeScript.
Trabajas en el proyecto de Esteban que prueba https://www.saucedemo.com.

CONTEXTO ACTUAL DEL PROYECTO (aprende de este estilo):
${context}

REGLAS OBLIGATORIAS:
- Sigue EXACTAMENTE el estilo de código del proyecto (getByRole, console.log, expect)
- Usa test.use({storageState:{cookies:[],origins:[]}}) en tests de auth
- Usa page.getByRole() preferentemente sobre locators CSS
- Incluye console.log() para debugging como en el código existente
- Agrupa tests relacionados con test.describe() cuando generes múltiples
- URL base siempre: https://www.saucedemo.com
- Cuando generes código, responde SOLO con TypeScript válido sin markdown

COMANDOS DISPONIBLES:
- "analizar" → analiza saucedemo.com y devuelve reporte QA
- "planificar [foco]" → genera plan de 8 casos de prueba
- "generar [descripción]" → genera un test .spec.ts
- "generar todos" → genera archivo con todos los casos del plan actual
- "guardar [nombre]" → guarda el último código generado como [nombre].spec.ts
- "revisar" → analiza los tests existentes y sugiere mejoras
- "ayuda" → muestra este menú

Responde siempre en español excepto el código TypeScript.`;
}

// ─── Conversación con memoria ─────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

const conversationHistory: Message[] = [];
let lastGeneratedCode = "";

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
  if (
    assistantMessage.includes("import { test") ||
    assistantMessage.includes("test(") ||
    assistantMessage.includes("test.describe(")
  ) {
    lastGeneratedCode = assistantMessage;
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
      console.log("API KEY:", process.env.ANTHROPIC_API_KEY);
    console.error("❌ Error: ANTHROPIC_API_KEY no encontrada.");
    console.error("   Agrégala a tu .env.dev: ANTHROPIC_API_KEY=sk-ant-...");
    console.error("   Luego ejecuta: npx ts-node -r dotenv/config agent/qa-agent.ts dotenv_config_path=.env.dev\n");
    process.exit(1);
  }

  // Mostrar contexto cargado
  const testFiles = fs.existsSync(TESTS_DIR)
    ? fs.readdirSync(TESTS_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".bk")).length
    : 0;
  console.log(`📁 Proyecto cargado: ${testFiles} archivo(s) de test encontrado(s)`);
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

      // Comando guardar (local, sin llamar a la API)
      if (userInput.toLowerCase().startsWith("guardar ")) {
        const filename = userInput.slice(8).trim().replace(/\.spec\.ts$/, "") + ".spec.ts";
        if (!lastGeneratedCode) {
          console.log("\n⚠️  No hay código generado aún. Pide al agente que genere un test primero.\n");
        } else {
          const saved = saveTest(filename, lastGeneratedCode);
          console.log(`\n✅ Test guardado en: ${saved}\n`);
          console.log(`   Ejecuta con: npx playwright test tests/${filename}\n`);
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