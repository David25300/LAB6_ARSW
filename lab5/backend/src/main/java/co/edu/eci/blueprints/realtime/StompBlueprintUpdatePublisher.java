package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.services.BlueprintUpdatePublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class StompBlueprintUpdatePublisher implements BlueprintUpdatePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public StompBlueprintUpdatePublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void publish(Blueprint blueprint) {
        String topic = RealtimeDestinations.blueprintTopic(blueprint.getAuthor(), blueprint.getName());
        messagingTemplate.convertAndSend(topic, BlueprintUpdate.from(blueprint));
    }
}
