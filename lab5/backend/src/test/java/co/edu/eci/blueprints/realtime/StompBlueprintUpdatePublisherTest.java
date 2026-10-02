package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class StompBlueprintUpdatePublisherTest {

    private final SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
    private final StompBlueprintUpdatePublisher publisher = new StompBlueprintUpdatePublisher(template);

    @Test
    void publishesTheBlueprintOnItsOwnTopic() {
        List<Point> points = List.of(new Point(1, 2), new Point(3, 4));

        publisher.publish(new Blueprint("john", "house", points));

        verify(template).convertAndSend("/topic/blueprints.john.house", new BlueprintUpdate("john", "house", points));
    }
}
