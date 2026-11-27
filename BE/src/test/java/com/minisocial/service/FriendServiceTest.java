package com.minisocial.service;

import com.minisocial.dto.response.UserSearchResponse;
import com.minisocial.repository.FriendshipRepository;
import com.minisocial.repository.UserBlockRepository;
import com.minisocial.repository.UserRepository;
import com.minisocial.util.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FriendServiceTest {

    @Mock private FriendshipRepository friendshipRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserBlockRepository userBlockRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private NotificationService notificationService;

    @InjectMocks private FriendService friendService;

    @Test
    void suggestionsExposeMutualFriendRankingFromThePagedQuery() {
        UserRepository.FriendSuggestionProjection suggestion =
                org.mockito.Mockito.mock(UserRepository.FriendSuggestionProjection.class);
        when(suggestion.getId()).thenReturn(30L);
        when(suggestion.getFullName()).thenReturn("Suggested User");
        when(suggestion.getUsername()).thenReturn("suggested");
        when(suggestion.getAvatarUrl()).thenReturn("https://example.test/avatar.png");
        when(suggestion.getBio()).thenReturn("bio");
        when(suggestion.getMutualFriendCount()).thenReturn(4L);
        when(securityUtils.getCurrentUserId()).thenReturn(10L);
        when(userRepository.findFriendSuggestions(eq(10L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(suggestion), PageRequest.of(0, 20), 1));

        var page = friendService.getFriendSuggestions(PageRequest.of(0, 20));
        UserSearchResponse response = page.getContent().getFirst();

        assertEquals(30L, response.getId());
        assertEquals("suggested", response.getUsername());
        assertEquals(4L, response.getMutualFriendCount());
        assertEquals("none", response.getFriendshipStatus());
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).findFriendSuggestions(eq(10L), pageable.capture());
        assertTrue(pageable.getValue().getSort().isUnsorted());
        verify(friendshipRepository, never()).countMutualFriends(10L, 30L);
    }
}
