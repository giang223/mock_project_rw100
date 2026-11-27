package com.minisocial.service;

import com.minisocial.dto.request.CreateStoryRequest;
import com.minisocial.dto.response.StoryResponse;
import com.minisocial.dto.response.UserSummaryResponse;
import com.minisocial.entity.Friendship;
import com.minisocial.entity.Post;
import com.minisocial.entity.PostMedia;
import com.minisocial.entity.Story;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.FriendshipRepository;
import com.minisocial.repository.FollowRepository;
import com.minisocial.repository.StoryRepository;
import com.minisocial.repository.StoryViewRepository;
import com.minisocial.repository.UserBlockRepository;
import com.minisocial.util.SecurityUtils;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.io.IOException;
import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryService {

    private static final int STORY_LIFETIME_HOURS = 24;

    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final FriendshipRepository friendshipRepository;
    private final FollowRepository followRepository;
    private final UserBlockRepository userBlockRepository;
    private final SecurityUtils securityUtils;
    private final FileStorageService fileStorageService;

    @Transactional
    public StoryResponse createStory(CreateStoryRequest request) {
        return saveStory(request, request.getMediaUrl(), request.getMediaType());
    }

    @Transactional
    public StoryResponse createStoryWithMedia(CreateStoryRequest request, MultipartFile file) throws IOException {
        if (file == null) {
            return saveStory(request, request.getMediaUrl(), request.getMediaType());
        }
        if (request.getMediaUrl() != null && !request.getMediaUrl().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Không thể gửi đồng thời file và media URL cho Story");
        }

        Story.MediaType detectedMediaType = fileStorageService.validatePostMediaFile(file) == PostMedia.MediaType.IMAGE
                ? Story.MediaType.IMAGE : Story.MediaType.VIDEO;
        if (request.getMediaType() != null && request.getMediaType() != detectedMediaType) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Loại media của Story không khớp với file đã tải lên");
        }
        String mediaUrl = detectedMediaType == Story.MediaType.IMAGE
                ? fileStorageService.uploadFile(file, "stories")
                : fileStorageService.uploadVideoFile(file, "stories");
        return saveStory(request, mediaUrl, detectedMediaType);
    }

    private StoryResponse saveStory(CreateStoryRequest request, String requestedMediaUrl,
                                    Story.MediaType requestedMediaType) {
        String content = request.getContent() == null || request.getContent().isBlank()
                ? null : request.getContent().trim();
        String mediaUrl = requestedMediaUrl == null || requestedMediaUrl.isBlank()
                ? null : requestedMediaUrl.trim();
        Story.MediaType mediaType = mediaUrl == null ? null
                : requestedMediaType == null ? Story.MediaType.IMAGE : requestedMediaType;
        if (content == null && mediaUrl == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Story phải có nội dung hoặc media");
        }
        if (mediaUrl == null && requestedMediaType != null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Loại media chỉ hợp lệ khi có media URL");
        }

        LocalDateTime now = LocalDateTime.now();
        Story story = Story.builder()
                .author(securityUtils.getCurrentUser())
                .content(content)
                .mediaUrl(mediaUrl)
                .mediaType(mediaType)
                .visibility(request.getVisibility())
                .expiresAt(now.plusHours(STORY_LIFETIME_HOURS))
                .isDeleted(false)
                .build();
        storyRepository.save(story);
        return toResponse(story, 0);
    }

    @Transactional(readOnly = true)
    public Page<StoryResponse> getActiveStories(Long authorId, Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Page<Story> stories = storyRepository.findVisibleToUser(authorId, currentUserId,
                Post.Visibility.PUBLIC, Post.Visibility.FRIENDS, Friendship.Status.ACCEPTED,
                LocalDateTime.now(), pageable);
        Collection<Long> storyIds = stories.getContent().stream().map(Story::getId).toList();
        Map<Long, Long> viewCounts = storyIds.isEmpty() ? Map.of()
                : storyViewRepository.findViewCounts(storyIds).stream()
                    .collect(Collectors.toMap(
                            StoryViewRepository.StoryViewCount::getStoryId,
                            StoryViewRepository.StoryViewCount::getViewCount));
        return stories.map(story -> toResponse(story, viewCounts.getOrDefault(story.getId(), 0L)));
    }

    @Transactional
    public boolean recordView(Long storyId) {
        User viewer = securityUtils.getCurrentUser();
        Story story = storyRepository.findByIdAndIsDeletedFalse(storyId)
                .filter(item -> item.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Story không tồn tại hoặc đã hết hạn"));
        ensureVisibleTo(story, viewer.getId());
        if (story.getAuthor().getId().equals(viewer.getId())) {
            return false;
        }
        return storyViewRepository.insertIfAbsent(storyId, viewer.getId(), LocalDateTime.now()) > 0;
    }

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> getStoryViewers(Long storyId, Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Story story = storyRepository.findByIdAndIsDeletedFalse(storyId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Story không tồn tại"));
        if (!story.getAuthor().getId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ chủ Story mới được xem danh sách lượt xem");
        }
        return storyViewRepository.findViewers(storyId, pageable)
                .map(StoryService::toUserSummary);
    }

    @Transactional
    public void deleteStory(Long storyId) {
        User currentUser = securityUtils.getCurrentUser();
        Story story = storyRepository.findByIdAndIsDeletedFalse(storyId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Story không tồn tại"));
        if (!story.getAuthor().getId().equals(currentUser.getId()) && currentUser.getRole() != User.Role.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa Story này");
        }
        story.setIsDeleted(true);
    }

    private void ensureVisibleTo(Story story, Long userId) {
        Long authorId = story.getAuthor().getId();
        if (!Boolean.TRUE.equals(story.getAuthor().getIsActive())
                || !Boolean.TRUE.equals(story.getAuthor().getIsEmailVerified())
                || (userBlockRepository.existsByBlockerIdAndBlockedId(userId, authorId)
                    || userBlockRepository.existsByBlockerIdAndBlockedId(authorId, userId))) {
            throw new AppException(HttpStatus.NOT_FOUND, "Story không tồn tại");
        }
        if (authorId.equals(userId)) {
            return;
        }
        if (Boolean.TRUE.equals(story.getAuthor().getIsPrivate())
                && !followRepository.hasAcceptedFollow(userId, authorId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Story không tồn tại");
        }
        boolean visible = switch (story.getVisibility()) {
            case PUBLIC -> true;
            case FRIENDS -> friendshipRepository.existsFriendshipBetween(
                    userId, authorId, Friendship.Status.ACCEPTED);
            case PRIVATE -> false;
        };
        if (!visible) {
            throw new AppException(HttpStatus.NOT_FOUND, "Story không tồn tại");
        }
    }

    private StoryResponse toResponse(Story story, long viewCount) {
        return StoryResponse.builder()
                .id(story.getId())
                .author(toUserSummary(story.getAuthor()))
                .content(story.getContent())
                .mediaUrl(story.getMediaUrl())
                .mediaType(story.getMediaType())
                .visibility(story.getVisibility())
                .expiresAt(story.getExpiresAt())
                .viewCount(viewCount)
                .createdAt(story.getCreatedAt())
                .build();
    }

    private static UserSummaryResponse toUserSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}
