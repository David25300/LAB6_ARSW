package co.edu.eci.blueprints.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.AbstractSubProtocolEvent;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.security.Principal;
import java.util.Optional;

@Component
public class StompSessionEventLogger {

    private static final Logger log = LoggerFactory.getLogger(StompSessionEventLogger.class);
    private static final String ANONYMOUS = "anonymous";

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        log.info("STOMP session {} connected as {}", sessionId(event), userName(event));
    }

    @EventListener
    public void onSubscribed(SessionSubscribeEvent event) {
        String destination = SimpMessageHeaderAccessor.getDestination(event.getMessage().getHeaders());
        log.info("STOMP session {} ({}) subscribed to {}", sessionId(event), userName(event), destination);
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        log.info("STOMP session {} ({}) disconnected: {}", event.getSessionId(), userName(event), event.getCloseStatus());
    }

    private static String sessionId(AbstractSubProtocolEvent event) {
        return SimpMessageHeaderAccessor.getSessionId(event.getMessage().getHeaders());
    }

    private static String userName(AbstractSubProtocolEvent event) {
        return Optional.ofNullable(event.getUser()).map(Principal::getName).orElse(ANONYMOUS);
    }
}
