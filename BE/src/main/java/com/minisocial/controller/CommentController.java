package com.minisocial.controller;

import com.minisocial.dto.request.CreateCommentRequest;
import com.minisocial.dto.request.UpdateCommentRequest;
import com.minisocial.dto.request.ReportPostRequest;
import com.minisocial.dto.response.ApiResponse;
import com.minisocial.dto.response.CommentResponse;
import com.minisocial.service.CommentService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public ApiResponse<Page<CommentResponse>> getComments(@PathVariable Long postId,
                                                          @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(commentService.getComments(postId, pageable));
    }

    @GetMapping("/{commentId}/replies")
    public ApiResponse<Page<CommentResponse>> getReplies(@PathVariable Long postId,
                                                         @PathVariable Long commentId,
                                                         @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(commentService.getReplies(postId, commentId, pageable));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(@PathVariable Long postId,
                                                                   @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã thêm bình luận", commentService.addComment(postId, request)));
    }

    @PutMapping("/{commentId}")
    public ApiResponse<CommentResponse> updateComment(@PathVariable Long postId,
                                                      @PathVariable Long commentId,
                                                      @Valid @RequestBody UpdateCommentRequest request) {
        return ApiResponse.success("Đã cập nhật bình luận",
                commentService.updateComment(postId, commentId, request.getContent()));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long postId, @PathVariable Long commentId) {
        commentService.deleteComment(postId, commentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{commentId}/report")
    public ResponseEntity<ApiResponse<Void>> reportComment(@PathVariable Long postId,
                                                           @PathVariable Long commentId,
                                                           @Valid @RequestBody ReportPostRequest request) {
        commentService.reportComment(postId, commentId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã gửi báo cáo bình luận"));
    }
}
