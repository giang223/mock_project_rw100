package com.minisocial.service;

import com.minisocial.dto.request.CreateStoryRequest;
import com.minisocial.entity.Post;
import com.minisocial.entity.PostMedia;
import com.minisocial.entity.Story;
import com.minisocial.entity.User;
import com.minisocial.exception.AppException;
import com.minisocial.repository.FollowRepository;
import com.minisocial.repository.FriendshipRepository;
import com.minisocial.repository.StoryRepository;
import com.minisocial.repository.StoryViewRepository;
import com.minisocial.repository.UserBlockRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class StoryServiceTest {

    @Mock private StoryRepository storyRepository;
    @Mock private StoryViewRepository storyViewRepository;
    @Mock private FriendshipRepository friendshipRepository;
    @Mock private FollowRepository followRepository;
    @Mock private UserBlockRepository userBlockRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private FileStorageService fileStorageService;

    @InjectMocks private StoryService storyService;

    @Test
    void createsVideoStoryAndReturnsExplicitMediaType() {
        User author = user(4L, false);
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(storyRepository.save(any(Story.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CreateStoryRequest request = new CreateStoryRequest();
        request.setContent("trip");
        request.setMediaUrl("https://cdn.example.com/story.mp4");
        request.setMediaType(Story.MediaType.VIDEO);
        request.setVisibility(Post.Visibility.PUBLIC);

        var response = storyService.createStory(request);

        assertEquals(Story.MediaType.VIDEO, response.getMediaType());
        org.mockito.ArgumentCaptor<Story> story = org.mockito.ArgumentCaptor.forClass(Story.class);
        verify(storyRepository).save(story.capture());
        assertEquals(Story.MediaType.VIDEO, story.getValue().getMediaType());
        assertTrue(story.getValue().getExpiresAt().isAfter(LocalDateTime.now().plusHours(23)));
    }

    @Test
    void rejectsMediaTypeWhenStoryHasNoMediaUrl() {
        CreateStoryRequest request = new CreateStoryRequest();
        request.setContent("text only");
        request.setMediaType(Story.MediaType.VIDEO);

        assertThrows(AppException.class, () -> storyService.createStory(request));
        verify(storyRepository, never()).save(any(Story.class));
    }

    @Test
    void createsMultipartVideoStoryUsingSignatureDetectedMediaType() throws Exception {
        User author = user(4L, false);
        MockMultipartFile file = new MockMultipartFile("file", "clip.mp4", "application/octet-stream",
                new byte[]{0, 0, 0, 20, 'f', 't', 'y', 'p'});
        when(fileStorageService.validatePostMediaFile(file)).thenReturn(PostMedia.MediaType.VIDEO);
        when(fileStorageService.uploadVideoFile(file, "stories")).thenReturn("https://cdn.example.com/story.mp4");
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(storyRepository.save(any(Story.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CreateStoryRequest request = new CreateStoryRequest();
        request.setContent("trip");
        request.setVisibility(Post.Visibility.PUBLIC);

        var response = storyService.createStoryWithMedia(request, file);

        assertEquals(Story.MediaType.VIDEO, response.getMediaType());
        assertEquals("https://cdn.example.com/story.mp4", response.getMediaUrl());
        verify(fileStorageService).uploadVideoFile(file, "stories");
        verify(fileStorageService, never()).uploadFile(any(), any());
    }

    @Test
    void createsMultipartImageStoryUsingSignatureDetectedMediaType() throws Exception {
        User author = user(4L, false);
        MockMultipartFile file = new MockMultipartFile("file", "story.png", "application/octet-stream",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
        when(fileStorageService.validatePostMediaFile(file)).thenReturn(PostMedia.MediaType.IMAGE);
        when(fileStorageService.uploadFile(file, "stories")).thenReturn("https://cdn.example.com/story.png");
        when(securityUtils.getCurrentUser()).thenReturn(author);
        when(storyRepository.save(any(Story.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CreateStoryRequest request = new CreateStoryRequest();
        request.setVisibility(Post.Visibility.FRIENDS);

        var response = storyService.createStoryWithMedia(request, file);

        assertEquals(Story.MediaType.IMAGE, response.getMediaType());
        assertEquals("https://cdn.example.com/story.png", response.getMediaUrl());
        verify(fileStorageService).uploadFile(file, "stories");
        verify(fileStorageService, never()).uploadVideoFile(any(), any());
    }

    @Test
    void rejectsMultipartStoryWhenFileTypeConflictsWithClientHint() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4",
                new byte[]{0, 0, 0, 20, 'f', 't', 'y', 'p'});
        when(fileStorageService.validatePostMediaFile(file)).thenReturn(PostMedia.MediaType.VIDEO);
        CreateStoryRequest request = new CreateStoryRequest();
        request.setContent("trip");
        request.setMediaType(Story.MediaType.IMAGE);

        assertThrows(AppException.class, () -> storyService.createStoryWithMedia(request, file));

        verify(fileStorageService, never()).uploadVideoFile(any(), any());
        verify(fileStorageService, never()).uploadFile(any(), any());
        verify(storyRepository, never()).save(any(Story.class));
    }

    @Test
    void rejectsStoryRequestContainingBothUrlAndFileBeforeUploading() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "story.png", "image/png", new byte[]{1});
        CreateStoryRequest request = new CreateStoryRequest();
        request.setContent("trip");
        request.setMediaUrl("https://cdn.example.com/existing.png");

        assertThrows(AppException.class, () -> storyService.createStoryWithMedia(request, file));

        verifyNoInteractions(fileStorageService);
        verify(storyRepository, never()).save(any(Story.class));
    }

    @Test
    void privateAccountStoryCannotBeViewedBeforeFollowRequestIsAccepted() {
        User viewer = user(1L, false);
        User author = user(2L, true);
        Story story = Story.builder().id(10L).author(author).content("private")
                .visibility(Post.Visibility.PUBLIC).expiresAt(LocalDateTime.now().plusHours(1))
                .isDeleted(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(viewer);
        when(storyRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(story));

        assertThrows(AppException.class, () -> storyService.recordView(10L));
        verify(storyViewRepository, never()).insertIfAbsent(anyLong(), anyLong(), any());
    }

    @Test
    void acceptedFollowerCanRecordOnlyOneStoryView() {
        User viewer = user(1L, false);
        User author = user(2L, true);
        Story story = Story.builder().id(10L).author(author).content("private")
                .visibility(Post.Visibility.PUBLIC).expiresAt(LocalDateTime.now().plusHours(1))
                .isDeleted(false).build();
        when(securityUtils.getCurrentUser()).thenReturn(viewer);
        when(storyRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(story));
        when(followRepository.hasAcceptedFollow(1L, 2L)).thenReturn(true);
        when(storyViewRepository.insertIfAbsent(anyLong(), anyLong(), any())).thenReturn(1, 0);

        assertTrue(storyService.recordView(10L));
        assertFalse(storyService.recordView(10L));
        verify(storyViewRepository, org.mockito.Mockito.times(2)).insertIfAbsent(anyLong(), anyLong(), any());
    }

    private User user(Long id, boolean isPrivate) {
        return User.builder().id(id).fullName("User " + id).email("user" + id + "@example.com")
                .isActive(true).isEmailVerified(true).isPrivate(isPrivate).build();
    }
}
