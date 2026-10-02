package co.edu.eci.blueprints.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "blueprints.cors")
public record CorsProperties(List<String> allowedOriginPatterns) {

    public CorsProperties {
        allowedOriginPatterns = allowedOriginPatterns == null ? List.of() : List.copyOf(allowedOriginPatterns);
    }

    public String[] allowedOriginPatternsArray() {
        return allowedOriginPatterns.toArray(String[]::new);
    }
}
