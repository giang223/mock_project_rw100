package com.minisocial.dto.request;

import com.minisocial.entity.Post;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreatePostMediaRequest {

    @Size(max = 5000, message = "Nội dung tối đa 5000 ký tự")
    private String content;

    @Size(max = 80, message = "Cảm xúc tối đa 80 ký tự")
    private String feeling;

    private Post.Visibility visibility = Post.Visibility.PUBLIC;

    @Size(max = 4, message = "Mỗi bài viết được đính kèm tối đa 4 tệp")
    private List<MultipartFile> files = new ArrayList<>();
}
