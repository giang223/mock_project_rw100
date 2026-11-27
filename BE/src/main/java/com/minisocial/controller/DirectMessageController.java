package com.minisocial.controller;

import com.minisocial.dto.request.SendDirectMessageRequest;
import com.minisocial.dto.request.SendMediaMessageRequest;
import com.minisocial.dto.request.SetDirectMessageReactionRequest;
import com.minisocial.dto.request.TypingIndicatorRequest;
import com.minisocial.dto.request.UpdateConversationNicknameRequest;
import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.ConversationResponse;
import com.minisocial.dto.response.DirectMessageResponse;
import com.minisocial.service.DirectMessageService;
import com.minisocial.service.FileStorageService;
import com.minisocial.security.StompUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.io.IOException;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class DirectMessageController {

    private final DirectMessageService directMessageService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public ApiResponse<Page<ConversationResponse>> getConversations(
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(directMessageService.getConversations(pageable));
    }

    @PutMapping("/direct/{otherUserId}")
    public ApiResponse<ConversationResponse> openDirect(@PathVariable Long otherUserId) {
        return ApiResponse.success(directMessageService.openDirectConversation(otherUserId));
    }

    @GetMapping("/{conversationId}/messages")
    public ApiResponse<Page<DirectMessageResponse>> getMessages(
            @PathVariable Long conversationId, @PageableDefault(size = 30) Pageable pageable) {
        return ApiResponse.success(directMessageService.getMessages(conversationId, pageable));
    }

    @PostMapping("/{conversationId}/messages")
    public ApiResponse<DirectMessageResponse> sendMessage(
            @PathVariable Long conversationId, @Valid @RequestBody SendDirectMessageRequest request) {
        return ApiResponse.success(directMessageService.sendMessage(conversationId, request));
    }

    @PutMapping("/{conversationId}/messages/{messageId}/reaction")
    public ApiResponse<DirectMessageResponse> setReaction(
            @PathVariable Long conversationId, @PathVariable Long messageId,
            @Valid @RequestBody SetDirectMessageReactionRequest request) {
        return ApiResponse.success(directMessageService.setReaction(
                conversationId, messageId, request.getReactionType()));
    }

    @DeleteMapping("/{conversationId}/messages/{messageId}/reaction")
    public ApiResponse<DirectMessageResponse> removeReaction(
            @PathVariable Long conversationId, @PathVariable Long messageId) {
        return ApiResponse.success(directMessageService.removeReaction(conversationId, messageId));
    }

    @PostMapping(value = "/{conversationId}/messages/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DirectMessageResponse> sendMediaMessage(
            @PathVariable Long conversationId,
            @Valid @ModelAttribute SendMediaMessageRequest request) throws IOException {
        directMessageService.assertCanSendMessage(conversationId, request.getReplyToMessageId());
        String mediaUrl = request.getMediaType() == com.minisocial.entity.DirectMessage.MediaType.IMAGE
                ? fileStorageService.uploadFile(request.getFile(), "messages")
                : fileStorageService.uploadVideoFile(request.getFile(), "messages");
        return ApiResponse.success(directMessageService.sendMediaMessage(conversationId,
                request.getContent(), mediaUrl, request.getMediaType(), request.getReplyToMessageId()));
    }

    @PutMapping("/{conversationId}/read")
    public ApiResponse<Void> markRead(@PathVariable Long conversationId) {
        directMessageService.markRead(conversationId);
        return ApiResponse.success("Đã đánh dấu cuộc trò chuyện đã đọc");
    }

    @DeleteMapping("/{conversationId}")
    public org.springframework.http.ResponseEntity<Void> hideConversation(@PathVariable Long conversationId) {
        directMessageService.hideConversation(conversationId);
        return org.springframework.http.ResponseEntity.noContent().build();
    }

    @PutMapping("/{conversationId}/nickname")
    public ApiResponse<Void> updateNickname(@PathVariable Long conversationId,
                                            @Valid @RequestBody UpdateConversationNicknameRequest request) {
        directMessageService.updateNickname(conversationId, request.getNickname());
        return ApiResponse.success("Đã cập nhật biệt danh cuộc trò chuyện");
    }

    @MessageMapping("/conversations/{conversationId}/messages")
    public void sendOverWebSocket(@DestinationVariable Long conversationId,
                                  @Payload @Valid SendDirectMessageRequest request,
                                  Principal principal) {
        if (!(principal instanceof StompUserPrincipal stompPrincipal)) {
            throw new org.springframework.messaging.MessageDeliveryException("Authentication required");
        }
        directMessageService.sendMessage(conversationId, stompPrincipal, request);
    }

    @MessageMapping("/conversations/{conversationId}/typing")
    public void sendTypingIndicator(@DestinationVariable Long conversationId,
                                    @Payload @Valid TypingIndicatorRequest request,
                                    Principal principal) {
        if (!(principal instanceof StompUserPrincipal stompPrincipal)) {
            throw new org.springframework.messaging.MessageDeliveryException("Authentication required");
        }
        directMessageService.sendTypingIndicator(conversationId, stompPrincipal, request.getTyping());
    }
}
