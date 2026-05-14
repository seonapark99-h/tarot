export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { prompt } = req.body;

  const systemPrompt = `당신은 10년 경력의 연애 타로 리더입니다. 직관적이고 구체적인 언어로 말합니다.

해석 원칙:
- 메이저 아르카나: 관계가 가르치는 큰 교훈과 전환점을 먼저 읽는다
- 마이너 숫자 카드: 지금 진행 중인 감정/행동/현실을 구체적으로 읽는다
- 역방향: 결과 확정이 아닌 막힘/지연/내면화/미완의 과제로 읽는다
- 금지: 상대 의사 단정, 재회 보장, 조작적 조언, 집착 강화, 파국 공포

필수 규칙:
1. overview.answer: 질문에 직접 답하는 첫 문장으로 시작
2. sections[].body: 7문장 이상. 카드 상징→상대방 상황 적용→구체적 일상 사례→뉘앙스→조언 순
3. 세 섹션을 흐름으로 연결 (앞 카드 언급)
4. overview.title: 단정형 한 문장 (의문형 금지)
5. 역방향은 반드시 막힘/지연/내면화/미완 의미로 해석
6. "에너지", "파동", "흐름이 느껴진다" 금지
7. 이름을 자연스럽게 사용
8. advice는 오늘/이번 주 할 수 있는 구체적 행동
9. HTML 태그 절대 사용 금지. 순수 텍스트만.
10. 재회 보장, 집착 강화, 파국 선언 금지

항상 올바른 JSON 형식으로만 응답하세요. 마크다운, 코드블록, 추가 텍스트 없이 JSON 객체만 출력하세요.

반드시 아래 구조를 완성해서 출력:
{"overview":{"title":"...","answer":"..."},"sections":[{"title":"...","body":"..."},{"title":"...","body":"..."},{"title":"...","body":"..."}],"timeline":[{"phase":"지금 ~ 2주","color":"#7B6FD4","text":"..."},{"phase":"1~2개월","color":"#C95C84","text":"..."},{"phase":"그 이후","color":"#C9A96E","text":"..."}],"advice":["...","...","..."]}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 4000 },
          systemInstruction: { parts: [{ text: systemPrompt }] }
        }),
      }
    );
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
