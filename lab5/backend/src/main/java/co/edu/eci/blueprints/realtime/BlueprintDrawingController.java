package co.edu.eci.blueprints.realtime;

import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import co.edu.eci.blueprints.services.CollaborativeDrawingService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class BlueprintDrawingController {

    static final String INVALID_EVENT_MESSAGE = "Invalid draw event";
    private static final Logger log = LoggerFactory.getLogger(BlueprintDrawingController.class);

    private final CollaborativeDrawingService drawingService;

    public BlueprintDrawingController(CollaborativeDrawingService drawingService) {
        this.drawingService = drawingService;
    }

    @MessageMapping(RealtimeDestinations.DRAW)
    public void draw(@Valid @Payload DrawEvent event, Principal user) throws BlueprintNotFoundException {
        drawingService.draw(event.author(), event.name(), event.point());
        log.debug("{} drew {} on {}/{}", user.getName(), event.point(), event.author(), event.name());
    }

    @MessageExceptionHandler(BlueprintNotFoundException.class)
    @SendToUser(destinations = RealtimeDestinations.ERRORS, broadcast = false)
    public RealtimeError handleMissingBlueprint(BlueprintNotFoundException exception) {
        log.warn("Rejected draw event: {}", exception.getMessage());
        return new RealtimeError(exception.getMessage());
    }

    @MessageExceptionHandler({MethodArgumentNotValidException.class, MessageConversionException.class})
    @SendToUser(destinations = RealtimeDestinations.ERRORS, broadcast = false)
    public RealtimeError handleInvalidEvent(Exception exception) {
        log.warn("Rejected malformed draw event: {}", exception.getMessage());
        return new RealtimeError(INVALID_EVENT_MESSAGE);
    }
}
