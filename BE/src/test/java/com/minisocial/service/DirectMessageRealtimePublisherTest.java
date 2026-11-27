package com.minisocial.service;

import com.minisocial.dto.response.DirectMessageResponse;
import com.minisocial.dto.response.DirectMessageTypingResponse;
import com.minisocial.dto.response.DirectMessageReadResponse;
import com.minisocial.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DirectMessageRealtimePublisherTest {

    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks private DirectMessageRealtimePublisher publisher;

    @Test
    void routesOnlyToCurrentlyActiveRecipientSessions() {
        DirectMessageResponse message = DirectMessageResponse.builder().id(1L).conversationId(20L).content("hello").build();
        when(refreshTokenRepository.findActiveSessionIdsByUserId(eq(3L), any(LocalDateTime.class)))
                .thenReturn(List.of("session-a", "session-b"));

        publisher.publish(new DirectMessageSent(20L, 3L, message));

        verify(messagingTemplate).convertAndSendToUser("session-a", "/queue/conversations/20", message);
        verify(messagingTemplate).convertAndSendToUser("session-b", "/queue/conversations/20", message);
        verifyNoMoreInteractions(messagingTemplate);
    }

    @Test
    void routesTypingIndicatorsOnlyToActiveRecipientSessions() {
        when(refreshTokenRepository.findActiveSessionIdsByUserId(eq(3L), any(LocalDateTime.class)))
                .thenReturn(List.of("session-a"));

        publisher.publishTyping(new DirectMessageTyping(20L, 9L, 3L, true));

        verify(messagingTemplate).convertAndSendToUser("session-a", "/queue/conversations/20/typing",
                new DirectMessageTypingResponse(20L, 9L, true));
        verifyNoMoreInteractions(messagingTemplate);
    }

    @Test
    void routesReadReceiptsToTheOtherParticipantsActiveSessions() {
        LocalDateTime readAt = LocalDateTime.of(2026, 11, 27, 10, 2);
        when(refreshTokenRepository.findActiveSessionIdsByUserId(eq(9L), any(LocalDateTime.class)))
                .thenReturn(List.of("sender-session"));

        publisher.publishRead(new DirectMessageRead(20L, 3L, 9L, readAt));

        verify(messagingTemplate).convertAndSendToUser("sender-session", "/queue/conversations/20/read",
                new DirectMessageReadResponse(20L, 3L, readAt));
        verifyNoMoreInteractions(messagingTemplate);
    }
}
