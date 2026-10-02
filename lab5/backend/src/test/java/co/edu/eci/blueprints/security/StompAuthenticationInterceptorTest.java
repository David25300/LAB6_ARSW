package co.edu.eci.blueprints.security;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StompAuthenticationInterceptorTest {

    private final JwtDecoder jwtDecoder = mock(JwtDecoder.class);
    private final MessageChannel channel = mock(MessageChannel.class);
    private final StompAuthenticationInterceptor interceptor = new StompAuthenticationInterceptor(jwtDecoder);

    @Test
    void connectWithValidTokenAuthenticatesTheSession() {
        when(jwtDecoder.decode("valid-token")).thenReturn(jwt("blueprints.read blueprints.write"));
        StompHeaderAccessor accessor = accessor(StompCommand.CONNECT, null);
        accessor.setNativeHeader("Authorization", "Bearer valid-token");

        interceptor.preSend(messageOf(accessor), channel);

        assertThat(accessor.getUser()).isInstanceOf(Authentication.class);
        Authentication user = (Authentication) accessor.getUser();
        assertThat(user.getName()).isEqualTo("student");
        assertThat(user.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .contains(StompAuthenticationInterceptor.READ_AUTHORITY, StompAuthenticationInterceptor.WRITE_AUTHORITY);
    }

    @Test
    void connectWithoutTokenIsRejected() {
        Message<byte[]> message = messageOf(accessor(StompCommand.CONNECT, null));

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void connectWithInvalidTokenIsRejected() {
        when(jwtDecoder.decode("expired")).thenThrow(new BadJwtException("expired"));
        StompHeaderAccessor accessor = accessor(StompCommand.CONNECT, null);
        accessor.setNativeHeader("Authorization", "Bearer expired");
        Message<byte[]> message = messageOf(accessor);

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void sendRequiresWriteScope() {
        Message<byte[]> readOnly = messageOf(accessor(StompCommand.SEND, authenticated("blueprints.read")));
        Message<byte[]> readWrite = messageOf(accessor(StompCommand.SEND, authenticated("blueprints.read blueprints.write")));

        assertThatThrownBy(() -> interceptor.preSend(readOnly, channel)).isInstanceOf(AccessDeniedException.class);
        assertThatCode(() -> interceptor.preSend(readWrite, channel)).doesNotThrowAnyException();
    }

    @Test
    void subscribeRequiresAnAuthenticatedSession() {
        Message<byte[]> anonymous = messageOf(accessor(StompCommand.SUBSCRIBE, null));
        Message<byte[]> reader = messageOf(accessor(StompCommand.SUBSCRIBE, authenticated("blueprints.read")));

        assertThatThrownBy(() -> interceptor.preSend(anonymous, channel)).isInstanceOf(AccessDeniedException.class);
        assertThatCode(() -> interceptor.preSend(reader, channel)).doesNotThrowAnyException();
    }

    @Test
    void disconnectNeedsNoAuthentication() {
        Message<byte[]> message = messageOf(accessor(StompCommand.DISCONNECT, null));

        assertThatCode(() -> interceptor.preSend(message, channel)).doesNotThrowAnyException();
    }

    private static StompHeaderAccessor accessor(StompCommand command, Principal user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setUser(user);
        accessor.setLeaveMutable(true);
        return accessor;
    }

    private static Message<byte[]> messageOf(StompHeaderAccessor accessor) {
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static Authentication authenticated(String scopes) {
        List<GrantedAuthority> authorities = Arrays.stream(scopes.split(" "))
                .<GrantedAuthority>map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope))
                .toList();
        return new JwtAuthenticationToken(jwt(scopes), authorities);
    }

    private static Jwt jwt(String scopes) {
        return Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject("student")
                .claim("scope", scopes)
                .build();
    }
}
