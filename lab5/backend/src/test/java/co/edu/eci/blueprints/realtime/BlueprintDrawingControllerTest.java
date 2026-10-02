package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import co.edu.eci.blueprints.services.CollaborativeDrawingService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.converter.MessageConversionException;

import java.security.Principal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class BlueprintDrawingControllerTest {

    private final CollaborativeDrawingService drawingService = mock(CollaborativeDrawingService.class);
    private final BlueprintDrawingController controller = new BlueprintDrawingController(drawingService);
    private final Principal student = () -> "student";

    @Test
    void drawDelegatesToTheDrawingService() throws Exception {
        controller.draw(new DrawEvent("john", "house", new Point(3, 4)), student);

        verify(drawingService).draw("john", "house", new Point(3, 4));
    }

    @Test
    void missingBlueprintIsReportedToTheSender() {
        RealtimeError error = controller.handleMissingBlueprint(
                new BlueprintNotFoundException("Blueprint not found: john/ghost"));

        assertThat(error.message()).isEqualTo("Blueprint not found: john/ghost");
    }

    @Test
    void malformedEventsGetAGenericError() {
        RealtimeError error = controller.handleInvalidEvent(new MessageConversionException("bad json"));

        assertThat(error.message()).isEqualTo(BlueprintDrawingController.INVALID_EVENT_MESSAGE);
    }
}
