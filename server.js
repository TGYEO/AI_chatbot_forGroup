// 필요한 패키지 불러오기
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const { Configuration, OpenAIApi } = require('openai');

// 환경 변수 설정
dotenv.config();

// Express 앱 초기화
const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors({
  origin: ['https://tgyeo.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public')); // 정적 파일 제공

// OpenAI 설정
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Pinecone 클라이언트 초기화
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Pinecone 인덱스
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

// 카테고리별 시스템 프롬프트 정의
const categoryPrompts = {
  general: `
    당신은 이노맥스의 챗봇 도우미입니다. 
    사용자의 질문에 정확하고 도움이 되는 답변을 제공해야 합니다.
    
    이노맥스는 혁신적인 기술 솔루션을 제공하는 회사입니다.
    일반적인 질문에 대해 친절하고 전문적으로 응답해주세요.
  `,
  finance: `
    당신은 이노맥스의 재무 전문 챗봇 도우미입니다.
    재무, 회계, 투자, 예산, 재정 계획 등에 관한 질문에 전문적인 답변을 제공해야 합니다.
    
    사용자의 질문이 재무 관련 내용이 아니더라도, 가능한 한 재무적 관점에서 답변하세요.
    
    재무 정보를 다룰 때는 정확성과 신중함을 유지하며, 회사의 재정 상태나 
    비밀정보에 대해서는 "해당 정보는 제공할 수 없습니다"라고 답변하세요.
  `,
  equipment: `
    당신은 이노맥스의 장비 전문 챗봇 도우미입니다.
    제조 장비, 기계, 공구, 기술 사양, 유지보수, 설치, 운영 등에 관한 질문에
    전문적인 답변을 제공해야 합니다.
    
    사용자의 질문이 장비 관련 내용이 아니더라도, 가능한 한 기술적 관점에서 답변하세요.
    
    장비에 대한 상세 설명과 기술적 조언을 제공하되, 회사의 핵심 기술이나
    비밀정보에 대해서는 "해당 정보는 제공할 수 없습니다"라고 답변하세요.
  `
};

// 채팅 API 엔드포인트
app.post('/api/chat', async (req, res) => {
  try {
    const { message, category = 'general' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }

    // 1. 임베딩 생성
    const embeddingResponse = await openai.createEmbedding({
      model: 'text-embedding-3-small',
      input: message,
    });
    
    const embedding = embeddingResponse.data.data[0].embedding;

    // 2. Pinecone에서 관련 컨텍스트 검색
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    // 컨텍스트 추출
    let context = '';
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      context = queryResponse.matches
        .map(match => match.metadata.text)
        .join('\n\n');
    }

    // 3. 카테고리에 따른 시스템 프롬프트 선택
    const categoryPrompt = categoryPrompts[category] || categoryPrompts.general;
    
    // 4. 시스템 프롬프트 구성
    const systemPrompt = `
        ${categoryPrompt}
        
        다음 컨텍스트를 바탕으로 답변하되, 컨텍스트에 관련 정보가 없거나 불확실한 경우에도
        일반적인 지식을 바탕으로 최대한 도움이 되는 답변을 제공하세요.
        
        컨텍스트:
        ${context || '관련 정보가 없습니다만, 일반적인 지식을 바탕으로 답변하겠습니다.'}
    `;

    // 5. OpenAI로 챗봇 응답 생성
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const botResponse = completion.data.choices[0].message.content;
    
    // 응답 반환
    res.json({ response: botResponse });

  } catch (error) {
    console.error('오류 발생:', error);
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다', 
      details: error.message 
    });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다`);
});