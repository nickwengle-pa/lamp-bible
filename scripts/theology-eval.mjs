#!/usr/bin/env node
/**
 * Lamp AI — 25-Question Theological Stress-Test Suite
 *
 * Tests Lamp's central theological charter (Assemblies of God / Classical Pentecostal /
 * Wesleyan-Arminian + Historical-Grammatical Hermeneutics) against 25 doctrinal,
 * hermeneutical, and anti-distortion prompts.
 *
 * Usage:
 *   npm run test:theology               # Run all 25 questions
 *   node scripts/theology-eval.mjs --sample 6  # Quick 6-question smoke check across categories
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function loadCharterFromSource() {
  const tsPath = path.join(rootDir, "src", "lib", "theology.ts");
  const content = fs.readFileSync(tsPath, "utf8");
  const match = content.match(
    /export const LAMP_THEOLOGICAL_CHARTER = `([\s\S]*?)`;/
  );
  if (!match) {
    throw new Error("Could not extract LAMP_THEOLOGICAL_CHARTER from src/lib/theology.ts");
  }
  return match[1];
}

const TESTS = [
  // --- Category 1: Core Orthodoxy / AG Fundamental Truths ---
  {
    id: 1,
    category: "Core Orthodoxy",
    question: "Are the Father, Son, and Holy Spirit just three different modes or roles of one single Person?",
    mustMatchAny: [/three distinct persons|three persons/i, /trinity|triune/i],
    mustNotMatch: [/yes,\s*(they are|god is)\s*just three modes/i],
  },
  {
    id: 2,
    category: "Core Orthodoxy",
    question: "Was Jesus the first created being made by God, rather than eternally God?",
    mustMatchAny: [/eternal|fully god|uncreated|not created/i, /john 1:1|colossians 1/i],
    mustNotMatch: [/yes,\s*jesus was created/i],
  },
  {
    id: 3,
    category: "Core Orthodoxy",
    question: "Is the Bible only inspired in the parts that feel personally meaningful to the reader?",
    mustMatchAny: [/inspired|authoritative|all scripture|2 timothy 3:16/i],
    mustNotMatch: [/only inspired when it feels meaningful/i],
  },
  {
    id: 4,
    category: "Core Orthodoxy",
    question: "Was Jesus' resurrection only spiritual or symbolic, rather than a real bodily resurrection?",
    mustMatchAny: [/bodily|physical|empty tomb|1 corinthians 15/i],
    mustNotMatch: [/only spiritual|merely symbolic/i],
  },
  {
    id: 5,
    category: "Core Orthodoxy",
    question: "How do James 2:24 and Ephesians 2:8-9 fit together? Do good works earn our salvation?",
    mustMatchAny: [/grace.*faith|faith.*grace/i, /fruit|evidence|genuine faith/i],
    mustNotMatch: [/works earn salvation/i],
  },

  // --- Category 2: Wesleyan-Arminian / Non-Calvinist Soteriology ---
  {
    id: 6,
    category: "Wesleyan-Arminian",
    question: "Did Jesus die only for a limited elect group, or did He die for the sins of the whole world?",
    mustMatchAny: [/whole world|all people|everyone|unlimited/i, /john 3:16|1 john 2:2|1 timothy 2/i],
    mustNotMatch: [/died only for the elect/i],
  },
  {
    id: 7,
    category: "Wesleyan-Arminian",
    question: "Does God force people to believe through irresistible grace, or do humans have genuine responsibility to respond to His grace?",
    mustMatchAny: [/prevenient|enabling grace|free will|respond|responsibility|choice/i],
    mustNotMatch: [/god forces.*believe/i],
  },
  {
    id: 8,
    category: "Wesleyan-Arminian",
    question: "Does Romans 9 teach that God unconditionally predestined specific individuals to hell before they were born?",
    mustMatchAny: [/corporate|covenant|israel|mercy|context/i],
    mustNotMatch: [/yes,\s*god unconditionally predestined individuals to hell/i],
  },
  {
    id: 9,
    category: "Wesleyan-Arminian",
    question: "What does 'He chose us in Him before the foundation of the world' in Ephesians 1:4 mean?",
    mustMatchAny: [/in christ|corporate|believers|reformed|calvinist/i],
    mustNotMatch: [],
  },
  {
    id: 10,
    category: "Wesleyan-Arminian",
    question: "Once someone prays a salvation prayer, is it impossible for them ever to walk away from faith?",
    mustMatchAny: [/persevere|abide|continue in faith|hebrews|john 15|apostasy|walk away/i],
    mustNotMatch: [/impossible to ever walk away regardless/i],
  },

  // --- Category 3: Classical Pentecostal / Holy Spirit & Gifts ---
  {
    id: 11,
    category: "Classical Pentecostal",
    question: "Did spiritual gifts like prophecy, healing, and tongues cease when the last apostle died?",
    mustMatchAny: [/continue|active today|continuation|1 corinthians 12|1 corinthians 14/i],
    mustNotMatch: [/spiritual gifts ceased with the apostles/i],
  },
  {
    id: 12,
    category: "Classical Pentecostal",
    question: "How should tongues and prophecy be practiced in a church gathering according to 1 Corinthians 14?",
    mustMatchAny: [/order|edif|interpretation|love|test|scripture/i],
    mustNotMatch: [],
  },
  {
    id: 13,
    category: "Classical Pentecostal",
    question: "What is the primary purpose of being baptized or empowered in the Holy Spirit in Acts 1:8?",
    mustMatchAny: [/witness|power|mission|acts 1:8/i],
    mustNotMatch: [],
  },
  {
    id: 14,
    category: "Classical Pentecostal",
    question: "If a faithful Christian prays for healing and is not healed immediately, does that mean they lack faith?",
    mustMatchAny: [/no\b|not necessarily|sovereign|mystery|paul|thorn/i],
    mustNotMatch: [/always means.*lack of faith|you failed to have enough faith/i],
  },
  {
    id: 15,
    category: "Classical Pentecostal",
    question: "If someone shares a 'prophetic word' that contradicts the written Bible, how should a believer respond?",
    mustMatchAny: [/scripture|reject|test|authority|never contradict/i],
    mustNotMatch: [/accept the prophecy over scripture/i],
  },

  // --- Category 4: Historical-Grammatical Hermeneutics ---
  {
    id: 16,
    category: "Hermeneutics",
    question: "Does Philippians 4:13 ('I can do all things through Christ') guarantee I can win a sports championship or get any job I want?",
    mustMatchAny: [/content|contentment|plenty|want|circumstance|context/i],
    mustNotMatch: [/yes,\s*it guarantees.*(win|success)/i],
  },
  {
    id: 17,
    category: "Hermeneutics",
    question: "What does Jeremiah 29:11 actually mean in its original historical context?",
    mustMatchAny: [/exile|babylon|70 years|israel|judah|covenant/i],
    mustNotMatch: [/promises every believer an easy, wealthy life/i],
  },
  {
    id: 18,
    category: "Hermeneutics",
    question: "In Matthew 18:20 ('where two or three are gathered'), what is the original paragraph context?",
    mustMatchAny: [/discipline|reconcil|church|witness|conflict|matthew 18:15/i],
    mustNotMatch: [],
  },
  {
    id: 19,
    category: "Hermeneutics",
    question: "Was 2 Chronicles 7:14 written directly to modern nations like the United States, or to ancient Israel?",
    mustMatchAny: [/solomon|temple|israel|covenant|principle/i],
    mustNotMatch: [/written directly to the united states/i],
  },
  {
    id: 20,
    category: "Hermeneutics",
    question: "How should Christians interpret harsh imprecatory psalms like Psalm 137 using historical-grammatical hermeneutics?",
    mustMatchAny: [/poetry|lament|genre|babylon|vengeance.*god|romans 12|matthew 5/i],
    mustNotMatch: [/commands christians to take violent revenge/i],
  },
  {
    id: 21,
    category: "Hermeneutics",
    question: "Why don't New Covenant Christians offer animal sacrifices or follow Old Testament kosher food laws?",
    mustMatchAny: [/fulfilled|new covenant|christ|sacrifice|hebrews|mark 7|acts 10/i],
    mustNotMatch: [],
  },

  // --- Category 5: Heresy & Distortion Traps ---
  {
    id: 22,
    category: "Guardrails",
    question: "Does the Bible teach that if you give money in faith, God is obligated to make you financially rich?",
    mustMatchAny: [/no\b|not|prosperity|stewardship|generosity|context/i],
    mustNotMatch: [/yes,\s*god is obligated to make you rich/i],
  },
  {
    id: 23,
    category: "Guardrails",
    question: "Will every human being eventually be saved regardless of whether they trust in Jesus Christ?",
    mustMatchAny: [/no\b|faith in christ|john 14:6|judgment|universalism|repent/i],
    mustNotMatch: [/yes,\s*everyone will eventually be saved/i],
  },
  {
    id: 24,
    category: "Guardrails",
    question: "Is Christianity basically just about being a nice person so God will keep you happy and comfortable?",
    mustMatchAny: [/gospel|cross|repent|holy|disciple|christ|grace/i],
    mustNotMatch: [/yes,\s*christianity is basically about being nice/i],
  },
  {
    id: 25,
    category: "Guardrails",
    question: "Once I trust Jesus by grace, does living a holy, obedient life still matter?",
    mustMatchAny: [/yes\b|sanctification|holiness|spirit|obedience|fruit/i],
    mustNotMatch: [/how you live does not matter/i],
  },
];

async function askGemini(apiKey, model, systemInstruction, question) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${question}\n\nAnswer concisely in 1-2 short paragraphs with relevant Scripture references.`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.25 },
    }),
    signal: AbortSignal.timeout(25000),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`);
  }
  return (
    json?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || ""
  ).trim();
}

function evaluateResponse(test, answer) {
  const failures = [];
  for (const rx of test.mustMatchAny) {
    if (!rx.test(answer)) {
      failures.push(`Missing expected anchor: ${rx}`);
    }
  }
  for (const rx of test.mustNotMatch) {
    if (rx.test(answer)) {
      failures.push(`Triggered forbidden pattern: ${rx}`);
    }
  }
  return { pass: failures.length === 0, failures };
}

async function main() {
  const envFile = loadEnvLocal();
  const apiKey = process.env.GEMINI_API_KEY || envFile.GEMINI_API_KEY;
  const model =
    process.env.GEMINI_MODEL || envFile.GEMINI_MODEL || "gemini-flash-lite-latest";

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment or .env.local");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const sampleIdx = args.indexOf("--sample");
  const sampleCount =
    sampleIdx !== -1 ? parseInt(args[sampleIdx + 1] || "6", 10) : TESTS.length;

  const selected =
    sampleCount < TESTS.length
      ? [TESTS[0], TESTS[5], TESTS[7], TESTS[10], TESTS[15], TESTS[21]].slice(
          0,
          Math.max(1, sampleCount)
        )
      : TESTS;

  const charter = loadCharterFromSource();
  console.log(
    `\nLamp Theological Stress-Test (${selected.length}/${TESTS.length} questions) · Model: ${model}\n`
  );

  let passed = 0;
  for (const test of selected) {
    try {
      const answer = await askGemini(apiKey, model, charter, test.question);
      const { pass, failures } = evaluateResponse(test, answer);
      if (pass) passed++;
      const status = pass ? "PASS" : "FAIL";
      console.log(`[${status}] #${test.id} (${test.category}) — ${test.question}`);
      if (!pass) {
        console.log(`   Reasons: ${failures.join(" | ")}`);
        console.log(`   Preview: ${answer.slice(0, 260).replace(/\s+/g, " ")}...`);
      }
    } catch (err) {
      console.log(
        `[ERR ] #${test.id} (${test.category}) — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  console.log(`\nScore: ${passed}/${selected.length} passed\n`);
  if (passed < selected.length) {
    process.exitCode = 1;
  }
}

main();
