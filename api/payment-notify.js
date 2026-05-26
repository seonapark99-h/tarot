// PayApp이 결제 완료 후 자동으로 POST 요청을 보내는 엔드포인트
// PayApp 관리자 > 설정 > 연동VALUE 를 PAYAPP_LINKVAL 환경변수에 설정해야 합니다

module.exports = async function handler(req, res) {
  // PayApp은 POST로 전송
  if (req.method !== 'POST') return res.status(405).end();

  const {
    pay_state,   // 4 = 결제완료
    price,       // 결제 금액
    var1: sessionId, // openPayment()에서 보낸 세션 ID
    linkval      // PayApp 연동VALUE (위변조 검증용)
  } = req.body || {};

  // ① PayApp 연동VALUE 검증 (위변조 방지)
  if (process.env.PAYAPP_LINKVAL && linkval !== process.env.PAYAPP_LINKVAL) {
    console.warn('PayApp linkval mismatch');
    return res.send('SUCCESS'); // PayApp 재시도 방지를 위해 SUCCESS 응답
  }

  // ② 결제 완료 + 금액 일치 확인
  if (pay_state === '4' && parseInt(price) === 2900 && sessionId) {
    try {
      // Vercel KV에 "결제 완료" 저장 (5분 유효)
      await fetch(
        `${process.env.KV_REST_API_URL}/set/pay_${sessionId}/1/ex/300`,
        {
          headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
          }
        }
      );
      console.log('Payment verified, sessionId:', sessionId);
    } catch (e) {
      console.error('KV set error:', e);
    }
  }

  // PayApp에 반드시 SUCCESS 응답 (안 하면 PayApp이 재시도)
  res.send('SUCCESS');
};
