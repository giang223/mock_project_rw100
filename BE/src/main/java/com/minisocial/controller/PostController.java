package com.minisocial.controller;

import com.minisocial.dto.request.CreatePostRequest;
import com.minisocial.dto.request.CreatePostMediaRequest;
import com.minisocial.dto.request.ReportPostRequest;
import com.minisocial.dto.request.SetPostReactionRequest;
import com.minisocial.dto.request.UpdatePostRequest;
import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.PostResponse;
import com.minisocial.dto.response.UserSummaryResponse;
import com.minisocial.service.PostService;
import com.minisocial.service.PostMediaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final PostMediaService postMediaService;

    @GetMapping({"/feed", ""})
    public ApiResponse<Page<PostResponse>> getFeed(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(postService.getFeed(pageable));
    }

    @GetMapping("/saved")
    public ApiResponse<Page<PostResponse>> getSavedPosts(@PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(postService.getSavedPosts(pageable));
    }

    @GetMapping("/hashtags/{hashtag}")
    public ApiResponse<Page<PostResponse>> getPostsByHashtag(@PathVariable String hashtag,
                                                              @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(postService.getPostsByHashtag(hashtag, pageable));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> createPost(@Valid @RequestBody CreatePostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bài viết thành công", postService.createPost(request)));
    }

    @PostMapping(value = "/media", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PostResponse>> createPostWithMedia(
            @Valid @ModelAttribute CreatePostMediaRequest request) throws java.io.IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bài viết thành công", postMediaService.createPost(request)));
    }

    @PutMapping("/{postId}")
    public ApiResponse<PostResponse> updatePost(@PathVariable Long postId,
                                                @Valid @RequestBody UpdatePostRequest request) {
        return ApiResponse.success("Cập nhật bài viết thành công",
                postService.updatePost(postId, request.getContent(), request.getVisibility(), request.getFeeling()));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable Long postId) {
        postService.deletePost(postId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{postId}/like")
    public ApiResponse<Map<String, Boolean>> toggleLike(@PathVariable Long postId) {
        return ApiResponse.success(Map.of("liked", postService.toggleLike(postId)));
    }

    @PutMapping("/{postId}/like")
    public ApiResponse<Map<String, Boolean>> likePost(@PathVariable Long postId) {
        return ApiResponse.success(Map.of("liked", postService.setLike(postId, true)));
    }

    @DeleteMapping("/{postId}/like")
    public ApiResponse<Map<String, Boolean>> unlikePost(@PathVariable Long postId) {
        return ApiResponse.success(Map.of("liked", postService.setLike(postId, false)));
    }

    @PutMapping("/{postId}/reaction")
    public ApiResponse<PostResponse> setPostReaction(@PathVariable Long postId,
                                                     @Valid @RequestBody SetPostReactionRequest request) {
        return ApiResponse.success("Đã cập nhật cảm xúc", postService.setReaction(postId, request.getReactionType()));
    }

    @DeleteMapping("/{postId}/reaction")
    public ApiResponse<PostResponse> removePostReaction(@PathVariable Long postId) {
        return ApiResponse.success("Đã gỡ cảm xúc", postService.removeReaction(postId));
    }

    @GetMapping("/{postId}/likes")
    public ApiResponse<Page<UserSummaryResponse>> getPostLikes(
            @PathVariable Long postId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(postService.getPostLikes(postId, pageable));
    }

    @PostMapping("/{postId}/save")
    public ApiResponse<Map<String, Boolean>> toggleSave(@PathVariable Long postId) {
        return ApiResponse.success(Map.of("saved", postService.toggleSave(postId)));
    }

    @PostMapping("/{postId}/share")
    public ResponseEntity<ApiResponse<PostResponse>> sharePost(@PathVariable Long postId,
                                                               @Valid @RequestBody(required = false) CreatePostRequest request) {
        CreatePostRequest share = request == null ? new CreatePostRequest() : request;
        share.setSharedFromPostId(postId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Chia sẻ bài viết thành công", postService.createPost(share)));
    }

    @PostMapping("/{postId}/report")
    public ApiResponse<Void> reportPost(@PathVariable Long postId,
                                        @Valid @RequestBody ReportPostRequest request) {
        postService.reportPost(postId, request);
        return ApiResponse.success("Đã gửi báo cáo");
    }
}
