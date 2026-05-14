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
 
필수 규칙:
1. overview.answer: 질문에 직접 답하는 첫 문장으로 시작. 최소 5문장 이상.
2. sections[].body: 반드시 7문장 이상. 카드 상징 설명→상대방 상황에 구체적 적용→일상 사례→뉘앙스/반전→조언 순서로 작성
3. 세 섹션은 서로 연결되는 흐름으로 작성 (앞 카드를 다음 섹션에서 언급)
4. overview.title: 단정형 한 문장 (의문형 절대 금지)
5. 역방향은 반드시 막힘/지연/내면화/미완 의미로 해석
6. "에너지", "파동", "흐름이 느껴진다" 같은 추상어 절대 금지
7. 이름을 문장 안에 자연스럽게 사용
8. 카드 이름을 문장 안에 자연스럽게 녹이기
9. advice는 오늘/이번 주 할 수 있는 매우 구체적인 행동 3가지
10. HTML 태그 절대 사용 금지. 순수 텍스트만.
11. 재회 보장, 집착 강화, 파국 선언 절대 금지
12. "이 카드가 이 자리에 나온 것은 정확히 반영하고 있습니다" 같은 무의미한 문장 금지
 
반드시 아래 JSON 구조만 출력. 마크다운 없이. 코드블록 없이. JSON만.
{"overview":{"title":"단정형 제목","answer":"질문에 직접 답하는 5문장 이상의 총평"},"sections":[{"title":"섹션 제목 1","body":"7문장 이상의 상세 해설"},{"title":"섹션 제목 2","body":"7문장 이상의 상세 해설"},{"title":"섹션 제목 3","body":"7문장 이상의 상세 해설"}],"timeline":[{"phase":"지금 ~ 2주","color":"#7B6FD4","text":"구체적 예측"},{"phase":"1~2개월","color":"#C95C84","text":"구체적 예측"},{"phase":"그 이후","color":"#C9A96E","text":"구체적 예측"}],"advice":["오늘 당장 할 수 있는 구체적 행동 1","이번 주 할 수 있는 구체적 행동 2","앞으로 실천할 구체적 행동 3"]}`;
 
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 6000,
            responseMimeType: "application/json"
          },
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
 
