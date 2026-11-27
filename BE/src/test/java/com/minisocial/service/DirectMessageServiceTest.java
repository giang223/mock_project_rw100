package com.minisocial.service;

import com.minisocial.dto.request.SendDirectMessageRequest;
import com.minisocial.entity.Conversation;
import com.minisocial.entity.DirectMessage;
import com.minisocial.entity.DirectMessageReaction;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.ConversationParticipantRepository;
import com.minisocial.repository.ConversationRepository;
import com.minisocial.repository.DirectMessageRepository;
import com.minisocial.repository.DirectMessageReactionRepository;
import com.minisocial.repository.UserBlockRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.repository.RefreshTokenRepository;
import com.minisocial.security.StompUserPrincipal;
import com.minisocial.util.SecurityUtils;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DirectMessageServiceTest {

    @Mock private ConversationRepository conversationRepository;
    @Mock private ConversationParticipantRepository participantRepository;
    @Mock private DirectMessageRepository messageRepository;
    @Mock private DirectMessageReactionRepository reactionRepository;
    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private UserBlockRepository userBlockRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private NotificationService notificationService;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks private DirectMessageService service;

    @Test
    void opensCanonicalConversationIdempotentlyAndRegistersBothParticipants() {
        User current = user(9L);
        User other = user(3L);
        Conversation conversation = conversation(20L, other, current);
        when(securityUtils.getCurrentUser()).thenReturn(current);
        when(userRepository.findById(3L)).thenReturn(Optional.of(other));
        when(conversationRepository.findByUserLowIdAndUserHighId(3L, 9L)).thenReturn(Optional.of(conversation));
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));

        var response = service.openDirectConversation(3L);

        assertEquals(20L, response.getId());
        assertEquals(3L, response.getOtherParticipant().getId());
        verify(conversationRepository).insertDirectIfAbsent(eq(3L), eq(9L), any(LocalDateTime.class));
        verify(participantRepository).insertIfAbsent(eq(20L), eq(3L), any(LocalDateTime.class));
        verify(participantRepository).insertIfAbsent(eq(20L), eq(9L), any(LocalDateTime.class));
    }

    @Test
    void refusesToOpenConversationWhenEitherUserBlockedTheOther() {
        User current = user(9L);
        User other = user(3L);
        when(securityUtils.getCurrentUser()).thenReturn(current);
        when(userRepository.findById(3L)).thenReturn(Optional.of(other));
        when(userBlockRepository.existsByBlockerIdAndBlockedId(9L, 3L)).thenReturn(false);
        when(userBlockRepository.existsByBlockerIdAndBlockedId(3L, 9L)).thenReturn(true);

        assertThrows(AppException.class, () -> service.openDirectConversation(3L));
        verify(conversationRepository, never()).insertDirectIfAbsent(anyLong(), anyLong(), any());
    }

    @Test
    void sendsAndPublishesOnlyAfterCheckingMembershipAndCurrentBlockState() {
        User sender = user(9L);
        User recipient = user(3L);
        Conversation conversation = conversation(20L, recipient, sender);
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(conversationRepository.findById(20L)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(DirectMessage.class))).thenAnswer(invocation -> {
            DirectMessage message = invocation.getArgument(0);
            message.setId(55L);
            message.setCreatedAt(LocalDateTime.now());
            return message;
        });
        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("  hello  ");

        var response = service.sendMessage(20L, request);

        assertEquals(55L, response.getId());
        assertEquals("hello", response.getContent());
        assertEquals(9L, response.getSender().getId());
        verify(notificationService).createNotification(eq(recipient), eq(sender), eq(com.minisocial.entity.Notification.Type.MESSAGE),
                eq(null), any(String.class));
        ArgumentCaptor<DirectMessageSent> event = ArgumentCaptor.forClass(DirectMessageSent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertEquals(20L, event.getValue().conversationId());
        assertEquals(3L, event.getValue().recipientUserId());
        assertEquals("hello", event.getValue().message().getContent());
        verify(messageRepository).updateLastMessageAt(eq(20L), any(LocalDateTime.class));
        verify(participantRepository).unhideForAllParticipants(20L);
    }

    @Test
    void blocksSendingToConversationThatIsNoLongerVisible() {
        when(securityUtils.getCurrentUser()).thenReturn(user(9L));
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(false);
        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("hello");

        assertThrows(AppException.class, () -> service.sendMessage(20L, request));
        verify(messageRepository, never()).save(any(DirectMessage.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void rejectsStompWritesAfterTheirRefreshSessionWasRevoked() {
        StompUserPrincipal principal = new StompUserPrincipal("sender9@example.com", "revoked-session");
        when(refreshTokenRepository.existsActiveSession(eq("revoked-session"),
                eq("sender9@example.com"), any(LocalDateTime.class))).thenReturn(false);
        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("hello");

        assertThrows(AppException.class, () -> service.sendMessage(20L, principal, request));
        verify(userRepository, never()).findByEmail(any());
        verify(messageRepository, never()).save(any(DirectMessage.class));
    }

    @Test
    void persistsVerifiedMediaAttachmentAlongsideOptionalText() {
        User sender = user(9L);
        User recipient = user(3L);
        Conversation conversation = conversation(20L, recipient, sender);
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(conversationRepository.findById(20L)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(DirectMessage.class))).thenAnswer(invocation -> {
            DirectMessage message = invocation.getArgument(0);
            message.setId(56L);
            message.setCreatedAt(LocalDateTime.now());
            return message;
        });

        var response = service.sendMediaMessage(20L, "  see this  ",
                "https://res.cloudinary.com/demo/image/upload/example.jpg", DirectMessage.MediaType.IMAGE, null);

        assertEquals("see this", response.getContent());
        assertEquals("https://res.cloudinary.com/demo/image/upload/example.jpg", response.getMediaUrl());
        assertEquals(DirectMessage.MediaType.IMAGE, response.getMediaType());
        ArgumentCaptor<DirectMessage> message = ArgumentCaptor.forClass(DirectMessage.class);
        verify(messageRepository).save(message.capture());
        assertEquals(DirectMessage.MediaType.IMAGE, message.getValue().getMediaType());
    }

    @Test
    void sendsReplyWhenTargetMessageBelongsToTheSameConversation() {
        User sender = user(9L);
        User recipient = user(3L);
        Conversation conversation = conversation(20L, recipient, sender);
        DirectMessage parent = DirectMessage.builder().id(44L).conversation(conversation)
                .sender(recipient).content("original message").build();
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(messageRepository.findById(44L)).thenReturn(Optional.of(parent));
        when(conversationRepository.findById(20L)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(DirectMessage.class))).thenAnswer(invocation -> {
            DirectMessage message = invocation.getArgument(0);
            message.setId(55L);
            message.setCreatedAt(LocalDateTime.now());
            return message;
        });
        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("reply");
        request.setReplyToMessageId(44L);

        var response = service.sendMessage(20L, request);

        assertEquals(44L, response.getReplyTo().getId());
        assertEquals("original message", response.getReplyTo().getContent());
        ArgumentCaptor<DirectMessage> message = ArgumentCaptor.forClass(DirectMessage.class);
        verify(messageRepository).save(message.capture());
        assertEquals(parent, message.getValue().getReplyToMessage());
    }

    @Test
    void refusesToQuoteMessageFromAnotherConversation() {
        User sender = user(9L);
        Conversation visibleConversation = conversation(20L, user(3L), sender);
        DirectMessage otherConversationMessage = DirectMessage.builder().id(44L)
                .conversation(conversation(21L, user(3L), user(4L))).content("private to another thread").build();
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(messageRepository.findById(44L)).thenReturn(Optional.of(otherConversationMessage));
        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("reply");
        request.setReplyToMessageId(44L);

        assertThrows(AppException.class, () -> service.sendMessage(20L, request));
        verify(messageRepository, never()).save(any(DirectMessage.class));
    }

    @Test
    void setsOneReactionPerUserForAnAccessibleMessage() {
        User sender = user(9L);
        Conversation conversation = conversation(20L, user(3L), sender);
        DirectMessage message = DirectMessage.builder().id(55L).conversation(conversation)
                .sender(sender).content("hello").build();
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(messageRepository.findById(55L)).thenReturn(Optional.of(message));
        when(reactionRepository.insertIfAbsent(eq(55L), eq(9L), eq("LOVE"), any(LocalDateTime.class)))
                .thenReturn(1);
        when(reactionRepository.findByDirectMessageIdInAndUserId(any(), eq(9L))).thenReturn(List.of(
                DirectMessageReaction.builder().directMessage(message).user(sender)
                        .reactionType(DirectMessageReaction.Type.LOVE).build()));

        var response = service.setReaction(20L, 55L, DirectMessageReaction.Type.LOVE);

        assertEquals(DirectMessageReaction.Type.LOVE, response.getCurrentUserReaction());
        verify(reactionRepository).insertIfAbsent(eq(55L), eq(9L), eq("LOVE"), any(LocalDateTime.class));
    }

    @Test
    void rejectsReactionsOnMessagesOutsideTheVisibleConversation() {
        User sender = user(9L);
        Conversation messageConversation = conversation(21L, user(3L), user(4L));
        DirectMessage message = DirectMessage.builder().id(55L).conversation(messageConversation)
                .sender(user(3L)).content("private").build();
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(messageRepository.findById(55L)).thenReturn(Optional.of(message));

        assertThrows(AppException.class,
                () -> service.setReaction(20L, 55L, DirectMessageReaction.Type.LIKE));
        verify(reactionRepository, never()).insertIfAbsent(anyLong(), anyLong(), any(), any());
    }

    @Test
    void changesAnExistingReactionInsteadOfCreatingADuplicate() {
        User sender = user(9L);
        Conversation conversation = conversation(20L, user(3L), sender);
        DirectMessage message = DirectMessage.builder().id(55L).conversation(conversation)
                .sender(sender).content("hello").build();
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(messageRepository.findById(55L)).thenReturn(Optional.of(message));
        when(reactionRepository.insertIfAbsent(eq(55L), eq(9L), eq("ANGRY"), any(LocalDateTime.class)))
                .thenReturn(0);
        when(reactionRepository.findByDirectMessageIdInAndUserId(any(), eq(9L))).thenReturn(List.of(
                DirectMessageReaction.builder().directMessage(message).user(sender)
                        .reactionType(DirectMessageReaction.Type.ANGRY).build()));

        var response = service.setReaction(20L, 55L, DirectMessageReaction.Type.ANGRY);

        assertEquals(DirectMessageReaction.Type.ANGRY, response.getCurrentUserReaction());
        verify(reactionRepository).updateReactionType(55L, 9L, "ANGRY");
    }

    @Test
    void relaysTypingTransitionsToTheOtherParticipantAndSuppressesRapidDuplicates() {
        User sender = user(9L);
        User recipient = user(3L);
        Conversation conversation = conversation(20L, recipient, sender);
        StompUserPrincipal principal = new StompUserPrincipal(sender.getEmail(), "session-9");
        when(refreshTokenRepository.existsActiveSession(eq("session-9"), eq(sender.getEmail()),
                any(LocalDateTime.class))).thenReturn(true);
        when(userRepository.findByEmail(sender.getEmail())).thenReturn(Optional.of(sender));
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(conversationRepository.findById(20L)).thenReturn(Optional.of(conversation));

        service.sendTypingIndicator(20L, principal, true);
        service.sendTypingIndicator(20L, principal, true);
        service.sendTypingIndicator(20L, principal, false);

        ArgumentCaptor<DirectMessageTyping> events = ArgumentCaptor.forClass(DirectMessageTyping.class);
        verify(eventPublisher, times(2)).publishEvent(events.capture());
        assertEquals(3L, events.getAllValues().getFirst().recipientUserId());
        assertTrue(events.getAllValues().getFirst().typing());
        assertFalse(events.getAllValues().get(1).typing());
    }

    @Test
    void storesPerUserNicknameAndHidesOnlyTheCurrentUsersConversation() {
        when(securityUtils.getCurrentUserId()).thenReturn(9L);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(participantRepository.updateContactNickname(20L, 9L, "Bestie")).thenReturn(1);

        service.hideConversation(20L);
        service.updateNickname(20L, "  Bestie  ");

        verify(participantRepository).updateHiddenAt(eq(20L), eq(9L), any(LocalDateTime.class));
        verify(participantRepository).updateContactNickname(20L, 9L, "Bestie");
    }

    @Test
    void messageResponsesIncludeRecipientReadWatermarkForOwnMessages() {
        User sender = user(9L);
        User recipient = user(3L);
        Conversation conversation = conversation(20L, recipient, sender);
        LocalDateTime sentAt = LocalDateTime.of(2026, 11, 27, 10, 0);
        LocalDateTime readAt = sentAt.plusMinutes(2);
        DirectMessage message = DirectMessage.builder().id(55L).conversation(conversation)
                .sender(sender).content("hello").createdAt(sentAt).build();
        var pageable = PageRequest.of(0, 10);
        when(securityUtils.getCurrentUser()).thenReturn(sender);
        when(conversationRepository.isVisibleToParticipant(20L, 9L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 9L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(20L, pageable))
                .thenReturn(new PageImpl<>(List.of(message), pageable, 1));
        when(participantRepository.findByConversationIdAndUserIdNot(20L, 9L)).thenReturn(List.of(
                com.minisocial.entity.ConversationParticipant.builder().lastReadAt(readAt).build()));

        var response = service.getMessages(20L, pageable).getContent().getFirst();

        assertEquals(readAt, response.getReadAt());
    }

    @Test
    void markingConversationReadPublishesReceiptToTheOtherParticipant() {
        User reader = user(3L);
        User recipient = user(9L);
        Conversation conversation = conversation(20L, reader, recipient);
        when(securityUtils.getCurrentUser()).thenReturn(reader);
        when(conversationRepository.isVisibleToParticipant(20L, 3L)).thenReturn(true);
        when(participantRepository.findByConversationIdAndUserId(20L, 3L))
                .thenReturn(Optional.of(com.minisocial.entity.ConversationParticipant.builder().id(1L).build()));
        when(participantRepository.updateLastReadAt(eq(20L), eq(3L), any(LocalDateTime.class))).thenReturn(1);
        when(conversationRepository.findById(20L)).thenReturn(Optional.of(conversation));

        service.markRead(20L);

        ArgumentCaptor<DirectMessageRead> event = ArgumentCaptor.forClass(DirectMessageRead.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertEquals(20L, event.getValue().conversationId());
        assertEquals(3L, event.getValue().readerUserId());
        assertEquals(9L, event.getValue().recipientUserId());
        assertTrue(event.getValue().readAt() != null);
    }

    private Conversation conversation(Long id, User low, User high) {
        return Conversation.builder().id(id).userLow(low).userHigh(high)
                .createdAt(LocalDateTime.now()).build();
    }

    private User user(Long id) {
        return User.builder().id(id).email("sender" + id + "@example.com")
                .fullName("User " + id).isActive(true).isEmailVerified(true).build();
    }
}
