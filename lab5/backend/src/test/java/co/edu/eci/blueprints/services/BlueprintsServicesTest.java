package co.edu.eci.blueprints.services;

import co.edu.eci.blueprints.filters.IdentityFilter;
import co.edu.eci.blueprints.model.Blueprint;
import co.edu.eci.blueprints.model.Point;
import co.edu.eci.blueprints.persistence.BlueprintNotFoundException;
import co.edu.eci.blueprints.persistence.InMemoryBlueprintPersistence;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlueprintsServicesTest {

    private final InMemoryBlueprintPersistence persistence = new InMemoryBlueprintPersistence();
    private final BlueprintsServices services = new BlueprintsServices(persistence, new IdentityFilter());

    @Test
    void addPointAndGetReturnsTheBlueprintWithTheNewPointLast() throws Exception {
        Blueprint updated = services.addPointAndGet("john", "garage", new Point(20, 20));

        assertThat(updated.getPoints())
                .containsExactly(new Point(5, 5), new Point(15, 5), new Point(15, 15), new Point(20, 20));
        assertThat(persistence.getBlueprint("john", "garage").getPoints()).endsWith(new Point(20, 20));
    }

    @Test
    void addPointAndGetOnMissingBlueprintFails() {
        assertThatThrownBy(() -> services.addPointAndGet("john", "ghost", new Point(1, 1)))
                .isInstanceOf(BlueprintNotFoundException.class);
    }
}
