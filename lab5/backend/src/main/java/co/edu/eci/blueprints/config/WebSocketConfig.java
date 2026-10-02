package co.edu.eci.blueprints.config;

import co.edu.eci.blueprints.security.CorsProperties;
import co.edu.eci.blueprints.security.StompAuthenticationInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    public static final String ENDPOINT = "/ws-blueprints";
    private static final String APPLICATION_PREFIX = "/app";
    private static final String TOPIC_PREFIX = "/topic";
    private static final String QUEUE_PREFIX = "/queue";

    private final StompAuthenticationInterceptor authenticationInterceptor;
    private final CorsProperties corsProperties;

    public WebSocketConfig(StompAuthenticationInterceptor authenticationInterceptor, CorsProperties corsProperties) {
        this.authenticationInterceptor = authenticationInterceptor;
        this.corsProperties = corsProperties;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(ENDPOINT).setAllowedOriginPatterns(corsProperties.allowedOriginPatternsArray());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes(APPLICATION_PREFIX);
        registry.enableSimpleBroker(TOPIC_PREFIX, QUEUE_PREFIX);
        registry.setPreservePublishOrder(true);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authenticationInterceptor);
    }
}
