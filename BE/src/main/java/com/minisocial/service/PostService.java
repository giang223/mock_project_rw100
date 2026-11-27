package com.minisocial.service;

import com.minisocial.dto.request.CreatePostRequest;
import com.minisocial.dto.request.ReportPostRequest;
import com.minisocial.entity.Friendship;
import com.minisocial.dto.response.PostResponse;
import com.minisocial.dto.response.PostMediaResponse;
import com.minisocial.dto.response.PostSummaryResponse;
import com.minisocial.dto.response.UserSummaryResponse;
import com.minisocial.entity.*;
import com.minisocial.exception.AppException;
import com.minisocial.repository.*;
import com.minisocial.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final Pattern HASHTAG_PATTERN = Pattern.compile("#([\\p{L}\\p{M}\\p{N}_]{1,50})");
    private static final Pattern MENTION_PATTERN = Pattern.compile("(?<![A-Za-z0-9._])@([A-Za-z0-9._]{3,50})(?![A-Za-z0-9._])");
    private static final int MAX_HASHTAGS_PER_POST = 30;
    private static final int MAX_MENTIONS_PER_POST = 20;

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostSaveRepository postSaveRepository;
    private final ReportRepository reportRepository;
    private final FriendshipRepository friendshipRepository;
    private final FollowRepository followRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;
    private final HashtagRepository hashtagRepository;
    private final PostHashtagRepository postHashtagRepository;
    private final PostMentionRepository postMentionRepository;
    private final PostMediaRepository postMediaRepository;

    @Transactional(readOnly = true)
    public Page<PostResponse> getFeed(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return postRepository.findFeedVisibleToUser(currentUserId,
                        Post.Visibility.PUBLIC, Post.Visibility.FRIENDS, Friendship.Status.ACCEPTED, pageable)
                .map(post -> mapToPostResponse(post, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getUserPosts(Long authorId, Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        User author = userRepository.findById(authorId)
                .filter(user -> Boolean.TRUE.equals(user.getIsActive())
                        && Boolean.TRUE.equals(user.getIsEmailVerified()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại"));
        if (!authorId.equals(currentUserId)
                && (userBlockRepository.existsByBlockerIdAndBlockedId(currentUserId, authorId)
                || userBlockRepository.existsByBlockerIdAndBlockedId(authorId, currentUserId))) {
            throw new AppException(HttpStatus.NOT_FOUND, "Người dùng không tồn tại");
        }

        return postRepository.findVisibleByAuthorId(author.getId(), currentUserId,
                        Post.Visibility.PUBLIC, Post.Visibility.FRIENDS, Friendship.Status.ACCEPTED, pageable)
                .map(post -> mapToPostResponse(post, currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getPostsByHashtag(String hashtag, Pageable pageable) {
        String normalized = normalizeHashtag(hashtag);
        Long currentUserId = securityUtils.getCurrentUserId();
        return postRepository.findVisibleByHashtag(normalized, currentUserId,
                        Post.Visibility.PUBLIC, Post.Visibility.FRIENDS, Friendship.Status.ACCEPTED, pageable)
                .map(post -> mapToPostResponse(post, currentUserId));
    }

    @Transactional
    public PostResponse createPost(CreatePostRequest request) {
        List<UploadedPostMedia> media = request.getImageUrl() == null || request.getImageUrl().isBlank()
                ? List.of()
                : List.of(new UploadedPostMedia(request.getImageUrl().trim(), PostMedia.MediaType.IMAGE));
        return createPostInternal(request, media);
    }

    @Transactional
    public PostResponse createPostWithMedia(CreatePostRequest request, List<UploadedPostMedia> media) {
        return createPostInternal(request, media);
    }

    @Transactional(readOnly = true)
    public void validatePostMediaContent(String content) {
        securityUtils.getCurrentUser();
        if (content != null && content.length() > 5000) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Nội dung tối đa 5000 ký tự");
        }
        if (extractHashtags(content).size() > MAX_HASHTAGS_PER_POST) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Bài viết chỉ được chứa tối đa " + MAX_HASHTAGS_PER_POST + " hashtag khác nhau");
        }
        if (extractMentions(content).size() > MAX_MENTIONS_PER_POST) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Bài viết chỉ được nhắc đến tối đa " + MAX_MENTIONS_PER_POST + " người dùng");
        }
    }

    private PostResponse createPostInternal(CreatePostRequest request, List<UploadedPostMedia> media) {
        if (media.size() > 4 || media.stream().filter(item -> item.mediaType() == PostMedia.MediaType.VIDEO).count() > 1
                || media.stream().anyMatch(item -> item.mediaUrl() == null || item.mediaUrl().isBlank()
                || item.mediaUrl().length() > 500 || item.mediaType() == null)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Danh sách media bài viết không hợp lệ");
        }
        if ((request.getContent() == null || request.getContent().isBlank())
                && media.isEmpty() && request.getSharedFromPostId() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Bài viết phải có nội dung, hình ảnh/video hoặc bài chia sẻ");
        }

        User author = securityUtils.getCurrentUser();
        Post sharedFromPost = null;

        if (request.getSharedFromPostId() != null) {
            sharedFromPost = postRepository.findByIdAndIsDeletedFalse(request.getSharedFromPostId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết gốc không tồn tại"));
            ensureVisibleTo(sharedFromPost, author.getId());
        }

        Post.Visibility visibility = request.getVisibility() == null
                ? Post.Visibility.PUBLIC : request.getVisibility();
        if (sharedFromPost != null
                && visibilityRank(visibility) < visibilityRank(sharedFromPost.getVisibility())) {
            visibility = sharedFromPost.getVisibility();
        }

        Post post = Post.builder()
                .author(author)
                .content(request.getContent() != null ? request.getContent().trim() : null)
                .feeling(normalizeFeeling(request.getFeeling()))
                .imageUrl(media.stream().filter(item -> item.mediaType() == PostMedia.MediaType.IMAGE)
                        .map(UploadedPostMedia::mediaUrl).findFirst().orElse(null))
                .visibility(visibility)
                .isShared(sharedFromPost != null)
                .sharedFromPost(sharedFromPost)
                .isDeleted(false)
                .build();

        postRepository.save(post);
        persistMedia(post, media);
        syncHashtags(post, post.getContent());
        syncMentions(post, post.getContent());

        // Notify post owner if sharing their post
        if (sharedFromPost != null && !sharedFromPost.getAuthor().getId().equals(author.getId())) {
            notificationService.createNotification(
                    sharedFromPost.getAuthor(), author,
                    Notification.Type.SHARE, post, author.getFullName() + " đã chia sẻ bài viết của bạn");
        }

        return mapToPostResponse(post, author.getId());
    }

    @Transactional
    public PostResponse updatePost(Long postId, String content, Post.Visibility visibility) {
        return updatePost(postId, content, visibility, null);
    }

    @Transactional
    public PostResponse updatePost(Long postId, String content, Post.Visibility visibility, String feeling) {
        User currentUser = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUser.getId());

        if (!post.getAuthor().getId().equals(currentUser.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bài viết này");
        }

        if (content == null && visibility == null && feeling == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không có dữ liệu cập nhật");
        }

        if (content != null && content.isBlank()) {
            if (post.getImageUrl() == null && !post.getIsShared()
                    && !postMediaRepository.existsByPostId(postId)) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Nội dung bài viết không được để trống");
            }
        }

        boolean changed = false;
        if (content != null) {
            String updatedContent = content.isBlank() ? null : content.trim();
            changed |= !Objects.equals(post.getContent(), updatedContent);
            post.setContent(updatedContent);
            syncHashtags(post, post.getContent());
            syncMentions(post, post.getContent());
        }
        if (visibility != null) {
            changed |= post.getVisibility() != visibility;
            post.setVisibility(visibility);
        }
        if (feeling != null) {
            String updatedFeeling = normalizeFeeling(feeling);
            changed |= !Objects.equals(post.getFeeling(), updatedFeeling);
            post.setFeeling(updatedFeeling);
        }
        if (changed) post.setIsEdited(true);
        postRepository.save(post);
        return mapToPostResponse(post, currentUser.getId());
    }

    @Transactional
    public void deletePost(Long postId) {
        User currentUser = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUser.getId());

        if (!post.getAuthor().getId().equals(currentUser.getId())
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa bài viết này");
        }

        post.setIsDeleted(true);
        postRepository.save(post);
    }

    @Transactional
    public boolean toggleLike(Long postId) {
        User currentUser = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUser.getId());

        if (postLikeRepository.deleteByPostIdAndUserId(postId, currentUser.getId()) > 0) {
            return false;
        }
        boolean created = persistReaction(post, currentUser, PostLike.ReactionType.LIKE);
        if (created) notifyPostReaction(post, currentUser, PostLike.ReactionType.LIKE);
        return true;
    }

    @Transactional
    public boolean setLike(Long postId, boolean liked) {
        User currentUser = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUser.getId());

        if (!liked) {
            postLikeRepository.deleteByPostIdAndUserId(postId, currentUser.getId());
            return false;
        }
        boolean created = persistReaction(post, currentUser, PostLike.ReactionType.LIKE);
        if (created) notifyPostReaction(post, currentUser, PostLike.ReactionType.LIKE);
        return true;
    }

    @Transactional
    public PostResponse setReaction(Long postId, PostLike.ReactionType reactionType) {
        if (reactionType == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Cảm xúc không hợp lệ");
        }
        User currentUser = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUser.getId());

        boolean created = persistReaction(post, currentUser, reactionType);
        if (created) notifyPostReaction(post, currentUser, reactionType);
        return mapToPostResponse(post, currentUser.getId());
    }

    @Transactional
    public PostResponse removeReaction(Long postId) {
        User currentUser = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUser.getId());
        postLikeRepository.deleteByPostIdAndUserId(postId, currentUser.getId());
        return mapToPostResponse(post, currentUser.getId());
    }

    private boolean persistReaction(Post post, User currentUser, PostLike.ReactionType reactionType) {
        int inserted = postLikeRepository.insertIfAbsent(post.getId(), currentUser.getId(), reactionType.name(),
                LocalDateTime.now());
        if (inserted == 0) {
            postLikeRepository.updateReactionType(post.getId(), currentUser.getId(), reactionType.name());
            return false;
        }
        return true;
    }

    private void notifyPostReaction(Post post, User currentUser, PostLike.ReactionType reactionType) {
        if (post.getAuthor().getId().equals(currentUser.getId())) return;
        String activity = reactionType == PostLike.ReactionType.LIKE
                ? " đã thích bài viết của bạn" : " đã bày tỏ cảm xúc về bài viết của bạn";
        notificationService.createNotification(post.getAuthor(), currentUser, Notification.Type.LIKE,
                post, currentUser.getFullName() + activity);
    }

    @Transactional
    public boolean toggleSave(Long postId) {
        User currentUser = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUser.getId());

        boolean alreadySaved = postSaveRepository.existsByPostIdAndUserId(postId, currentUser.getId());

        if (alreadySaved) {
            postSaveRepository.findByPostIdAndUserId(postId, currentUser.getId())
                    .ifPresent(postSaveRepository::delete);
            return false;
        } else {
            PostSave save = PostSave.builder().post(post).user(currentUser).build();
            postSaveRepository.save(save);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public Page<PostResponse> getSavedPosts(Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        return postSaveRepository.findVisibleByUserId(currentUserId,
                        Post.Visibility.PUBLIC, Post.Visibility.FRIENDS, Friendship.Status.ACCEPTED, pageable)
                .map(save -> mapToPostResponse(save.getPost(), currentUserId));
    }

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> getPostLikes(Long postId, Pageable pageable) {
        Long currentUserId = securityUtils.getCurrentUserId();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, currentUserId);
        return postLikeRepository.findUsersByPostId(postId, pageable)
                .map(PostService::mapToUserSummary);
    }

    @Transactional
    public void reportPost(Long postId, ReportPostRequest request) {
        User reporter = securityUtils.getCurrentUser();
        Post post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại"));
        ensureVisibleTo(post, reporter.getId());

        if (reportRepository.existsByPostIdAndReporterId(postId, reporter.getId())) {
            throw new AppException(HttpStatus.CONFLICT, "Bạn đã báo cáo bài viết này rồi");
        }

        Report report = Report.builder()
                .post(post)
                .reporter(reporter)
                .reason(request.getReason().trim())
                .status(Report.Status.PENDING)
                .build();
        reportRepository.save(report);
    }

    // ---- Mapper ----
    public PostResponse mapToPostResponse(Post post, Long currentUserId) {
        boolean saved = postSaveRepository.existsByPostIdAndUserId(post.getId(), currentUserId);
        Map<PostLike.ReactionType, Long> reactionCounts = new EnumMap<>(PostLike.ReactionType.class);
        for (PostLike.ReactionType type : PostLike.ReactionType.values()) reactionCounts.put(type, 0L);
        PostLike.ReactionType currentUserReaction = null;
        for (PostLikeRepository.ReactionSummaryProjection summary :
                postLikeRepository.findReactionSummaryByPostId(post.getId(), currentUserId)) {
            reactionCounts.put(summary.getReactionType(), summary.getReactionCount());
            if (summary.getCurrentUserCount() != null && summary.getCurrentUserCount() > 0) {
                currentUserReaction = summary.getReactionType();
            }
        }
        long likeCount = reactionCounts.values().stream().mapToLong(Long::longValue).sum();
        Map<String, Long> responseReactionCounts = new java.util.LinkedHashMap<>();
        reactionCounts.forEach((type, count) -> responseReactionCounts.put(type.name(), count));
        boolean liked = currentUserReaction != null;
        long commentCount = postRepository.countCommentsByPostId(post.getId());

        PostSummaryResponse sharedPostResponse = null;
        if (post.getIsShared() && post.getSharedFromPost() != null) {
            Post original = post.getSharedFromPost();
            if (!userBlockRepository.existsByBlockerIdAndBlockedId(currentUserId, original.getAuthor().getId())
                    && !userBlockRepository.existsByBlockerIdAndBlockedId(original.getAuthor().getId(), currentUserId)
                    && !Boolean.TRUE.equals(original.getIsDeleted())
                    && canViewPost(original, currentUserId)) {
                sharedPostResponse = PostSummaryResponse.builder()
                        .id(original.getId())
                        .author(mapToUserSummary(original.getAuthor()))
                        .content(original.getContent())
                        .feeling(original.getFeeling())
                        .imageUrl(original.getImageUrl())
                        .media(toPostMediaResponses(original))
                        .visibility(original.getVisibility())
                        .isEdited(original.getIsEdited())
                        .createdAt(original.getCreatedAt())
                        .build();
            }
        }

        return PostResponse.builder()
                .id(post.getId())
                .author(mapToUserSummary(post.getAuthor()))
                .content(post.getContent())
                .feeling(post.getFeeling())
                .imageUrl(post.getImageUrl())
                .media(toPostMediaResponses(post))
                .visibility(post.getVisibility())
                .isShared(post.getIsShared())
                .isEdited(post.getIsEdited())
                .sharedFromPost(sharedPostResponse)
                .likeCount(likeCount)
                .reactionCounts(responseReactionCounts)
                .currentUserReaction(currentUserReaction == null ? null : currentUserReaction.name())
                .commentCount(commentCount)
                .liked(liked)
                .saved(saved)
                .hashtags(postHashtagRepository.findNamesByPostId(post.getId()))
                .mentions(postMentionRepository.findMentionedUsersByPostId(post.getId()).stream()
                        .map(PostService::mapToUserSummary).toList())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    private void persistMedia(Post post, List<UploadedPostMedia> media) {
        List<PostMedia> entities = new java.util.ArrayList<>(media.size());
        for (int position = 0; position < media.size(); position++) {
            UploadedPostMedia item = media.get(position);
            entities.add(PostMedia.builder()
                    .post(post)
                    .mediaUrl(item.mediaUrl())
                    .mediaType(item.mediaType())
                    .position(position)
                    .createdAt(LocalDateTime.now())
                    .build());
        }
        if (!entities.isEmpty()) {
            postMediaRepository.saveAll(entities);
        }
    }

    private List<PostMediaResponse> toPostMediaResponses(Post post) {
        List<PostMediaResponse> media = postMediaRepository
                .findByPostIdOrderByPositionAscIdAsc(post.getId()).stream()
                .map(item -> PostMediaResponse.builder()
                        .id(item.getId())
                        .mediaUrl(item.getMediaUrl())
                        .mediaType(item.getMediaType())
                        .position(item.getPosition())
                        .build())
                .toList();
        if (!media.isEmpty() || post.getImageUrl() == null || post.getImageUrl().isBlank()) {
            return media;
        }
        return List.of(PostMediaResponse.builder()
                .mediaUrl(post.getImageUrl())
                .mediaType(PostMedia.MediaType.IMAGE)
                .position(0)
                .build());
    }

    private String normalizeFeeling(String feeling) {
        if (feeling == null || feeling.isBlank()) {
            return null;
        }
        return feeling.trim();
    }

    public static UserSummaryResponse mapToUserSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    public void ensureVisibleTo(Post post, Long userId) {
        if (!canViewPost(post, userId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Bài viết không tồn tại");
        }
    }

    public boolean canViewPost(Post post, Long userId) {
        Long authorId = post.getAuthor().getId();
        if (Boolean.TRUE.equals(post.getIsDeleted())
                || !Boolean.TRUE.equals(post.getAuthor().getIsActive())
                || !Boolean.TRUE.equals(post.getAuthor().getIsEmailVerified())) {
            return false;
        }
        if (authorId.equals(userId)) {
            return true;
        }
        if (userBlockRepository.existsByBlockerIdAndBlockedId(userId, authorId)
                || userBlockRepository.existsByBlockerIdAndBlockedId(authorId, userId)) {
            return false;
        }
        if (Boolean.TRUE.equals(post.getAuthor().getIsPrivate())
                && !followRepository.hasAcceptedFollow(userId, authorId)) {
            return false;
        }
        return switch (post.getVisibility()) {
            case PUBLIC -> true;
            case FRIENDS -> friendshipRepository.existsFriendshipBetween(
                    userId, authorId, Friendship.Status.ACCEPTED);
            case PRIVATE -> false;
        };
    }

    private int visibilityRank(Post.Visibility visibility) {
        return switch (visibility) {
            case PUBLIC -> 0;
            case FRIENDS -> 1;
            case PRIVATE -> 2;
        };
    }

    private void syncHashtags(Post post, String content) {
        Set<String> names = extractHashtags(content);
        if (names.size() > MAX_HASHTAGS_PER_POST) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Bài viết chỉ được chứa tối đa " + MAX_HASHTAGS_PER_POST + " hashtag khác nhau");
        }

        postHashtagRepository.deleteByPostId(post.getId());
        LocalDateTime now = LocalDateTime.now();
        for (String name : names) {
            hashtagRepository.insertIfAbsent(name, now);
            Hashtag hashtag = hashtagRepository.findByName(name)
                    .orElseThrow(() -> new IllegalStateException("Hashtag insert was not visible in transaction"));
            postHashtagRepository.insertIfAbsent(post.getId(), hashtag.getId(), now);
        }
    }

    private void syncMentions(Post post, String content) {
        List<PostMention> existingMentions = postMentionRepository.findByPostId(post.getId());
        Set<Long> previouslyMentionedUserIds = existingMentions.stream()
                .map(mention -> mention.getUser().getId())
                .collect(java.util.stream.Collectors.toSet());
        Set<String> usernames = extractMentions(content);
        if (usernames.size() > MAX_MENTIONS_PER_POST) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Bài viết chỉ được nhắc đến tối đa " + MAX_MENTIONS_PER_POST + " người dùng");
        }

        postMentionRepository.deleteByPostId(post.getId());
        if (usernames.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (User mentionedUser : userRepository.findByUsernameInAndIsActiveTrueAndIsEmailVerifiedTrue(usernames)) {
            if (mentionedUser.getId().equals(post.getAuthor().getId())) {
                continue;
            }
            postMentionRepository.insertIfAbsent(post.getId(), mentionedUser.getId(), now);
            if (!previouslyMentionedUserIds.contains(mentionedUser.getId())
                    && canViewPost(post, mentionedUser.getId())) {
                notificationService.createNotification(mentionedUser, post.getAuthor(),
                        Notification.Type.MENTION, post,
                        post.getAuthor().getFullName() + " đã nhắc đến bạn trong một bài viết");
            }
        }
    }

    private Set<String> extractMentions(String content) {
        Set<String> usernames = new LinkedHashSet<>();
        if (content == null || content.isBlank()) {
            return usernames;
        }
        Matcher matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            usernames.add(matcher.group(1).toLowerCase(Locale.ROOT));
        }
        return usernames;
    }

    private Set<String> extractHashtags(String content) {
        Set<String> names = new LinkedHashSet<>();
        if (content == null || content.isBlank()) {
            return names;
        }
        Matcher matcher = HASHTAG_PATTERN.matcher(Normalizer.normalize(content, Normalizer.Form.NFC));
        while (matcher.find()) {
            names.add(matcher.group(1).toLowerCase(Locale.ROOT));
        }
        return names;
    }

    private String normalizeHashtag(String hashtag) {
        String candidate = hashtag == null ? "" : hashtag.trim();
        if (candidate.startsWith("#")) {
            candidate = candidate.substring(1);
        }
        candidate = Normalizer.normalize(candidate, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        if (!candidate.matches("[\\p{L}\\p{M}\\p{N}_]{1,50}")) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Hashtag không hợp lệ");
        }
        return candidate;
    }
}
