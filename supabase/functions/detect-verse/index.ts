import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userText } = await req.json();

    if (!userText || userText.trim().length < 3) {
      return new Response(JSON.stringify({ error: "النص قصير جداً" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت خبير في القرآن الكريم. مهمتك تحديد الآية والسورة من نص تلاوة المستخدم.
حتى لو النص فيه أخطاء بسيطة في النطق، حاول تحدد أقرب آية.
إذا كان النص يحتوي على أكثر من آية، حدد كل الآيات.`,
          },
          {
            role: "user",
            content: `حدد الآية/الآيات من هذا النص:\n"${userText.trim()}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_verses",
              description: "Identify Quran verses from recited text",
              parameters: {
                type: "object",
                properties: {
                  detected: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        surahNumber: { type: "number", description: "Surah number 1-114" },
                        surahName: { type: "string", description: "Surah name in Arabic" },
                        verseNumber: { type: "number", description: "Verse number" },
                        verseText: { type: "string", description: "The correct verse text" },
                        confidence: { type: "number", description: "Confidence 0-100" },
                      },
                      required: ["surahNumber", "surahName", "verseNumber", "verseText", "confidence"],
                    },
                  },
                  feedback: { type: "string", description: "Brief feedback in Arabic about the recitation quality" },
                },
                required: ["detected", "feedback"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "identify_verses" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى شحن الرصيد" }), {
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
      result = { detected: [], feedback: "لم يتم التعرف على الآية" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-verse error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
