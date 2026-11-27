package com.minisocial.repository;

import com.minisocial.entity.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostMediaRepository extends JpaRepository<PostMedia, Long> {

    List<PostMedia> findByPostIdOrderByPositionAscIdAsc(Long postId);

    boolean existsByPostId(Long postId);
}
