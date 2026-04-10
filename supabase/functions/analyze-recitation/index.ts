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

    const systemPrompt = `أنت معلم قرآن متخصص في التجويد وتصحيح التلاوة. مهمتك تحليل تلاوة المستخدم ومقارنتها بالنص الصحيح.

أجب دائماً بـ JSON بالتنسيق التالي (بدون أي نص إضافي):
{
  "accuracy": <نسبة الدقة من 0 إلى 100>,
  "mistakes": [
    {
      "type": "pronunciation" | "missing_word" | "extra_word" | "tajweed" | "order",
      "word": "<الكلمة الخاطئة>",
      "correction": "<التصحيح>",
      "explanation": "<شرح قصير بالعربية>"
    }
  ],
  "tajweedNotes": ["<ملاحظات تجويدية>"],
  "overallFeedback": "<تقييم عام بالعربية>",
  "tips": ["<نصيحة للتحسين>"]
}`;

    const userPrompt = `النص الصحيح للآية ${verseNumber} من سورة ${surahName}:
"${correctText}"

تلاوة المستخدم:
"${userText}"

حلل التلاوة وأعطني تقريراً مفصلاً.`;

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
              name: "recitation_analysis",
              description: "Analyze Quran recitation and return structured feedback",
              parameters: {
                type: "object",
                properties: {
                  accuracy: { type: "number", description: "Accuracy percentage 0-100" },
                  mistakes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["pronunciation", "missing_word", "extra_word", "tajweed", "order"] },
                        word: { type: "string" },
                        correction: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["type", "word", "correction", "explanation"],
                    },
                  },
                  tajweedNotes: { type: "array", items: { type: "string" } },
                  overallFeedback: { type: "string" },
                  tips: { type: "array", items: { type: "string" } },
                },
                required: ["accuracy", "mistakes", "overallFeedback", "tips"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recitation_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى شحن رصيد الذكاء الاصطناعي" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = data.choices?.[0]?.message?.content || "";
      try {
        analysis = JSON.parse(content);
      } catch {
        analysis = {
          accuracy: 0,
          mistakes: [],
          tajweedNotes: [],
          overallFeedback: content || "لم يتم التحليل",
          tips: [],
        };
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-recitation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
