// 프론트엔드가 2초마다 호출해서 결제 완료 여부 확인하는 엔드포인트

module.exports = async function handler(req, res) {
  const { session } = req.query;
  if (!session) return res.json({ verified: false });

  try {
    // Vercel KV에서 결제 완료 여부 조회
    const r = await fetch(
      `${process.env.KV_REST_API_URL}/get/pay_${session}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
      }
    );
    const { result } = await r.json();

    if (result) {
      // 확인됐으면 즉시 삭제 (재사용 방지)
      await fetch(
        `${process.env.KV_REST_API_URL}/del/pay_${session}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
          }
        }
      );
      return res.json({ verified: true });
    }
  } catch (e) {
    console.error('KV get error:', e);
  }

  res.json({ verified: false });
};
