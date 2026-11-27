package com.minisocial.config;

import com.minisocial.repository.RefreshTokenRepository;
import com.minisocial.security.JwtTokenProvider;
import com.minisocial.security.UserDetailsServiceImpl;
import com.minisocial.security.StompUserPrincipal;
import com.minisocial.service.DirectMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class StompAuthenticationInterceptor implements ChannelInterceptor {

    private static final Pattern CONVERSATION_QUEUE = Pattern.compile("^/user/queue/conversations/(\\d+)$");
    private static final Pattern CONVERSATION_TYPING_QUEUE = Pattern.compile("^/user/queue/conversations/(\\d+)/typing$");
    private static final Pattern CONVERSATION_READ_QUEUE = Pattern.compile("^/user/queue/conversations/(\\d+)/read$");
    private static final Pattern SEND_REALTIME_DESTINATION = Pattern.compile("^/app/conversations/(\\d+)/(messages|typing)$");

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsServiceImpl userDetailsService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final DirectMessageService directMessageService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        if (accessor.getCommand() == StompCommand.CONNECT) {
            authenticate(accessor);
        } else if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            Long conversationId = requireAllowedConversationDestinationId(accessor.getDestination(),
                    CONVERSATION_QUEUE, CONVERSATION_TYPING_QUEUE, CONVERSATION_READ_QUEUE);
            directMessageService.assertCanAccessConversation(conversationId, requirePrincipal(accessor));
        } else if (accessor.getCommand() == StompCommand.SEND) {
            Long conversationId = requireDestinationId(accessor.getDestination(), SEND_REALTIME_DESTINATION);
            directMessageService.assertCanAccessConversation(conversationId, requirePrincipal(accessor));
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Authentication required");
        }
        String token = header.substring(7).trim();
        try {
            if (!jwtTokenProvider.validateAccessToken(token)) {
                throw new MessageDeliveryException("Invalid access token");
            }
            String email = jwtTokenProvider.extractUsername(token);
            String sessionId = jwtTokenProvider.extractSessionId(token);
            UserDetails user = userDetailsService.loadUserByUsername(email);
            if (!user.isEnabled() || !user.isAccountNonLocked() || !StringUtils.hasText(sessionId)
                    || !jwtTokenProvider.isTokenValid(token, user)
                    || !refreshTokenRepository.existsActiveSession(sessionId, email, LocalDateTime.now())) {
                throw new MessageDeliveryException("Session is no longer active");
            }
            accessor.setUser(new StompUserPrincipal(email, sessionId));
        } catch (UsernameNotFoundException exception) {
            throw new MessageDeliveryException("Session is no longer active");
        }
    }

    private StompUserPrincipal requirePrincipal(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        if (!(user instanceof StompUserPrincipal stompUser) || !StringUtils.hasText(stompUser.getName())) {
            throw new MessageDeliveryException("Authentication required");
        }
        return stompUser;
    }

    private Long requireDestinationId(String destination, Pattern allowedPattern) {
        Matcher matcher = destination == null ? null : allowedPattern.matcher(destination);
        if (matcher == null || !matcher.matches()) {
            throw new MessageDeliveryException("Destination is not allowed");
        }
        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException exception) {
            throw new MessageDeliveryException("Invalid destination");
        }
    }

    private Long requireAllowedConversationDestinationId(String destination, Pattern... allowedPatterns) {
        for (Pattern allowedPattern : allowedPatterns) {
            Matcher matcher = destination == null ? null : allowedPattern.matcher(destination);
            if (matcher != null && matcher.matches()) {
                try {
                    return Long.parseLong(matcher.group(1));
                } catch (NumberFormatException exception) {
                    throw new MessageDeliveryException("Invalid destination");
                }
            }
        }
        throw new MessageDeliveryException("Destination is not allowed");
    }
}
