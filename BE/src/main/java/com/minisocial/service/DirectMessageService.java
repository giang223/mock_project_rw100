package com.minisocial.service;

import com.minisocial.dto.request.SendDirectMessageRequest;
import com.minisocial.dto.response.ConversationResponse;
import com.minisocial.dto.response.DirectMessageResponse;
import com.minisocial.dto.response.DirectMessageReplyResponse;
import com.minisocial.dto.response.DirectMessageTypingResponse;
import com.minisocial.dto.response.DirectMessageSummaryResponse;
import com.minisocial.entity.Conversation;
import com.minisocial.entity.ConversationParticipant;
import com.minisocial.entity.DirectMessage;
import com.minisocial.entity.DirectMessageReaction;
import com.minisocial.entity.Notification;
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
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageImpl;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@RequiredArgsConstructor
public class DirectMessageService {

    private static final int MAX_TRACKED_TYPING_STATES = 10_000;
    private static final long TYPING_NOTIFICATION_INTERVAL_MILLIS = 500;
    private static final long TYPING_STATE_EXPIRY_MILLIS = 60_000;

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final DirectMessageRepository messageRepository;
    private final DirectMessageReactionRepository reactionRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserBlockRepository userBlockRepository;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final ConcurrentMap<TypingKey, Long> lastTypingNoticeAt = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public Page<ConversationResponse> getConversations(Pageable pageable) {
        User currentUser = securityUtils.getCurrentUser();
        Page<Conversation> conversations = conversationRepository
                .findVisibleByParticipant(currentUser.getId(), pageable);
        List<Long> ids = conversations.getContent().stream().map(Conversation::getId).toList();
        if (ids.isEmpty()) return new PageImpl<>(List.of(), pageable, conversations.getTotalElements());
        Map<Long, ConversationParticipant> currentParticipants = participantRepository
                .findByUserIdAndConversationIdIn(currentUser.getId(), ids).stream()
                .collect(Collectors.toMap(participant -> participant.getConversation().getId(), participant -> participant));

        Map<Long, DirectMessageSummaryResponse> latestMessages = messageRepository
                .findLatestForConversations(ids).stream().collect(Collectors.toMap(
                        DirectMessageRepository.LatestMessageProjection::getConversationId,
                        row -> {
                            DirectMessage.MediaType mediaType = row.getMediaType() == null ? null
                                    : DirectMessage.MediaType.valueOf(row.getMediaType());
                            return DirectMessageSummaryResponse.builder()
                                    .id(row.getId()).senderId(row.getSenderId())
                                    .content(truncate(row.getContent(), 160)).mediaUrl(row.getMediaUrl())
                                    .mediaType(mediaType).createdAt(row.getCreatedAt()).build();
                        }));
        Map<Long, Long> unreadCounts = participantRepository.findUnreadCounts(currentUser.getId(), ids)
                .stream().collect(Collectors.toMap(
                        ConversationParticipantRepository.UnreadCountProjection::getConversationId,
                        ConversationParticipantRepository.UnreadCountProjection::getUnreadCount));

        return conversations.map(conversation -> toConversationResponse(conversation, currentUser.getId(),
                latestMessages.get(conversation.getId()), unreadCounts.getOrDefault(conversation.getId(), 0L),
                currentParticipants.get(conversation.getId()).getContactNickname()));
    }

    @Transactional
    public ConversationResponse openDirectConversation(Long otherUserId) {
        User currentUser = securityUtils.getCurrentUser();
        if (otherUserId == null || currentUser.getId().equals(otherUserId)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể tạo cuộc trò chuyện với chính mình");
        }
        User otherUser = findAvailableUser(otherUserId);
        ensureNotBlocked(currentUser.getId(), otherUser.getId());

        long lowId = Math.min(currentUser.getId(), otherUser.getId());
        long highId = Math.max(currentUser.getId(), otherUser.getId());
        conversationRepository.insertDirectIfAbsent(lowId, highId, LocalDateTime.now());
        Conversation conversation = conversationRepository.findByUserLowIdAndUserHighId(lowId, highId)
                .orElseThrow(() -> new IllegalStateException("Conversation insert was not visible in transaction"));
        participantRepository.insertIfAbsent(conversation.getId(), lowId, LocalDateTime.now());
        participantRepository.insertIfAbsent(conversation.getId(), highId, LocalDateTime.now());
        participantRepository.updateHiddenAt(conversation.getId(), currentUser.getId(), null);
        ensureConversationVisible(conversation.getId(), currentUser.getId());
        ConversationParticipant currentParticipant = participantRepository
                .findByConversationIdAndUserId(conversation.getId(), currentUser.getId()).orElseThrow();
        return toConversationResponse(conversation, currentUser.getId(), null, 0,
                currentParticipant.getContactNickname());
    }

    @Transactional(readOnly = true)
    public Page<DirectMessageResponse> getMessages(Long conversationId, Pageable pageable) {
        User currentUser = securityUtils.getCurrentUser();
        ensureConversationVisible(conversationId, currentUser.getId());
        return toMessageResponses(messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable),
                currentUser.getId());
    }

    @Transactional
    public DirectMessageResponse sendMessage(Long conversationId, SendDirectMessageRequest request) {
        return sendMessageAs(conversationId, securityUtils.getCurrentUser(), request);
    }

    @Transactional(readOnly = true)
    public void assertCanSendMessage(Long conversationId) {
        assertCanSendMessage(conversationId, null);
    }

    @Transactional(readOnly = true)
    public void assertCanSendMessage(Long conversationId, Long replyToMessageId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        ensureConversationVisible(conversationId, currentUserId);
        findReplyTarget(conversationId, replyToMessageId);
    }

    @Transactional
    public DirectMessageResponse sendMediaMessage(Long conversationId, String content,
                                                   String mediaUrl, DirectMessage.MediaType mediaType,
                                                   Long replyToMessageId) {
        User sender = securityUtils.getCurrentUser();
        if (!StringUtils.hasText(mediaUrl) || mediaType == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "File media không hợp lệ");
        }
        String normalizedContent = StringUtils.hasText(content) ? content.trim() : null;
        if (normalizedContent != null && normalizedContent.length() > 5000) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tin nhắn tối đa 5000 ký tự");
        }
        return persistMessage(conversationId, sender, normalizedContent, mediaUrl, mediaType, replyToMessageId);
    }

    @Transactional
    public void markRead(Long conversationId) {
        User currentUser = securityUtils.getCurrentUser();
        ensureConversationVisible(conversationId, currentUser.getId());
        LocalDateTime readAt = LocalDateTime.now();
        int updated = participantRepository.updateLastReadAt(conversationId, currentUser.getId(), readAt);
        if (updated == 0) throw new AppException(HttpStatus.FORBIDDEN, "Bạn không tham gia cuộc trò chuyện này");
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Cuộc trò chuyện không tồn tại"));
        Long recipientUserId = conversation.getUserLow().getId().equals(currentUser.getId())
                ? conversation.getUserHigh().getId() : conversation.getUserLow().getId();
        eventPublisher.publishEvent(new DirectMessageRead(conversationId, currentUser.getId(), recipientUserId, readAt));
    }

    @Transactional
    public void hideConversation(Long conversationId) {
        Long currentUserId = securityUtils.getCurrentUserId();
        ensureConversationVisible(conversationId, currentUserId);
        participantRepository.updateHiddenAt(conversationId, currentUserId, LocalDateTime.now());
    }

    @Transactional
    public void updateNickname(Long conversationId, String nickname) {
        Long currentUserId = securityUtils.getCurrentUserId();
        ensureConversationVisible(conversationId, currentUserId);
        String normalized = StringUtils.hasText(nickname) ? nickname.trim() : null;
        if (normalized != null && normalized.length() > 100) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Biệt danh tối đa 100 ký tự");
        }
        int updated = participantRepository.updateContactNickname(conversationId, currentUserId, normalized);
        if (updated == 0) throw new AppException(HttpStatus.NOT_FOUND, "Cuộc trò chuyện không tồn tại");
    }

    @Transactional
    public DirectMessageResponse setReaction(Long conversationId, Long messageId,
                                             DirectMessageReaction.Type reactionType) {
        if (reactionType == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Cảm xúc không hợp lệ");
        }
        User currentUser = securityUtils.getCurrentUser();
        DirectMessage message = findAccessibleMessage(conversationId, messageId, currentUser.getId());
        int inserted = reactionRepository.insertIfAbsent(messageId, currentUser.getId(),
                reactionType.name(), LocalDateTime.now());
        if (inserted == 0) {
            reactionRepository.updateReactionType(messageId, currentUser.getId(), reactionType.name());
        }
        return toMessageResponse(message, currentUser.getId());
    }

    @Transactional
    public DirectMessageResponse removeReaction(Long conversationId, Long messageId) {
        User currentUser = securityUtils.getCurrentUser();
        DirectMessage message = findAccessibleMessage(conversationId, messageId, currentUser.getId());
        reactionRepository.deleteByDirectMessageIdAndUserId(messageId, currentUser.getId());
        return toMessageResponse(message, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public void assertCanAccessConversation(Long conversationId, StompUserPrincipal principal) {
        User user = findActiveStompUser(principal);
        ensureConversationVisible(conversationId, user.getId());
    }

    @Transactional
    public void sendTypingIndicator(Long conversationId, StompUserPrincipal principal, boolean typing) {
        User sender = findActiveStompUser(principal);
        ensureConversationVisible(conversationId, sender.getId());
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Cuộc trò chuyện không tồn tại"));
        Long recipientId = conversation.getUserLow().getId().equals(sender.getId())
                ? conversation.getUserHigh().getId() : conversation.getUserLow().getId();

        TypingKey key = new TypingKey(conversationId, sender.getId(), principal.sessionId());
        if (typing && !allowTypingNotice(key)) return;
        if (!typing && lastTypingNoticeAt.remove(key) == null) return;
        eventPublisher.publishEvent(new DirectMessageTyping(conversationId, sender.getId(), recipientId, typing));
    }

    @Transactional
    public DirectMessageResponse sendMessage(Long conversationId, StompUserPrincipal principal,
                                             SendDirectMessageRequest request) {
        User user = findActiveStompUser(principal);
        return sendMessageAs(conversationId, user, request);
    }

    private User findActiveStompUser(StompUserPrincipal principal) {
        if (principal == null || !StringUtils.hasText(principal.sessionId())
                || !StringUtils.hasText(principal.email())
                || !refreshTokenRepository.existsActiveSession(
                    principal.sessionId(), principal.email(), LocalDateTime.now())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không còn hợp lệ");
        }
        return userRepository.findByEmail(principal.email())
                .filter(candidate -> Boolean.TRUE.equals(candidate.getIsActive())
                        && Boolean.TRUE.equals(candidate.getIsEmailVerified()))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không còn hợp lệ"));
    }

    private DirectMessageResponse sendMessageAs(Long conversationId, User sender, SendDirectMessageRequest request) {
        if (request == null || !StringUtils.hasText(request.getContent())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Nội dung tin nhắn không được để trống");
        }
        String content = request.getContent().trim();
        if (content.length() > 5000) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tin nhắn tối đa 5000 ký tự");
        }
        return persistMessage(conversationId, sender, content, null, null, request.getReplyToMessageId());
    }

    private DirectMessageResponse persistMessage(Long conversationId, User sender, String content,
                                                  String mediaUrl, DirectMessage.MediaType mediaType,
                                                  Long replyToMessageId) {
        ensureConversationVisible(conversationId, sender.getId());
        DirectMessage replyTo = findReplyTarget(conversationId, replyToMessageId);
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Cuộc trò chuyện không tồn tại"));
        User recipient = conversation.getUserLow().getId().equals(sender.getId())
                ? conversation.getUserHigh() : conversation.getUserLow();
        DirectMessage message = messageRepository.save(DirectMessage.builder()
                .conversation(conversation).sender(sender).content(content)
                .mediaUrl(mediaUrl).mediaType(mediaType).replyToMessage(replyTo).build());
        LocalDateTime sentAt = message.getCreatedAt() == null ? LocalDateTime.now() : message.getCreatedAt();
        messageRepository.updateLastMessageAt(conversationId, sentAt);
        notificationService.createNotification(recipient, sender, Notification.Type.MESSAGE, null,
                sender.getFullName() + " đã gửi cho bạn một tin nhắn");
        participantRepository.unhideForAllParticipants(conversationId);
        DirectMessageResponse response = toMessageResponse(message, sender.getId());
        eventPublisher.publishEvent(new DirectMessageSent(conversationId, recipient.getId(), response));
        return response;
    }

    private void ensureConversationVisible(Long conversationId, Long userId) {
        if (conversationId == null || !conversationRepository.isVisibleToParticipant(conversationId, userId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Cuộc trò chuyện không tồn tại");
        }
        if (participantRepository.findByConversationIdAndUserId(conversationId, userId).isEmpty()) {
            throw new AppException(HttpStatus.NOT_FOUND, "Cuộc trò chuyện không tồn tại");
        }
    }

    private User findAvailableUser(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> Boolean.TRUE.equals(user.getIsActive())
                        && Boolean.TRUE.equals(user.getIsEmailVerified()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
    }

    private void ensureNotBlocked(Long firstUserId, Long secondUserId) {
        if (userBlockRepository.existsByBlockerIdAndBlockedId(firstUserId, secondUserId)
                || userBlockRepository.existsByBlockerIdAndBlockedId(secondUserId, firstUserId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại");
        }
    }

    private ConversationResponse toConversationResponse(Conversation conversation, Long currentUserId,
                                                          DirectMessageSummaryResponse lastMessage,
                                                          long unreadCount, String otherParticipantNickname) {
        User other = conversation.getUserLow().getId().equals(currentUserId)
                ? conversation.getUserHigh() : conversation.getUserLow();
        return ConversationResponse.builder().id(conversation.getId())
                .otherParticipant(PostService.mapToUserSummary(other))
                .otherParticipantNickname(otherParticipantNickname).lastMessage(lastMessage)
                .unreadCount(unreadCount).lastMessageAt(conversation.getLastMessageAt())
                .createdAt(conversation.getCreatedAt()).build();
    }

    private DirectMessage findAccessibleMessage(Long conversationId, Long messageId, Long userId) {
        ensureConversationVisible(conversationId, userId);
        return messageRepository.findById(messageId)
                .filter(message -> message.getConversation().getId().equals(conversationId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Tin nhắn không tồn tại"));
    }

    private Page<DirectMessageResponse> toMessageResponses(Page<DirectMessage> messages, Long currentUserId) {
        List<Long> messageIds = messages.getContent().stream().map(DirectMessage::getId).toList();
        if (messageIds.isEmpty()) {
            return new PageImpl<>(List.of(), messages.getPageable(), messages.getTotalElements());
        }

        Map<Long, Map<DirectMessageReaction.Type, Long>> counts = new HashMap<>();
        reactionRepository.findCountsByMessageIds(messageIds).forEach(row -> counts
                .computeIfAbsent(row.getMessageId(), ignored -> new EnumMap<>(DirectMessageReaction.Type.class))
                .put(row.getReactionType(), row.getReactionCount()));
        Map<Long, DirectMessageReaction.Type> currentReactions = reactionRepository
                .findByDirectMessageIdInAndUserId(messageIds, currentUserId).stream()
                .collect(Collectors.toMap(reaction -> reaction.getDirectMessage().getId(),
                        DirectMessageReaction::getReactionType));
        Long conversationId = messages.getContent().getFirst().getConversation().getId();
        LocalDateTime recipientReadAt = participantRepository
                .findByConversationIdAndUserIdNot(conversationId, currentUserId).stream()
                .map(ConversationParticipant::getLastReadAt)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo).orElse(null);
        return messages.map(message -> {
            LocalDateTime messageReadAt = message.getSender().getId().equals(currentUserId)
                    && recipientReadAt != null && message.getCreatedAt() != null
                    && !recipientReadAt.isBefore(message.getCreatedAt()) ? recipientReadAt : null;
            return toMessageResponse(message, currentUserId,
                    counts.getOrDefault(message.getId(), Map.of()), currentReactions.get(message.getId()), messageReadAt);
        });
    }

    private DirectMessageResponse toMessageResponse(DirectMessage message, Long currentUserId) {
        return toMessageResponses(new PageImpl<>(List.of(message)), currentUserId).getContent().getFirst();
    }

    private DirectMessageResponse toMessageResponse(DirectMessage message, Long currentUserId,
                                                     Map<DirectMessageReaction.Type, Long> reactionCounts,
                                                     DirectMessageReaction.Type currentUserReaction,
                                                     LocalDateTime readAt) {
        DirectMessage replyTo = message.getReplyToMessage();
        return DirectMessageResponse.builder().id(message.getId())
                .conversationId(message.getConversation().getId())
                .sender(PostService.mapToUserSummary(message.getSender())).content(message.getContent())
                .mediaUrl(message.getMediaUrl()).mediaType(message.getMediaType())
                .replyTo(replyTo == null ? null : DirectMessageReplyResponse.builder()
                        .id(replyTo.getId())
                        .sender(PostService.mapToUserSummary(replyTo.getSender()))
                        .content(replyTo.getContent())
                        .mediaUrl(replyTo.getMediaUrl())
                        .mediaType(replyTo.getMediaType())
                        .build())
                .reactionCounts(reactionCounts)
                .currentUserReaction(currentUserReaction)
                .readAt(readAt)
                .createdAt(message.getCreatedAt()).build();
    }

    private DirectMessage findReplyTarget(Long conversationId, Long messageId) {
        if (messageId == null) return null;
        return messageRepository.findById(messageId)
                .filter(message -> message.getConversation().getId().equals(conversationId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Tin nhắn được trích dẫn không tồn tại"));
    }

    private String truncate(String text, int maxLength) {
        return text == null || text.length() <= maxLength ? text : text.substring(0, maxLength) + "…";
    }

    private boolean allowTypingNotice(TypingKey key) {
        long now = System.currentTimeMillis();
        if (lastTypingNoticeAt.size() >= MAX_TRACKED_TYPING_STATES && !lastTypingNoticeAt.containsKey(key)) {
            lastTypingNoticeAt.entrySet().removeIf(entry -> now - entry.getValue() > TYPING_STATE_EXPIRY_MILLIS);
            if (lastTypingNoticeAt.size() >= MAX_TRACKED_TYPING_STATES) return false;
        }
        Long previous = lastTypingNoticeAt.get(key);
        if (previous != null && now - previous < TYPING_NOTIFICATION_INTERVAL_MILLIS) return false;
        lastTypingNoticeAt.put(key, now);
        return true;
    }

    private record TypingKey(Long conversationId, Long userId, String sessionId) { }
}
