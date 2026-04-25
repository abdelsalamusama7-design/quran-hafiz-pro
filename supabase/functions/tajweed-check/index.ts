import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userText, correctText, surahName, verseNumber } = await req.json();

    if (!userText || !correctText) {
      return new Response(JSON.stringify({ error: "Missing userText or correctText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ============ Arabic text normalization ============
    // Removes diacritics, unifies hamza/alef/yaa/taa marbuta forms,
    // strips tatweel & punctuation, collapses whitespace.
    const normalizeArabic = (s: string): string => {
      return s
        // Remove tashkeel (fatha, kasra, damma, sukun, shadda, tanween, dagger alef)
        .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED\u08F0-\u08F3]/g, "")
        // Remove tatweel
        .replace(/\u0640/g, "")
        // Unify alef forms
        .replace(/[إأآٱ]/g, "ا")
        // Unify yaa
        .replace(/[ىئ]/g, "ي")
        // Unify taa marbuta -> haa (common speech-to-text confusion)
        .replace(/ة/g, "ه")
        // Unify hamza on waw / standalone
        .replace(/[ؤء]/g, "")
        // Remove non-letter punctuation
        .replace(/[^\u0600-\u06FF\s]/g, " ")
        // Collapse whitespace
        .replace(/\s+/g, " ")
        .trim();
    };

    // Levenshtein distance for fuzzy word matching
    const levenshtein = (a: string, b: string): number => {
      if (a === b) return 0;
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      const m = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) m[i][0] = i;
      for (let j = 0; j <= b.length; j++) m[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
        }
      }
      return m[a.length][b.length];
    };

    // Align user words to correct words, marking which were close-enough matches
    const alignTexts = (user: string, correct: string) => {
      const userWords = user.split(/\s+/).filter(Boolean);
      const correctWords = correct.split(/\s+/).filter(Boolean);
      const aligned: string[] = [];
      let ui = 0;
      for (let ci = 0; ci < correctWords.length; ci++) {
        const cw = correctWords[ci];
        // Look ahead in user words within a small window
        let bestIdx = -1;
        let bestDist = Infinity;
        const windowEnd = Math.min(userWords.length, ui + 3);
        for (let k = ui; k < windowEnd; k++) {
          const d = levenshtein(userWords[k], cw);
          const threshold = Math.max(1, Math.floor(cw.length * 0.35));
          if (d <= threshold && d < bestDist) {
            bestDist = d;
            bestIdx = k;
          }
        }
        if (bestIdx !== -1) {
          // Treat as a match — use the correct spelling so AI focuses on tajweed
          aligned.push(cw);
          ui = bestIdx + 1;
        } else {
          // Keep user's word as-is (real divergence)
          if (ui < userWords.length) {
            aligned.push(userWords[ui]);
            ui++;
          }
        }
      }
      // Append any trailing user words
      while (ui < userWords.length) {
        aligned.push(userWords[ui]);
        ui++;
      }
      return aligned.join(" ");
    };

    const normalizedCorrect = normalizeArabic(correctText);
    const normalizedUser = normalizeArabic(userText);
    const alignedUser = alignTexts(normalizedUser, normalizedCorrect);

    const systemPrompt = `أنت شيخ متخصص في علم التجويد وأحكام التلاوة برواية حفص عن عاصم.
مهمتك: مقارنة تلاوة الطالب بالنص الصحيح واستخراج أخطاء التجويد بدقة عالية.

قواعد مهمة قبل التحليل:
- تجاهل تماماً الفروقات الإملائية البسيطة الناتجة عن التفريغ النصي (Speech-to-Text) مثل: غياب التشكيل، اختلاف رسم الهمزة (أ/إ/آ/ا)، الياء والألف المقصورة (ي/ى)، التاء المربوطة والهاء (ة/ه)، حذف أو إضافة حرف واحد بسبب خطأ التعرف الصوتي.
- لا تعتبر هذه الفروقات أخطاء تلاوة. ركّز فقط على أحكام التجويد.
- إذا كان الفرق بين كلمة الطالب والكلمة الصحيحة طفيفاً جداً (حرف أو حركة)، اعتبره مطابقاً واستخرج أخطاء التجويد المحتملة فيه.
- فقط إذا كانت الكلمة مختلفة جوهرياً أو محذوفة كلياً، أشر إلى ذلك كخطأ تلاوة لا تجويد.

ركّز على هذه الأحكام:
- أحكام النون الساكنة والتنوين (إظهار، إدغام، إقلاب، إخفاء)
- أحكام الميم الساكنة (إخفاء شفوي، إدغام شفوي، إظهار شفوي)
- المدود (طبيعي، متصل، منفصل، لازم، عارض)
- القلقلة (صغرى وكبرى)
- الغنة وأحكام النون والميم المشددتين
- التفخيم والترقيق (لام لفظ الجلالة، الراء)
- مخارج الحروف وصفاتها
- الوقف والابتداء

لكل خطأ:
- حدد القاعدة المخالَفة بالاسم
- بيّن الكلمة أو الموضع
- اشرح الصواب باختصار وبأسلوب معلم
- اقترح تمريناً عملياً سريعاً للتصحيح`;

    const userPrompt = `سورة ${surahName} - الآية ${verseNumber}
النص الصحيح (الأصلي مع التشكيل):
"${correctText}"

النص الصحيح (مطبَّع بدون تشكيل):
"${normalizedCorrect}"

تلاوة الطالب الأصلية (مفرّغة من Speech-to-Text):
"${userText}"

تلاوة الطالب بعد التطبيع والمحاذاة الذكية (تم تصحيح الأخطاء الإملائية البسيطة تلقائياً):
"${alignedUser}"

اعتمد على النص المطبَّع والمحاذى للحكم على المطابقة، واستخرج أخطاء التجويد فقط (وليس أخطاء التفريغ النصي) وقدّم تصحيحاً فورياً.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "tajweed_report",
              description: "Detailed tajweed error report with rule-level corrections",
              parameters: {
                type: "object",
                properties: {
                  overallScore: {
                    type: "number",
                    description: "Overall tajweed score 0-100",
                  },
                  level: {
                    type: "string",
                    enum: ["excellent", "good", "needs_practice", "weak"],
                    description: "Overall tajweed level",
                  },
                  errors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rule: {
                          type: "string",
                          description: "Tajweed rule name in Arabic (e.g. الإخفاء، المد المتصل، القلقلة)",
                        },
                        ruleCategory: {
                          type: "string",
                          enum: ["noon", "meem", "madd", "qalqalah", "ghunnah", "tafkheem", "makharij", "waqf", "other"],
                        },
                        word: { type: "string", description: "The word containing the error" },
                        location: { type: "string", description: "Brief location hint inside the verse" },
                        severity: {
                          type: "string",
                          enum: ["minor", "moderate", "major"],
                        },
                        whatHappened: {
                          type: "string",
                          description: "Concise Arabic description of what the student did wrong",
                        },
                        correction: {
                          type: "string",
                          description: "Concise Arabic description of the correct way",
                        },
                        practiceTip: {
                          type: "string",
                          description: "Quick exercise to fix this specific issue",
                        },
                      },
                      required: ["rule", "ruleCategory", "word", "severity", "whatHappened", "correction"],
                    },
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tajweed rules the student applied well",
                  },
                  summary: {
                    type: "string",
                    description: "Short overall feedback in Arabic",
                  },
                },
                required: ["overallScore", "level", "errors", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "tajweed_report" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى شحن رصيد الذكاء الاصطناعي" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let report;
    if (toolCall?.function?.arguments) {
      report = JSON.parse(toolCall.function.arguments);
    } else {
      report = {
        overallScore: 0,
        level: "needs_practice",
        errors: [],
        strengths: [],
        summary: "تعذر تحليل التلاوة، حاول مرة أخرى.",
      };
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tajweed-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});