package com.minisocial.service;

import com.minisocial.dto.request.CreatePostRequest;
import com.minisocial.dto.response.PostResponse;
import com.minisocial.entity.Hashtag;
import com.minisocial.entity.Notification;
import com.minisocial.entity.Post;
import com.minisocial.entity.PostMention;
import com.minisocial.entity.PostLike;
import com.minisocial.entity.User;
import com.minisocial.repository.*;
import com.minisocial.repository.FollowRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class PostServiceHashtagTest {

    @Mock private PostRepository postRepository;
    @Mock private PostLikeRepository postLikeRepository;
    @Mock private PostSaveRepository postSaveRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private FriendshipRepository friendshipRepository;
    @Mock private FollowRepository followRepository;
    @Mock private UserBlockRepository userBlockRepository;
    @Mock private UserRepository userRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private NotificationService notificationService;
    @Mock private HashtagRepository hashtagRepository;
    @Mock private PostHashtagRepository postHashtagRepository;
    @Mock private PostMentionRepository postMentionRepository;
    @Mock private PostMediaRepository postMediaRepository;

    @InjectMocks private PostService postService;

    @Test
    void postTagsAreUnicodeNormalizedAndDuplicatesAreStoredOnce() {
        User author = User.builder().id(42L).fullName("Author").email("author@example.com")
                .isActive(true).isEmailVerified(true).build();
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> {
            Post post = invocation.getArgument(0);
            post.setId(100L);
            return post;
        });
        AtomicLong ids = new AtomicLong(1);
        when(hashtagRepository.insertIfAbsent(anyString(), any())).thenReturn(1);
        when(hashtagRepository.findByName(anyString())).thenAnswer(invocation -> Optional.of(
                Hashtag.builder().id(ids.getAndIncrement()).name(invocation.getArgument(0)).build()));
        when(postSaveRepository.existsByPostIdAndUserId(anyLong(), anyLong())).thenReturn(false);
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);

        CreatePostRequest request = new CreatePostRequest();
        request.setContent("#Hello #hello #Café #cafe\u0301 #你好");
        request.setFeeling("  Happy 😊  ");
        request.setVisibility(Post.Visibility.PUBLIC);

        PostResponse response = postService.createPost(request);

        assertEquals("Happy 😊", response.getFeeling());
        verify(hashtagRepository).insertIfAbsent(eq("hello"), any());
        verify(hashtagRepository).insertIfAbsent(eq("café"), any());
        verify(hashtagRepository).insertIfAbsent(eq("你好"), any());
        verify(hashtagRepository, org.mockito.Mockito.times(3)).insertIfAbsent(anyString(), any());
        verify(postHashtagRepository, org.mockito.Mockito.times(3)).insertIfAbsent(eq(100L), anyLong(), any());
    }

    @Test
    void postMentionsResolveActiveUsersOnceAndNotifyOnlyResolvedTargets() {
        User author = User.builder().id(42L).fullName("Author").username("author")
                .isActive(true).isEmailVerified(true).build();
        User mentioned = User.builder().id(43L).fullName("Mentioned").username("target")
                .isActive(true).isEmailVerified(true).build();
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> {
            Post post = invocation.getArgument(0);
            post.setId(100L);
            return post;
        });
        when(postMentionRepository.findByPostId(100L)).thenReturn(List.of());
        when(userRepository.findByUsernameInAndIsActiveTrueAndIsEmailVerifiedTrue(any()))
                .thenReturn(List.of(mentioned));
        when(postSaveRepository.existsByPostIdAndUserId(anyLong(), anyLong())).thenReturn(false);
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);

        CreatePostRequest request = new CreatePostRequest();
        request.setContent("Hi @Target, again @target! Unknown @missing and malformed @ab!");
        request.setVisibility(Post.Visibility.PUBLIC);

        postService.createPost(request);

        verify(userRepository).findByUsernameInAndIsActiveTrueAndIsEmailVerifiedTrue(
                org.mockito.ArgumentMatchers.argThat(names -> names.equals(java.util.Set.of("target", "missing"))));
        verify(postMentionRepository).insertIfAbsent(eq(100L), eq(43L), any());
        verify(notificationService).createNotification(eq(mentioned), eq(author), eq(Notification.Type.MENTION),
                org.mockito.ArgumentMatchers.any(Post.class), org.mockito.ArgumentMatchers.contains("đã nhắc đến bạn"));
    }

    @Test
    void editingPostDoesNotNotifyUsersWhoWereAlreadyMentioned() {
        User author = User.builder().id(42L).fullName("Author").isActive(true).isEmailVerified(true).build();
        User mentioned = User.builder().id(43L).fullName("Mentioned").username("target")
                .isActive(true).isEmailVerified(true).build();
        Post post = Post.builder().id(100L).author(author).content("before @target")
                .visibility(Post.Visibility.PUBLIC).isDeleted(false).isEdited(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(postRepository.findByIdAndIsDeletedFalse(100L)).thenReturn(Optional.of(post));
        when(postMentionRepository.findByPostId(100L)).thenReturn(List.of(
                PostMention.builder().user(mentioned).build()));
        when(userRepository.findByUsernameInAndIsActiveTrueAndIsEmailVerifiedTrue(any()))
                .thenReturn(List.of(mentioned));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(postSaveRepository.existsByPostIdAndUserId(100L, 42L)).thenReturn(false);
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);
        when(postHashtagRepository.findNamesByPostId(100L)).thenReturn(List.of());
        when(postMentionRepository.findMentionedUsersByPostId(100L)).thenReturn(List.of(mentioned));

        PostResponse response = postService.updatePost(100L, "after @target", null);

        assertEquals(1, response.getMentions().size());
        verify(postMentionRepository).deleteByPostId(100L);
        verify(postMentionRepository).insertIfAbsent(eq(100L), eq(43L), any());
        org.mockito.Mockito.verifyNoInteractions(notificationService);
    }

    @Test
    void publicPostOnPrivateProfileRequiresAnAcceptedFollow() {
        User privateAuthor = User.builder().id(8L).fullName("Private Author")
                .isActive(true).isEmailVerified(true).isPrivate(true).build();
        Post post = Post.builder().id(15L).author(privateAuthor).content("public visibility")
                .visibility(Post.Visibility.PUBLIC).isDeleted(false).build();
        when(followRepository.hasAcceptedFollow(3L, 8L)).thenReturn(false, true);

        assertFalse(postService.canViewPost(post, 3L));
        assertTrue(postService.canViewPost(post, 3L));
    }

    @Test
    void changingPostContentMarksItEdited() {
        User author = User.builder().id(42L).fullName("Author").isActive(true).isEmailVerified(true).build();
        Post post = Post.builder().id(100L).author(author).content("before")
                .visibility(Post.Visibility.PUBLIC).isDeleted(false).isEdited(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(postRepository.findByIdAndIsDeletedFalse(100L)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(postSaveRepository.existsByPostIdAndUserId(100L, 42L)).thenReturn(false);
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);
        when(postHashtagRepository.findNamesByPostId(100L)).thenReturn(List.of());

        PostResponse response = postService.updatePost(100L, "after", null);

        assertTrue(response.getIsEdited());
        assertTrue(post.getIsEdited());
        assertEquals("after", response.getContent());
    }

    @Test
    void unchangedPostContentDoesNotMarkPostEdited() {
        User author = User.builder().id(42L).fullName("Author").isActive(true).isEmailVerified(true).build();
        Post post = Post.builder().id(100L).author(author).content("same")
                .visibility(Post.Visibility.PUBLIC).isDeleted(false).isEdited(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(postRepository.findByIdAndIsDeletedFalse(100L)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(postSaveRepository.existsByPostIdAndUserId(100L, 42L)).thenReturn(false);
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);
        when(postHashtagRepository.findNamesByPostId(100L)).thenReturn(List.of());

        PostResponse response = postService.updatePost(100L, "same", null);

        assertFalse(response.getIsEdited());
        assertFalse(post.getIsEdited());
    }

    @Test
    void updatingPostFeelingTrimsItAndMarksThePostEdited() {
        User author = User.builder().id(42L).fullName("Author").isActive(true).isEmailVerified(true).build();
        Post post = Post.builder().id(100L).author(author).content("today")
                .feeling("Calm").visibility(Post.Visibility.PUBLIC).isDeleted(false).isEdited(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(postRepository.findByIdAndIsDeletedFalse(100L)).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(postSaveRepository.existsByPostIdAndUserId(100L, 42L)).thenReturn(false);
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);
        when(postHashtagRepository.findNamesByPostId(100L)).thenReturn(List.of());
        when(postMentionRepository.findMentionedUsersByPostId(100L)).thenReturn(List.of());

        PostResponse response = postService.updatePost(100L, null, null, "  Happy 😊  ");

        assertEquals("Happy 😊", response.getFeeling());
        assertTrue(response.getIsEdited());
        assertTrue(post.getIsEdited());
    }

    @Test
    void settingPostReactionCreatesUniqueReactionAndNotifiesPostAuthor() {
        User actor = User.builder().id(42L).fullName("Actor").isActive(true).isEmailVerified(true).build();
        User author = User.builder().id(7L).fullName("Author").isActive(true).isEmailVerified(true).build();
        Post post = Post.builder().id(100L).author(author).content("hello")
                .visibility(Post.Visibility.PUBLIC).isDeleted(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(actor);
        when(postRepository.findByIdAndIsDeletedFalse(100L)).thenReturn(Optional.of(post));
        when(postLikeRepository.insertIfAbsent(eq(100L), eq(42L), eq("LOVE"), any())).thenReturn(1);
        PostLikeRepository.ReactionSummaryProjection loveSummary =
                reactionSummary(PostLike.ReactionType.LOVE, 1L, 1L);
        when(postLikeRepository.findReactionSummaryByPostId(100L, 42L)).thenReturn(List.of(loveSummary));
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);
        when(postHashtagRepository.findNamesByPostId(100L)).thenReturn(List.of());
        when(postMentionRepository.findMentionedUsersByPostId(100L)).thenReturn(List.of());

        PostResponse response = postService.setReaction(100L, PostLike.ReactionType.LOVE);

        assertEquals("LOVE", response.getCurrentUserReaction());
        assertEquals(1L, response.getLikeCount());
        assertEquals(1L, response.getReactionCounts().get("LOVE"));
        verify(postLikeRepository, never()).updateReactionType(anyLong(), anyLong(), anyString());
        verify(notificationService).createNotification(eq(author), eq(actor), eq(Notification.Type.LIKE),
                eq(post), org.mockito.ArgumentMatchers.contains("đã bày tỏ cảm xúc"));
    }

    @Test
    void changingExistingPostReactionDoesNotCreateDuplicateNotification() {
        User actor = User.builder().id(42L).fullName("Actor").isActive(true).isEmailVerified(true).build();
        User author = User.builder().id(7L).fullName("Author").isActive(true).isEmailVerified(true).build();
        Post post = Post.builder().id(100L).author(author).content("hello")
                .visibility(Post.Visibility.PUBLIC).isDeleted(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(actor);
        when(postRepository.findByIdAndIsDeletedFalse(100L)).thenReturn(Optional.of(post));
        when(postLikeRepository.insertIfAbsent(eq(100L), eq(42L), eq("SAD"), any())).thenReturn(0);
        when(postLikeRepository.updateReactionType(100L, 42L, "SAD")).thenReturn(1);

        postService.setReaction(100L, PostLike.ReactionType.SAD);

        verify(postLikeRepository).updateReactionType(100L, 42L, "SAD");
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), anyString());
    }

    @Test
    void removingPostReactionDeletesTheCurrentUsersReaction() {
        User actor = User.builder().id(42L).fullName("Actor").isActive(true).isEmailVerified(true).build();
        Post post = Post.builder().id(100L).author(actor).content("hello")
                .visibility(Post.Visibility.PUBLIC).isDeleted(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(actor);
        when(postRepository.findByIdAndIsDeletedFalse(100L)).thenReturn(Optional.of(post));
        when(postLikeRepository.deleteByPostIdAndUserId(100L, 42L)).thenReturn(1L);
        when(postRepository.countCommentsByPostId(100L)).thenReturn(0L);
        when(postHashtagRepository.findNamesByPostId(100L)).thenReturn(List.of());
        when(postMentionRepository.findMentionedUsersByPostId(100L)).thenReturn(List.of());

        PostResponse response = postService.removeReaction(100L);

        assertEquals(0L, response.getLikeCount());
        assertNull(response.getCurrentUserReaction());
        verify(postLikeRepository).deleteByPostIdAndUserId(100L, 42L);
    }

    private PostLikeRepository.ReactionSummaryProjection reactionSummary(
            PostLike.ReactionType type, Long count, Long currentUserCount) {
        PostLikeRepository.ReactionSummaryProjection projection =
                org.mockito.Mockito.mock(PostLikeRepository.ReactionSummaryProjection.class);
        when(projection.getReactionType()).thenReturn(type);
        when(projection.getReactionCount()).thenReturn(count);
        when(projection.getCurrentUserCount()).thenReturn(currentUserCount);
        return projection;
    }
}
