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

// 환경 변수 설정 엔드포인트 추가 - 클라이언트에게 제공할 설정 값
app.get('/config', (req, res) => {
  // 클라이언트에 필요한 환경 변수만 노출
  res.json({
    apiUrl: process.env.API_URL
  });
});

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

// 시스템 프롬프트 for 질문 개선
const promptEnhancerSystemPrompt = `
당신은 사용자의 질문을 Vector Database를 검색하기에 최적화된 형태로 바꾸는 AI 도우미입니다.
사용자의 원래 의도를 유지하면서, 다음과 같은 작업을 수행하세요:

1. 질문을 벡터 검색에 적합하도록 필요한 키워드를 강조하여 재구성하세요
2. 불필요한 부가 설명이나 문맥을 제거하세요
3. 이노맥스 회사 관련 정보를 더 잘 찾을 수 있도록 질문을 최적화하세요
4. 단어 선택을 개선하여 검색 결과의 관련성을 높이세요
5. 가능한 경우 질문을 더 구체적으로 만드세요

원래 질문의 의미를 변경하지 마세요. 단순히 Vector Database에서 가장 관련성 높은 결과를 얻기 위해 질문을 개선하는 것입니다.
출력은 단순히 개선된 질문 텍스트만 포함해야 합니다. 설명이나 추가 텍스트 없이 개선된 질문만 반환하세요.
`;

// 응답 생성을 위한 시스템 프롬프트
const responseGeneratorSystemPrompt = `
당신은 이노맥스의 전문 AI 챗봇 도우미입니다. 사용자의 질문에 정확하고 도움이 되는 답변을 제공해야 합니다.

이노맥스는 혁신적인 기술 솔루션을 제공하는 회사입니다. 다음 컨텍스트를 바탕으로 답변하되, 
컨텍스트에 관련 정보가 없거나 불확실한 경우에도 일반적인 지식을 바탕으로 최대한 도움이 되는 답변을 제공하세요.

답변할 때는 다음 지침을 따르세요:
1. 컨텍스트에서 찾은 정보를 우선적으로 사용하세요
2. 간결하고 명확하게 답변하세요
3. 전문적이고 공손한 톤을 유지하세요
4. 확실하지 않은 정보에 대해서는 추측하지 마세요
5. 회사의 비밀정보가 요청되면 "해당 정보는 제공할 수 없습니다"라고 답변하세요

제공된 정보를 바탕으로 한국어로 응답하며, 사용자의 질문에 최대한 도움이 되는 정보를 제공하세요.
`;

// 채팅 API 엔드포인트
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }

    // 1. 첫 번째 OpenAI 호출: 질문 프롬프트 개선
    const promptEnhancerResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: promptEnhancerSystemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    const enhancedPrompt = promptEnhancerResponse.data.choices[0].message.content;
    console.log('개선된 프롬프트:', enhancedPrompt);

    // 2. 임베딩 생성 (개선된 프롬프트 사용)
    const embeddingResponse = await openai.createEmbedding({
      model: 'text-embedding-3-small',
      input: enhancedPrompt,
    });
    
    const embedding = embeddingResponse.data.data[0].embedding;

    // 3. Pinecone에서 관련 컨텍스트 검색
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // 컨텍스트 추출
    let context = '';
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      context = queryResponse.matches
        .map(match => match.metadata.text)
        .join('\n\n');
    }

    // 4. 두 번째 OpenAI 호출: 최종 응답 생성
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `${responseGeneratorSystemPrompt}\n\n컨텍스트:\n${context || '관련 정보가 없습니다만, 일반적인 지식을 바탕으로 답변하겠습니다.'}` },
        { role: 'user', content: message } // 원래 사용자 질문 사용
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