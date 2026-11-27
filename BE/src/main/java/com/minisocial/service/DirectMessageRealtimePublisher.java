package com.minisocial.service;

import lombok.RequiredArgsConstructor;
import com.minisocial.repository.RefreshTokenRepository;
import com.minisocial.dto.response.DirectMessageTypingResponse;
import com.minisocial.dto.response.DirectMessageReadResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DirectMessageRealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;
    private final RefreshTokenRepository refreshTokenRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(DirectMessageSent event) {
        for (String activeSessionId : refreshTokenRepository.findActiveSessionIdsByUserId(
                event.recipientUserId(), LocalDateTime.now())) {
            messagingTemplate.convertAndSendToUser(activeSessionId,
                    "/queue/conversations/" + event.conversationId(), event.message());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishTyping(DirectMessageTyping event) {
        DirectMessageTypingResponse response = new DirectMessageTypingResponse(
                event.conversationId(), event.senderUserId(), event.typing());
        for (String activeSessionId : refreshTokenRepository.findActiveSessionIdsByUserId(
                event.recipientUserId(), LocalDateTime.now())) {
            messagingTemplate.convertAndSendToUser(activeSessionId,
                    "/queue/conversations/" + event.conversationId() + "/typing", response);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishRead(DirectMessageRead event) {
        DirectMessageReadResponse response = new DirectMessageReadResponse(
                event.conversationId(), event.readerUserId(), event.readAt());
        for (String activeSessionId : refreshTokenRepository.findActiveSessionIdsByUserId(
                event.recipientUserId(), LocalDateTime.now())) {
            messagingTemplate.convertAndSendToUser(activeSessionId,
                    "/queue/conversations/" + event.conversationId() + "/read", response);
        }
    }
}
