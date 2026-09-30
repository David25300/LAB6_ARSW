package co.edu.eci.blueprints.persistence;

import co.edu.eci.blueprints.model.Point;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InMemoryBlueprintPersistenceTest {

    private final InMemoryBlueprintPersistence persistence = new InMemoryBlueprintPersistence();

    @Test
    void updateReplacesAllPoints() throws Exception {
        persistence.updateBlueprint("john", "house", List.of(new Point(7, 7)));

        assertEquals(List.of(new Point(7, 7)), persistence.getBlueprint("john", "house").getPoints());
    }

    @Test
    void deleteRemovesTheBlueprint() throws Exception {
        persistence.deleteBlueprint("john", "house");

        assertThrows(BlueprintNotFoundException.class, () -> persistence.getBlueprint("john", "house"));
    }

    @Test
    void updateAndDeleteFailWhenTheBlueprintDoesNotExist() {
        List<Point> points = List.of();

        assertThrows(BlueprintNotFoundException.class, () -> persistence.updateBlueprint("nobody", "x", points));
        assertThrows(BlueprintNotFoundException.class, () -> persistence.deleteBlueprint("nobody", "x"));
    }
}
