// DOM 엘리먼트
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const categorySelector = document.getElementById('categorySelector');

// API 엔드포인트
const API_URL = 'https://port-0-innomaxchatbot-m81gvozb3de7f8e0.sel4.cloudtype.app/api/chat';

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

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    sendButton.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });
});

// 사용자 메시지 처리
async function handleUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // 사용자 메시지 UI에 추가
    addMessageToUI('user', message);
    userInput.value = '';

    // 로딩 표시
    const loadingIndicator = addLoadingIndicator();

    // 로컬 파일로 실행 중인 경우 서버 요청을 보내지 않고 가상 응답을 생성
    if (isLocalFile) {
        // 잠시 딜레이를 줘서 로딩 효과를 보여줌
        setTimeout(() => {
            const responses = {
                '안녕': '안녕하세요! 이노맥스 챗봇입니다. 무엇을 도와드릴까요?',
                '회사 소개': '이노맥스는 혁신적인 기술 솔루션을 제공하는 회사입니다. 최신 기술과 전문 지식을 바탕으로 고객에게 최상의 서비스를 제공하고 있습니다.',
                '도움말': '저는 이노맥스 챗봇입니다. 일반 정보, 재무 정보, 장비 정보 등에 대해 답변할 수 있습니다.'
            };

            // 키워드 매칭 시도
            let foundResponse = null;
            for (const [key, value] of Object.entries(responses)) {
                if (message.includes(key)) {
                    foundResponse = value;
                    break;
                }
            }

            // 매칭된 응답이 없으면 기본 응답 사용
            const botResponse = foundResponse || '죄송합니다. 해당 질문에 대한 정보가 없습니다. 다른 질문을 해주시거나, 실제 서버 환경에서 실행해주세요.';
            
            chatMessages.removeChild(loadingIndicator);
            addMessageToUI('bot', botResponse);
        }, 1500); // 1.5초 후 응답
        return;
    }

    try {
        // 백엔드 서버에 메시지 전송 (카테고리는 제거)
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
            const errorData = await response.json();
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
    
    // 메시지 내용 추가
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = content;
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

// 로딩 표시 추가
function addLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    
    // 봇 아바타 추가
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    
    const iconElement = document.createElement('i');
    iconElement.classList.add('fas', 'fa-robot');
    avatarDiv.appendChild(iconElement);
    indicator.appendChild(avatarDiv);
    
    // 로딩 점 추가
    const dotsContainer = document.createElement('div');
    dotsContainer.classList.add('dots');
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dotsContainer.appendChild(dot);
    }
    
    indicator.appendChild(dotsContainer);
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
}