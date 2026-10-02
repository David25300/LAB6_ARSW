package co.edu.eci.blueprints.services;

import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CollaborativeDrawingServiceTest {

    private final BlueprintsServices blueprints = mock(BlueprintsServices.class);
    private final BlueprintUpdatePublisher publisher = mock(BlueprintUpdatePublisher.class);
    private final CollaborativeDrawingService service = new CollaborativeDrawingService(blueprints, publisher);

    @Test
    void drawPersistsThePointAndPublishesTheWholeBlueprint() throws Exception {
        Blueprint updated = new Blueprint("john", "house", List.of(new Point(0, 0), new Point(5, 5)));
        when(blueprints.addPointAndGet("john", "house", new Point(5, 5))).thenReturn(updated);

        Blueprint result = service.draw("john", "house", new Point(5, 5));

        assertThat(result).isSameAs(updated);
        verify(publisher).publish(updated);
    }

    @Test
    void drawOnMissingBlueprintPublishesNothing() throws Exception {
        when(blueprints.addPointAndGet("john", "ghost", new Point(1, 1)))
                .thenThrow(new BlueprintNotFoundException("Blueprint not found: john/ghost"));

        assertThatThrownBy(() -> service.draw("john", "ghost", new Point(1, 1)))
                .isInstanceOf(BlueprintNotFoundException.class);
        verifyNoInteractions(publisher);
    }
}
