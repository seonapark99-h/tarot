// PayApp feedbackurl - 어떤 경우에도 반드시 SUCCESS 반환
module.exports = async function handler(req, res) {
  // PayApp은 항상 SUCCESS 응답을 기대함
  // 내부 에러가 나도 SUCCESS를 먼저 보내야 결제가 진행됨

  try {
    const body = req.body || {};
    const pay_state = body.pay_state;
    const price     = body.price;
    const sessionId = body.var1;
    const linkval   = body.linkval;

    // 연동VALUE 검증 (설정된 경우에만)
    if (process.env.PAYAPP_LINKVAL && linkval !== process.env.PAYAPP_LINKVAL) {
      console.warn('linkval mismatch');
      return res.status(200).send('SUCCESS');
    }

    // 결제 완료(pay_state=4) + 금액 일치 → KV 저장
    if (pay_state === '4' && parseInt(price) === 1900 && sessionId) {
      const kvUrl   = process.env.KV_REST_API_URL;
      const kvToken = process.env.KV_REST_API_TOKEN;

      if (kvUrl && kvToken) {
        await fetch(`${kvUrl}/set/pay_${sessionId}/1/ex/300`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        console.log('결제 완료 확인:', sessionId);
      }
    }

  } catch (e) {
    // 에러가 나도 SUCCESS는 반드시 반환
    console.error('payment-notify error:', e);
  }

  return res.status(200).send('SUCCESS');
};
