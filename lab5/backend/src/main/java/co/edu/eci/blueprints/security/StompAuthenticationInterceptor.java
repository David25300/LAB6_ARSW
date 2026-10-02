package co.edu.eci.blueprints.security;

import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

@Component
public class StompAuthenticationInterceptor implements ChannelInterceptor {

    static final String READ_AUTHORITY = "SCOPE_blueprints.read";
    static final String WRITE_AUTHORITY = "SCOPE_blueprints.write";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtDecoder jwtDecoder;
    private final JwtAuthenticationConverter authenticationConverter = new JwtAuthenticationConverter();

    public StompAuthenticationInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            accessor.setUser(authenticate(accessor));
        } else if (command == StompCommand.SUBSCRIBE) {
            requireAuthority(accessor, READ_AUTHORITY);
        } else if (command == StompCommand.SEND) {
            requireAuthority(accessor, WRITE_AUTHORITY);
        }
        return message;
    }

    private Authentication authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            throw new BadCredentialsException("Missing bearer token");
        }
        try {
            return authenticationConverter.convert(jwtDecoder.decode(header.substring(BEARER_PREFIX.length())));
        } catch (JwtException e) {
            throw new BadCredentialsException("Invalid bearer token", e);
        }
    }

    private static void requireAuthority(StompHeaderAccessor accessor, String authority) {
        if (!(accessor.getUser() instanceof Authentication authentication) || !hasAuthority(authentication, authority)) {
            throw new AccessDeniedException("Missing authority " + authority);
        }
    }

    private static boolean hasAuthority(Authentication authentication, String authority) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority::equals);
    }
}
