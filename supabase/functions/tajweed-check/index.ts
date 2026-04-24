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

    const systemPrompt = `أنت شيخ متخصص في علم التجويد وأحكام التلاوة برواية حفص عن عاصم.
مهمتك: مقارنة تلاوة الطالب بالنص الصحيح واستخراج أخطاء التجويد بدقة عالية.

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
النص الصحيح:
"${correctText}"

تلاوة الطالب (مفرّغة نصياً):
"${userText}"

استخرج أخطاء التجويد فقط (وليس أخطاء الكلمات) وقدّم تصحيحاً فورياً.`;

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