package com.minisocial.service;

import com.minisocial.dto.request.CreatePostMediaRequest;
import com.minisocial.dto.request.CreatePostRequest;
import com.minisocial.dto.response.PostResponse;
import com.minisocial.entity.PostMedia;
import com.minisocial.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostMediaServiceTest {

    @Mock private FileStorageService fileStorageService;
    @Mock private PostService postService;
    @InjectMocks private PostMediaService postMediaService;

    @Test
    void validatesAllFilesAndRejectsMultipleVideosBeforeUploadingAny() throws Exception {
        var first = new MockMultipartFile("files", "first.mp4", "video/mp4", new byte[]{1});
        var second = new MockMultipartFile("files", "second.mp4", "video/mp4", new byte[]{2});
        when(fileStorageService.validatePostMediaFile(any()))
                .thenReturn(PostMedia.MediaType.VIDEO, PostMedia.MediaType.VIDEO);
        CreatePostMediaRequest request = new CreatePostMediaRequest();
        request.setContent("caption");
        request.setFiles(List.of(first, second));

        assertThrows(AppException.class, () -> postMediaService.createPost(request));

        verify(fileStorageService, never()).uploadVideoFile(any(), eq("posts"));
        verify(fileStorageService, never()).uploadFile(any(), eq("posts"));
    }

    @Test
    void storesUploadedMediaInRequestOrder() throws Exception {
        var image = new MockMultipartFile("files", "photo.png", "image/png", new byte[]{1});
        var video = new MockMultipartFile("files", "clip.mp4", "video/mp4", new byte[]{2});
        PostResponse response = PostResponse.builder().id(77L).build();
        when(fileStorageService.validatePostMediaFile(any()))
                .thenReturn(PostMedia.MediaType.IMAGE, PostMedia.MediaType.VIDEO);
        when(fileStorageService.uploadFile(image, "posts")).thenReturn("https://cdn.example/image.png");
        when(fileStorageService.uploadVideoFile(video, "posts")).thenReturn("https://cdn.example/video.mp4");
        AtomicReference<List<UploadedPostMedia>> uploaded = new AtomicReference<>();
        when(postService.createPostWithMedia(any(CreatePostRequest.class), anyList())).thenAnswer(invocation -> {
            uploaded.set(invocation.getArgument(1));
            return response;
        });
        CreatePostMediaRequest request = new CreatePostMediaRequest();
        request.setContent("caption");
        request.setFiles(List.of(image, video));

        PostResponse result = postMediaService.createPost(request);

        assertEquals(response, result);
        verify(postService).createPostWithMedia(any(CreatePostRequest.class), anyList());
        assertEquals(List.of(
                new UploadedPostMedia("https://cdn.example/image.png", PostMedia.MediaType.IMAGE),
                new UploadedPostMedia("https://cdn.example/video.mp4", PostMedia.MediaType.VIDEO)
        ), uploaded.get());
    }
}
