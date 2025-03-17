// DOM 엘리먼트
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const modelBadge = document.querySelector('.model-badge');
const modelTooltip = document.querySelector('.model-tooltip');

// GitHub Pages에서 배포된 환경과 로컬 또는 CloudType 환경을 구분
const isGitHubPages = window.location.hostname.includes('github.io');

// API 엔드포인트 설정 - GitHub Pages와 다른 환경에 맞게 조정
let API_URL = isGitHubPages 
    ? 'https://port-0-ai-chatbot-forgroup-m8bfjrmj2356a824.sel4.cloudtype.app/api/chat' 
    : '/api/chat';

// AI 모델 정보 - 서버와 일치하도록 설정
const AI_MODEL_INFO = {
    chat: 'gpt-4o-mini',
    embedding: 'text-embedding-3-small'
};


// 서비스 환경에 따른 이미지 경로 설정 (여기에 추가)
function adjustImagePaths() {
    const logoImg = document.getElementById('companyLogo');
    if (!logoImg) return;
    
    // GitHub Pages 도메인인 경우 경로 조정
    if (isGitHubPages) {
        // GitHub Pages에서의 이미지 경로
        if (!logoImg.src.includes('/AI_chatbot_forGroup/')) {
            logoImg.src = '/AI_chatbot_forGroup/public/images/company-logo.png';
        }
    } else if (window.location.hostname.includes('cloudtype.app')) {
        // CloudType에서의 이미지 경로
        logoImg.src = '/public/images/company-logo.png';
    } else if (window.location.protocol === 'file:') {
        // 로컬 파일일 경우 상대 경로 사용
        logoImg.src = 'public/images/company-logo.png';
    }
}

// 설정 로드 함수 수정
async function loadConfig() {
    // 브라우저에서 직접 파일을 열었는지 확인
    const isLocalFile = window.location.protocol === 'file:';
    
    if (isLocalFile || isGitHubPages) {
        console.log('로컬 파일 또는 GitHub Pages에서 실행 중입니다. 기본 설정을 사용합니다.');
        return; // 로컬 파일이나 GitHub Pages에서 실행 중이면 fetch 요청을 건너뜀
    }
    
    try {
        // 서버에서 제공하는 설정 엔드포인트에 맞춰 경로 수정 (CloudType 환경에서만 실행)
        const response = await fetch('/config');
        if (response.ok) {
            const config = await response.json();
            console.log('서버 설정 로드됨:', config);
            if (config.apiUrl) {
                API_URL = config.apiUrl;
                console.log('API URL 업데이트됨:', API_URL);
            }
        }
    } catch (error) {
        console.error('설정을 로드하는 중 오류 발생:', error);
        // 오류가 발생해도 애플리케이션은 계속 실행 (기본 API_URL 사용)
        console.log('기본 API URL 사용:', API_URL);
    }
}

// 페이지 로드 시 설정 로드
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadConfig();
        
        // AI 모델 정보 표시
        if (modelBadge) {
            modelBadge.textContent = AI_MODEL_INFO.chat;
        }
        
        // 이미지 경로 조정 함수 호출 (여기에 추가)
        adjustImagePaths();
        
        // 이벤트 리스너 설정
        sendButton.addEventListener('click', handleUserMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleUserMessage();
            }
        });
        
        // 초기 메시지 시간 업데이트
        updateInitialMessageTime();
        
        console.log('초기화 완료, API URL:', API_URL);
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }
});

// 초기 메시지 시간 업데이트
function updateInitialMessageTime() {
    const initialTimeElement = document.getElementById('initialMessageTime');
    if (initialTimeElement) {
        initialTimeElement.textContent = formatTime();
    }
}

// 브라우저에서 직접 파일을 열었는지 확인
const isLocalFile = window.location.protocol === 'file:';

// 현재 시간 포맷팅 함수
function formatTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${ampm} ${hours}:${minutes}`;
}

// 사용자 메시지 처리
async function handleUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // 사용자 메시지 UI에 추가
    addMessageToUI('user', message);
    userInput.value = '';
    
    // 전송 버튼 비활성화 및 로딩 아이콘 표시
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // 로딩 표시
    const loadingIndicator = addLoadingIndicator();

    // 로컬 파일로 실행 중인 경우 서버 요청을 보내지 않고 가상 응답을 생성
    if (isLocalFile) {
        // 잠시 딜레이를 줘서 로딩 효과를 보여줌
        setTimeout(() => {
            const responses = {
                '안녕': '안녕하세요! 이노맥스 챗봇입니다. 무엇을 도와드릴까요?',
                '회사 소개': '이노맥스는 혁신적인 기술 솔루션을 제공하는 회사입니다. 최신 기술과 전문 지식을 바탕으로 고객에게 최상의 서비스를 제공하고 있습니다.',
                '도움말': '저는 이노맥스 챗봇입니다. 일반 정보, 재무 정보, 장비 정보 등에 대해 답변할 수 있습니다.',
                '모델': `현재 이 챗봇은 OpenAI의 ${AI_MODEL_INFO.chat} 모델을 사용하며, 벡터 임베딩은 ${AI_MODEL_INFO.embedding} 모델을 사용합니다. Pinecone 벡터 데이터베이스에 저장된 회사 정보를 검색하여 질문에 답변합니다.`
            };

            // 키워드 매칭 시도
            let foundResponse = null;
            for (const [key, value] of Object.entries(responses)) {
                if (message.toLowerCase().includes(key.toLowerCase())) {
                    foundResponse = value;
                    break;
                }
            }

            // 매칭된 응답이 없으면 기본 응답 사용
            const botResponse = foundResponse || '죄송합니다. 해당 질문에 대한 정보가 없습니다. 다른 질문을 해주시거나, 실제 서버 환경에서 실행해주세요.';
            
            chatMessages.removeChild(loadingIndicator);
            addMessageToUI('bot', botResponse);
            
            // 전송 버튼 복원
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }, 1500); // 1.5초 후 응답
        return;
    }

    try {
        // 백엔드 서버에 메시지 전송
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '서버 응답 오류' }));
            throw new Error(errorData.error || '서버 오류가 발생했습니다');
        }

        const data = await response.json();
        
        // 로딩 표시 제거 및 답변 표시
        chatMessages.removeChild(loadingIndicator);
        addMessageToUI('bot', data.response);
    } catch (error) {
        console.error('오류 발생:', error);
        chatMessages.removeChild(loadingIndicator);
        addMessageToUI('bot', '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
        // 전송 버튼 복원
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        
        // 입력 필드에 포커스
        userInput.focus();
    }
}

// UI에 메시지 추가
function addMessageToUI(sender, content) {
    const time = formatTime();
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    // 아바타 추가
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    
    const iconElement = document.createElement('i');
    if (sender === 'user') {
        iconElement.classList.add('fas', 'fa-user');
    } else {
        iconElement.classList.add('fas', 'fa-robot');
    }
    
    avatarDiv.appendChild(iconElement);
    messageDiv.appendChild(avatarDiv);
    
    // 메시지 버블 생성
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    
    // 메시지 내용 추가 (코드 블록 처리 포함)
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerHTML = formatMessage(content);
    messageBubble.appendChild(contentDiv);
    
    // 메시지 시간 추가
    const timeDiv = document.createElement('div');
    timeDiv.classList.add('message-time');
    timeDiv.textContent = time;
    messageBubble.appendChild(timeDiv);
    
    messageDiv.appendChild(messageBubble);
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 최신 메시지 위치로
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 메시지 내용 포맷팅 (코드 블록 처리)
function formatMessage(content) {
    // 코드 블록 처리 (```로 감싸진 부분)
    let formattedContent = content.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
    });
    
    // 줄바꿈 처리
    formattedContent = formattedContent.replace(/\n/g, '<br>');
    
    return formattedContent;
}

// HTML 이스케이프 함수
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 로딩 표시 추가
function addLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    
    // 로딩 점 추가
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        indicator.appendChild(dot);
    }
    
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
}