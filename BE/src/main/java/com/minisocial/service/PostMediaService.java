package com.minisocial.service;

import com.minisocial.dto.request.CreatePostMediaRequest;
import com.minisocial.dto.request.CreatePostRequest;
import com.minisocial.dto.response.PostResponse;
import com.minisocial.entity.PostMedia;
import com.minisocial.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PostMediaService {

    private static final int MAX_FILES_PER_POST = 4;

    private final FileStorageService fileStorageService;
    private final PostService postService;

    public PostResponse createPost(CreatePostMediaRequest request) throws IOException {
        List<MultipartFile> files = request.getFiles() == null ? List.of()
                : request.getFiles().stream().filter(file -> file != null && !file.isEmpty()).toList();
        String content = request.getContent() == null ? null : request.getContent().trim();
        if ((content == null || content.isBlank()) && files.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Bài viết phải có nội dung hoặc ít nhất một tệp media");
        }
        if (files.size() > MAX_FILES_PER_POST) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Mỗi bài viết được đính kèm tối đa " + MAX_FILES_PER_POST + " tệp");
        }

        postService.validatePostMediaContent(content);

        List<PostMedia.MediaType> mediaTypes = new ArrayList<>(files.size());
        for (MultipartFile file : files) {
            mediaTypes.add(fileStorageService.validatePostMediaFile(file));
        }
        if (mediaTypes.stream().filter(type -> type == PostMedia.MediaType.VIDEO).count() > 1) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Mỗi bài viết chỉ được đính kèm tối đa một video");
        }

        List<UploadedPostMedia> uploadedMedia = new ArrayList<>(files.size());
        for (int index = 0; index < files.size(); index++) {
            PostMedia.MediaType type = mediaTypes.get(index);
            String url = type == PostMedia.MediaType.VIDEO
                    ? fileStorageService.uploadVideoFile(files.get(index), "posts")
                    : fileStorageService.uploadFile(files.get(index), "posts");
            uploadedMedia.add(new UploadedPostMedia(url, type));
        }

        CreatePostRequest postRequest = new CreatePostRequest();
        postRequest.setContent(content);
        postRequest.setFeeling(request.getFeeling());
        postRequest.setVisibility(request.getVisibility());
        return postService.createPostWithMedia(postRequest, uploadedMedia);
    }
}
