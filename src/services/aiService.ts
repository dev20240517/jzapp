import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function scanBill(base64Image: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `你是一个专业的账单识别助手。请从这张账单图片中提取以下信息：
1. 商家名称 (merchant)
2. 总金额 (amount, 数字)
3. 消费日期 (date, 格式 YYYY-MM-DD)
4. 消费类别 (category, 从以下选项中选择：餐饮, 购物, 交通, 娱乐, 居住, 医疗, 教育, 其他)
5. 消费项目列表 (items, 字符串数组)

请以 JSON 格式返回。`,
          },
          {
            inlineData: {
              data: base64Image.split(",")[1] || base64Image,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchant: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          date: { type: Type.STRING },
          category: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["merchant", "amount", "date", "category"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function getAIWarning(expenses: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `以下是用户最近的消费记录：${JSON.stringify(expenses)}。
请分析这些消费，并给出简短的 AI 预警或建议（50字以内）。如果消费正常，请给予鼓励。`,
  });

  return response.text;
}
