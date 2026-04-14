import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userText, expectedText, surahName, verseNumber, previousCorrections } = await req.json();

    if (!userText || !expectedText) {
      return new Response(JSON.stringify({ error: "Missing userText or expectedText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `أنت معلم قرآن يستمع لتلاوة الطالب مباشرة ويصحح فوراً. أنت كأنك شيخ جالس بجانب الطالب يسمّعه.

قواعد مهمة:
- قارن ما قاله الطالب بالنص المتوقع كلمة بكلمة
- إذا وجدت خطأ: اذكره فوراً بوضوح واذكر الصواب
- إذا كان صحيحاً: شجعه باختصار
- إذا نسي أو توقف: ذكّره بالكلمة التالية
- كن مختصراً ومباشراً كأنك شيخ حقيقي
- استخدم أسلوب دافئ ومشجع

لا تكرر تصحيحات سابقة.`;

    const userPrompt = `سورة ${surahName} - آية ${verseNumber}
النص الصحيح: "${expectedText}"
ما قاله الطالب حتى الآن: "${userText}"
${previousCorrections ? `\nتصحيحات سابقة (لا تكررها): ${previousCorrections}` : ''}

أعطني ردك كمعلم يستمع مباشرة.`;

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
              name: "live_correction",
              description: "Provide real-time correction for Quran recitation",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["correct", "mistake", "forgot", "partial"],
                    description: "correct=no errors, mistake=has error, forgot=student stopped/forgot, partial=partially correct"
                  },
                  message: {
                    type: "string",
                    description: "Short correction or encouragement message in Arabic, like a real teacher"
                  },
                  wrongWord: {
                    type: "string",
                    description: "The word the student said incorrectly (if mistake)"
                  },
                  correctWord: {
                    type: "string",
                    description: "The correct word (if mistake or forgot)"
                  },
                  nextWord: {
                    type: "string",
                    description: "The next expected word to help the student continue"
                  },
                  accuracy: {
                    type: "number",
                    description: "Current accuracy percentage 0-100"
                  },
                },
                required: ["status", "message", "accuracy"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "live_correction" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      result = { status: "partial", message: content || "جاري الاستماع...", accuracy: 0 };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-correct error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
